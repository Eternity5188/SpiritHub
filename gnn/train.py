"""
灵创平台 · GNN 训练 & 推荐预计算
===================================
模型：
  · 好友推荐  — GraphSAGE（用户社交图上的 link prediction）
  · 帖子推荐  — LightGCN（用户-帖子二部图上的 BPR loss）

产物：
  · 将 top-10 好友推荐 / top-10 帖子推荐 写入 SQLite 的
    friend_recommendations 和 post_recommendations 表
  · 模型权重保存到 gnn/weights/ 以备复查

腾讯云部署说明：
  · 服务器端无需运行此脚本（无 GPU 也不必）
  · 只需上传 SQLite DB（其中已含推荐结果），Node.js 做 SELECT 查询即可
  · 若需更新推荐，在本地重新运行此脚本后上传 DB 即可
"""

import sqlite3, json, math, random, os, time, shutil
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv, LGConv
from torch_geometric.data import Data

# ─── 路径 ─────────────────────────────────────────────────────────────────────

ROOT = Path(__file__).parent.parent
REAL_DB   = ROOT / "data" / "lingjing.db"
TRAIN_DB  = Path(__file__).parent / "train_temp.db"   # 含合成数据的临时库
WEIGHT_DIR = Path(__file__).parent / "weights"
WEIGHT_DIR.mkdir(exist_ok=True)

DEVICE = torch.device("cpu")   # 训练也用 CPU，保证权重文件和云端一致
EMBED_DIM = 64

# ─── 数据库工具 ───────────────────────────────────────────────────────────────

def get_conn(real=False):
    path = REAL_DB if real else TRAIN_DB
    conn = sqlite3.connect(str(path))
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

# ─── 数据加载 ─────────────────────────────────────────────────────────────────

def load_graph_data():
    conn = get_conn()   # 从临时训练库读取（含合成数据）
    cur  = conn.cursor()

    # 用户
    cur.execute("""
        SELECT id, lingjing_points,
               CAST(julianday('now') - julianday(created_at) AS INTEGER) as days
        FROM users ORDER BY id
    """)
    rows = cur.fetchall()
    uid_to_idx = {r[0]: i for i, r in enumerate(rows)}
    n_users = len(rows)

    # 用户节点特征：[归一化积分, 归一化天数]
    feat_arr = np.array([[r[1], r[2]] for r in rows], dtype=np.float32)
    feat_arr[:, 0] = np.log1p(feat_arr[:, 0]) / math.log(10001)
    feat_arr[:, 1] = np.clip(feat_arr[:, 1], 0, 730) / 730.0
    user_feat = torch.tensor(feat_arr, dtype=torch.float)
    user_ids  = [r[0] for r in rows]

    # 好友边（无向）
    cur.execute("SELECT requester_id, addressee_id FROM friendships WHERE status='accepted'")
    edges_raw = [(uid_to_idx[a], uid_to_idx[b])
                 for a, b in cur.fetchall()
                 if a in uid_to_idx and b in uid_to_idx]
    if edges_raw:
        src, dst = zip(*edges_raw)
        friend_edge_index = torch.tensor([list(src), list(dst)], dtype=torch.long)
    else:
        friend_edge_index = torch.zeros((2, 0), dtype=torch.long)

    # 帖子
    cur.execute("SELECT id FROM posts ORDER BY id")
    post_rows = cur.fetchall()
    pid_to_idx = {r[0]: i for i, r in enumerate(post_rows)}
    n_posts = len(post_rows)
    post_ids = [r[0] for r in post_rows]

    # 用户-帖子交互（点赞权重=2，评论权重=3）
    cur.execute("SELECT user_id, post_id FROM post_likes")
    like_edges = [(uid_to_idx[a], pid_to_idx[b])
                  for a, b in cur.fetchall()
                  if a in uid_to_idx and b in pid_to_idx]

    cur.execute("SELECT user_id, post_id FROM comments")
    comment_edges = [(uid_to_idx[a], pid_to_idx[b])
                     for a, b in cur.fetchall()
                     if a in uid_to_idx and b in pid_to_idx]

    conn.close()
    return {
        "n_users": n_users,
        "n_posts": n_posts,
        "user_feat": user_feat,
        "user_ids": user_ids,
        "post_ids": post_ids,
        "uid_to_idx": uid_to_idx,
        "pid_to_idx": pid_to_idx,
        "friend_edge_index": friend_edge_index,
        "like_edges": like_edges,
        "comment_edges": comment_edges,
    }

# ══════════════════════════════════════════════════════════════════════════════
# Part 1 · GraphSAGE 好友推荐
# ══════════════════════════════════════════════════════════════════════════════

class FriendSAGE(nn.Module):
    """2-layer GraphSAGE → 64-dim user embedding"""
    def __init__(self, in_dim: int, hidden: int = 128, out_dim: int = EMBED_DIM):
        super().__init__()
        self.conv1 = SAGEConv(in_dim, hidden)
        self.conv2 = SAGEConv(hidden, out_dim)

    def forward(self, x, edge_index):
        x = F.relu(self.conv1(x, edge_index))
        x = F.dropout(x, p=0.3, training=self.training)
        x = self.conv2(x, edge_index)
        return F.normalize(x, dim=-1)   # L2 归一化 → cosine sim = dot product


def neg_sample(n_users: int, pos_pairs: list[tuple], n_neg: int):
    """随机负采样，不与正样本重合"""
    pos_set = set(pos_pairs)
    neg = []
    while len(neg) < n_neg:
        a = random.randint(0, n_users - 1)
        b = random.randint(0, n_users - 1)
        if a != b and (a, b) not in pos_set:
            neg.append((a, b))
    return neg


def train_friend_gnn(data: dict, epochs: int = 40) -> np.ndarray:
    n = data["n_users"]
    feat = data["user_feat"].to(DEVICE)
    ei   = data["friend_edge_index"].to(DEVICE)

    # 正样本列表（去重单向）
    if ei.shape[1] > 0:
        pairs = list(set(zip(ei[0].tolist(), ei[1].tolist())))
        pairs = [(a, b) for a, b in pairs if a < b]
    else:
        # 无边时用随机正样本占位（冷启动）
        pairs = [(random.randint(0, n-1), random.randint(0, n-1)) for _ in range(100)]

    model = FriendSAGE(in_dim=feat.shape[1]).to(DEVICE)
    _sage_weights = WEIGHT_DIR / "friend_sage.pt"
    if _sage_weights.exists():
        try:
            model.load_state_dict(torch.load(str(_sage_weights), map_location=DEVICE))
            print("[SAGE] 检测到旧权重，热启动（在上次结果基础上继续训练）")
        except Exception:
            print("[SAGE] 旧权重不兼容，从零开始训练")
    opt   = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-5)

    print(f"[SAGE] 开始训练 | 用户数={n} | 好友边={ei.shape[1]} | epochs={epochs}")
    t0 = time.time()

    for epoch in range(1, epochs + 1):
        model.train()
        emb = model(feat, ei)

        # 正样本对 → 余弦相似度 → 目标接近 1
        n_batch = min(512, len(pairs))
        pos_sample = random.sample(pairs, n_batch)
        neg_sample_ = neg_sample(n, pos_sample, n_batch)

        pos_src = torch.tensor([p[0] for p in pos_sample], dtype=torch.long)
        pos_dst = torch.tensor([p[1] for p in pos_sample], dtype=torch.long)
        neg_src = torch.tensor([p[0] for p in neg_sample_], dtype=torch.long)
        neg_dst = torch.tensor([p[1] for p in neg_sample_], dtype=torch.long)

        pos_score = (emb[pos_src] * emb[pos_dst]).sum(dim=1)
        neg_score = (emb[neg_src] * emb[neg_dst]).sum(dim=1)

        # BPR-style loss
        loss = -F.logsigmoid(pos_score - neg_score).mean()

        opt.zero_grad()
        loss.backward()
        opt.step()

        if epoch % 10 == 0:
            print(f"  epoch {epoch:3d}/{epochs}  loss={loss.item():.4f}  "
                  f"[{time.time()-t0:.1f}s]")

    model.eval()
    with torch.no_grad():
        embeddings = model(feat, ei).cpu().numpy()

    torch.save(model.state_dict(), WEIGHT_DIR / "friend_sage.pt")
    print(f"[SAGE] 训练完成，权重已保存。")
    return embeddings   # shape: (n_users, EMBED_DIM)


# ══════════════════════════════════════════════════════════════════════════════
# Part 2 · LightGCN 帖子推荐
# ══════════════════════════════════════════════════════════════════════════════

class LightGCNModel(nn.Module):
    """2-layer LightGCN，节点无特征，纯 embedding 表"""
    def __init__(self, n_users: int, n_items: int, dim: int = EMBED_DIM, n_layers: int = 2):
        super().__init__()
        self.n_layers = n_layers
        self.user_emb = nn.Embedding(n_users, dim)
        self.item_emb = nn.Embedding(n_items, dim)
        self.convs = nn.ModuleList([LGConv() for _ in range(n_layers)])
        nn.init.xavier_normal_(self.user_emb.weight)
        nn.init.xavier_normal_(self.item_emb.weight)

    def forward(self, edge_index, n_total):
        # 拼接 user/item embedding
        x = torch.cat([self.user_emb.weight, self.item_emb.weight], dim=0)
        embs = [x]
        for conv in self.convs:
            x = conv(x, edge_index)
            embs.append(x)
        out = torch.stack(embs, dim=1).mean(dim=1)  # layer-wise mean
        return out[:self.user_emb.num_embeddings], out[self.user_emb.num_embeddings:]


def build_bipartite_edge_index(like_edges, comment_edges, n_users, n_posts):
    """构建用户-帖子二部图的 edge_index（item 节点偏移 n_users）"""
    all_edges = []
    for (u, p) in like_edges:
        all_edges.append((u, n_users + p))
        all_edges.append((n_users + p, u))
    for (u, p) in comment_edges:
        all_edges.append((u, n_users + p))
        all_edges.append((n_users + p, u))

    if not all_edges:
        return torch.zeros((2, 0), dtype=torch.long)

    src, dst = zip(*all_edges)
    return torch.tensor([list(src), list(dst)], dtype=torch.long)


def bpr_loss(user_emb, item_emb, pos_items, neg_items):
    pos_score = (user_emb * item_emb[pos_items]).sum(dim=1)
    neg_score = (user_emb * item_emb[neg_items]).sum(dim=1)
    return -F.logsigmoid(pos_score - neg_score).mean()


def train_lightgcn(data: dict, epochs: int = 40):
    n_u = data["n_users"]
    n_p = data["n_posts"]
    like_edges    = data["like_edges"]
    comment_edges = data["comment_edges"]

    # 构建每个用户交互过的帖子集合
    user_pos: dict[int, set] = {}
    for u, p in like_edges + comment_edges:
        user_pos.setdefault(u, set()).add(p)

    ei = build_bipartite_edge_index(like_edges, comment_edges, n_u, n_p).to(DEVICE)
    n_total = n_u + n_p

    model = LightGCNModel(n_u, n_p).to(DEVICE)
    _lgcn_weights = WEIGHT_DIR / "post_lightgcn.pt"
    if _lgcn_weights.exists():
        try:
            model.load_state_dict(torch.load(str(_lgcn_weights), map_location=DEVICE))
            print("[LightGCN] 检测到旧权重，热启动（在上次结果基础上继续训练）")
        except Exception:
            print("[LightGCN] 旧权重不兼容，从零开始训练")
    opt   = torch.optim.Adam(model.parameters(), lr=5e-3, weight_decay=1e-5)

    active_users = list(user_pos.keys())
    if not active_users:
        print("[LightGCN] 无互动数据，跳过训练，使用随机 embedding")
        with torch.no_grad():
            u_emb, p_emb = model(ei, n_total)
        return u_emb.cpu().detach().numpy(), p_emb.cpu().detach().numpy()

    print(f"[LightGCN] 开始训练 | 用户={n_u} | 帖子={n_p} | "
          f"互动边={len(like_edges)+len(comment_edges)} | epochs={epochs}")
    t0 = time.time()

    for epoch in range(1, epochs + 1):
        model.train()
        u_emb, p_emb = model(ei, n_total)

        batch_size = min(512, len(active_users))
        batch_users = random.sample(active_users, batch_size)

        pos_items = []
        neg_items = []
        valid_users = []
        for u in batch_users:
            pos_set = user_pos[u]
            # 若所有帖子都已交互（如帖子数<=1），跳过该用户避免死循环
            if len(pos_set) >= n_p:
                continue
            pos_p = random.choice(list(pos_set))
            neg_p = random.randint(0, n_p - 1)
            max_tries = n_p * 3
            tries = 0
            while neg_p in pos_set and tries < max_tries:
                neg_p = random.randint(0, n_p - 1)
                tries += 1
            if tries >= max_tries:
                continue
            valid_users.append(u)
            pos_items.append(pos_p)
            neg_items.append(neg_p)

        if not valid_users:
            continue   # 帖子太少无法负采样，跳过本轮

        u_t   = torch.tensor(valid_users, dtype=torch.long)
        pos_t = torch.tensor(pos_items,   dtype=torch.long)
        neg_t = torch.tensor(neg_items,   dtype=torch.long)

        loss = bpr_loss(u_emb[u_t], p_emb, pos_t, neg_t)
        # L2 正则
        loss += 1e-5 * (
            model.user_emb.weight[u_t].norm(2).pow(2) +
            model.item_emb.weight[pos_t].norm(2).pow(2) +
            model.item_emb.weight[neg_t].norm(2).pow(2)
        ) / batch_size

        opt.zero_grad()
        loss.backward()
        opt.step()

        if epoch % 10 == 0:
            print(f"  epoch {epoch:3d}/{epochs}  loss={loss.item():.4f}  "
                  f"[{time.time()-t0:.1f}s]")

    model.eval()
    with torch.no_grad():
        u_emb, p_emb = model(ei, n_total)

    torch.save(model.state_dict(), WEIGHT_DIR / "post_lightgcn.pt")
    print("[LightGCN] 训练完成，权重已保存。")
    return u_emb.cpu().numpy(), p_emb.cpu().numpy()


# ══════════════════════════════════════════════════════════════════════════════
# Part 3 · 批量计算推荐并写入数据库
# ══════════════════════════════════════════════════════════════════════════════

TOPK_FRIENDS = 10
TOPK_POSTS   = 10
BATCH        = 256   # 每批计算多少用户（控制内存）


def compute_friend_recs(user_embs: np.ndarray, data: dict):
    """
    对每个用户，找余弦相似度最高的 TOPK 个用户（排除已是好友的）
    返回 [(user_id, rec_user_id, score), ...]
    """
    n = user_embs.shape[0]
    user_ids = data["user_ids"]

    # 构建已有好友集合
    ei = data["friend_edge_index"]
    existing: dict[int, set] = {}
    if ei.shape[1] > 0:
        for a, b in zip(ei[0].tolist(), ei[1].tolist()):
            existing.setdefault(a, set()).add(b)

    results = []
    print(f"[REC] 计算好友推荐（{n} 用户）…")
    for start in range(0, n, BATCH):
        end = min(start + BATCH, n)
        # (batch, dim) @ (dim, n) → (batch, n) 相似度矩阵
        sim = user_embs[start:end] @ user_embs.T  # 已 L2 归一化，dot = cosine
        # 屏蔽自己
        for i in range(end - start):
            sim[i, start + i] = -1.0
        # 屏蔽已有好友
        for i, uid_idx in enumerate(range(start, end)):
            for friend_idx in existing.get(uid_idx, set()):
                if friend_idx < n:
                    sim[i, friend_idx] = -1.0

        top_indices = np.argsort(-sim, axis=1)[:, :TOPK_FRIENDS]
        for i, uid_idx in enumerate(range(start, end)):
            real_uid = user_ids[uid_idx]
            for rec_idx in top_indices[i]:
                score = float(sim[i, rec_idx])
                if score <= -1.0:   # 只排除被屏蔽的（自己/好友），不过滤低相似度
                    continue
                results.append((real_uid, user_ids[rec_idx], round(score, 4)))

    return results


def compute_post_recs(user_embs: np.ndarray, post_embs: np.ndarray, data: dict):
    """
    对每个用户，找分数最高的 TOPK 篇帖子（排除已交互的）
    返回 [(user_id, post_id, score), ...]
    """
    n_u = user_embs.shape[0]
    user_ids = data["user_ids"]
    post_ids = data["post_ids"]

    # 构建已交互集合
    interacted: dict[int, set] = {}
    for u, p in data["like_edges"] + data["comment_edges"]:
        interacted.setdefault(u, set()).add(p)

    # L2 归一化
    u_norm = user_embs / (np.linalg.norm(user_embs, axis=1, keepdims=True) + 1e-8)
    p_norm = post_embs / (np.linalg.norm(post_embs, axis=1, keepdims=True) + 1e-8)

    results = []
    print(f"[REC] 计算帖子推荐（{n_u} 用户，{len(post_ids)} 帖子）…")
    for start in range(0, n_u, BATCH):
        end = min(start + BATCH, n_u)
        scores = u_norm[start:end] @ p_norm.T  # (batch, n_posts)

        # 屏蔽已交互帖子
        for i, uid_idx in enumerate(range(start, end)):
            for p_idx in interacted.get(uid_idx, set()):
                if p_idx < len(post_ids):
                    scores[i, p_idx] = -1.0

        top_indices = np.argsort(-scores, axis=1)[:, :TOPK_POSTS]
        for i, uid_idx in enumerate(range(start, end)):
            real_uid = user_ids[uid_idx]
            for rec_idx in top_indices[i]:
                score = float(scores[i, rec_idx])
                if score < 0:
                    continue
                results.append((real_uid, post_ids[rec_idx], round(score, 4)))

    return results


def write_recommendations(friend_recs, post_recs):
    # 先查出真实库里的真实用户 ID 集合
    real_conn = get_conn(real=True)
    real_cur  = real_conn.cursor()

    real_cur.execute("""
        CREATE TABLE IF NOT EXISTS friend_recommendations (
            user_id INTEGER NOT NULL,
            rec_user_id INTEGER NOT NULL,
            score REAL NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, rec_user_id)
        )
    """)
    real_cur.execute("""
        CREATE TABLE IF NOT EXISTS post_recommendations (
            user_id INTEGER NOT NULL,
            post_id INTEGER NOT NULL,
            score REAL NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, post_id)
        )
    """)

    real_cur.execute("SELECT id FROM users")
    real_user_ids = set(r[0] for r in real_cur.fetchall())
    real_cur.execute("SELECT id FROM posts")
    real_post_ids = set(r[0] for r in real_cur.fetchall())

    # 过滤：只保留 user_id 和 rec_user_id 都是真实用户的推荐
    friend_filtered = [
        (u, v, s) for u, v, s in friend_recs
        if u in real_user_ids and v in real_user_ids
    ]
    # 只保留 user_id 是真实用户且 post_id 是真实帖子的推荐
    post_filtered = [
        (u, p, s) for u, p, s in post_recs
        if u in real_user_ids and p in real_post_ids
    ]

    real_cur.execute("DELETE FROM friend_recommendations")
    real_cur.execute("DELETE FROM post_recommendations")

    real_cur.executemany(
        "INSERT OR REPLACE INTO friend_recommendations (user_id, rec_user_id, score) VALUES (?, ?, ?)",
        friend_filtered
    )
    real_cur.executemany(
        "INSERT OR REPLACE INTO post_recommendations (user_id, post_id, score) VALUES (?, ?, ?)",
        post_filtered
    )
    real_conn.commit()
    real_conn.close()
    print(f"[DB] 真实用户数={len(real_user_ids)} | 真实帖子数={len(real_post_ids)}")
    print(f"[DB] 写入好友推荐 {len(friend_filtered)} 条，帖子推荐 {len(post_filtered)} 条（均为真实用户/帖子）")


# ─── 主入口 ───────────────────────────────────────────────────────────────────

def main():
    # 每次训练前，用最新真实库覆盖 train_temp.db（不含合成数据）
    if not REAL_DB.exists():
        print(f"[错误] 找不到真实数据库: {REAL_DB}")
        return
    print(f"[INFO] 从真实库复制 → train_temp.db …")
    # 使用 SQLite backup API，正确处理 WAL 模式
    src_conn = sqlite3.connect(str(REAL_DB))
    dst_conn = sqlite3.connect(str(TRAIN_DB))
    src_conn.backup(dst_conn)
    src_conn.close()
    dst_conn.close()

    random.seed(42)
    np.random.seed(42)
    torch.manual_seed(42)

    print("=" * 60)
    print("  灵创平台 · GNN 推荐系统训练")
    print("=" * 60)

    # 1. 加载数据
    print("\n[1/4] 加载数据库数据…")
    data = load_graph_data()
    print(f"      用户 {data['n_users']} | 帖子 {data['n_posts']} | "
          f"好友边 {data['friend_edge_index'].shape[1]} | "
          f"互动边 {len(data['like_edges']) + len(data['comment_edges'])}")

    # 2. 训练 GraphSAGE（好友推荐）
    print("\n[2/4] 训练 GraphSAGE（好友推荐）…")
    friend_embs = train_friend_gnn(data, epochs=40)

    # 3. 训练 LightGCN（帖子推荐）
    print("\n[3/4] 训练 LightGCN（帖子推荐）…")
    user_post_embs, post_embs = train_lightgcn(data, epochs=40)

    # 4. 计算推荐并写库
    print("\n[4/4] 计算推荐结果并写入数据库…")
    friend_recs = compute_friend_recs(friend_embs, data)
    post_recs   = compute_post_recs(user_post_embs, post_embs, data)
    write_recommendations(friend_recs, post_recs)

    print("\n" + "=" * 60)
    print("  训练完成！推荐结果已写入数据库。")
    print("  部署到腾讯云时：上传 backend/data/lingjing.db 即可，")
    print("  服务器端无需运行任何 Python/ML 代码。")
    print("=" * 60)


if __name__ == "__main__":
    main()
