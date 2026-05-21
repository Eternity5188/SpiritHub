"""
灵创平台 · 模拟数据生成器
将真实库复制到 gnn/train_temp.db，再向其中注入合成数据。
真实生产库（backend/data/lingjing.db）始终不会被污染。
"""

import sqlite3, random, shutil, math
from pathlib import Path
from datetime import datetime, timedelta

REAL_DB  = Path(__file__).parent.parent / "backend" / "data" / "lingjing.db"
DB_PATH  = Path(__file__).parent / "train_temp.db"   # 训练专用临时库

# 测试用户统一密码 test123 的 bcrypt hash（省去 Python bcrypt 依赖）
PASSWORD_HASH = "$2a$10$vDVpT8g8VsNMD63Zv9hbTuN02ht5eGmcM/4QyMmvu0YBGHbZayXOW"

# ─── 词库 ─────────────────────────────────────────────────────────────────────

ADJ = ["灵感", "创意", "极客", "潮流", "硬核", "佛系", "卷王", "躺平",
       "高效", "暗黑", "像素", "复古", "未来", "极简", "野生", "进击"]
NOUN = ["设计师", "程序员", "产品狗", "运营喵", "摄影师", "插画家",
        "创作者", "策划人", "营销人", "数据狗", "全栈", "独立开发"]
NUM_SUFFIX = list("ABCDEFGHJKLMNPQRSTUVWXYZ0123456789")

POST_TITLES = [
    "我用 Figma 做了一套开源图标库，免费分享",
    "出海产品如何做冷启动？我的 3 个失败经验",
    "独立开发者第一年：从 0 到月入 2 万的心路历程",
    "AI 绘图工具横向对比：Midjourney vs DALL-E vs 国产",
    "社交媒体运营的底层逻辑——内容即产品",
    "跨境电商选品避坑指南（亚马逊站卖家视角）",
    "Design Token 在大型项目中的实践",
    "我如何用 GPT-4 把翻译效率提升 10 倍",
    "深夜分享：做产品三年的十条教训",
    "中小团队如何建立高效的设计系统？",
    "React 性能优化：从 3s 到 0.8s 的实战总结",
    "内容创作者的变现路径盘点（2025版）",
    "用 Python 爬取竞品数据——合规与效率兼顾",
    "B 端产品交互设计的七个原则",
    "出海必知：东南亚五国用户画像分析",
    "字体排版入门：让你的设计作品不再廉价",
    "独立播客如何冷启动获得前 1000 名听众",
    "我的副业工作流：Notion + 飞书 + Figma",
    "低成本验证商业想法的 5 种方法",
    "微信小程序 VS App：创业者该怎么选？",
    "NFT 已死？Web3 的下一个机会在哪里",
    "品牌设计中的色彩心理学",
    "从 0 搭建数据分析体系：小团队实用指南",
    "产品增长黑客手册（内部分享版）",
    "AI 时代的创作者经济：机遇与焦虑",
    "跨境支付避坑：Stripe、Paddle、Lemonsqueezy 对比",
    "用户研究不是玄学：5 天做完定性访谈",
    "开源 vs 商业：独立开发者的艰难抉择",
    "插画零基础入门：iPad + Procreate 上手指南",
    "如何写出让人愿意转发的科技文章？",
]

TAGS_POOL = [
    ["技术", "产品"],
    ["跨境", "运营"],
    ["设计", "产品"],
    ["技术", "跨境"],
    ["运营", "活动"],
    ["文化", "设计"],
    ["技术"],
    ["产品", "运营"],
    ["设计"],
    ["跨境", "文化"],
    ["其他"],
    ["运营"],
    ["技术", "其他"],
]

BIO_LIST = [
    "独立开发者，热爱折腾新技术",
    "UI/UX 设计师，用设计改变世界",
    "产品经理 | 创业探索中",
    "全栈工程师，开源爱好者",
    "跨境电商老玩家，欢迎交流",
    "创作者经济研究者",
    "字节系前员工，现在躺平",
    "INFJ | 设计 + 代码双修",
    "内容营销 & 增长黑客",
    "摄影 | 旅行 | 写作",
    "数据分析师，用数字讲故事",
    "AI 应用探索者",
    "",
    "深圳创业中，寻找同频伙伴",
    "远程工作 3 年，喜欢研究效率工具",
]

COMMENTS = [
    "写得太好了，收藏了！",
    "感同身受，踩过一样的坑。",
    "能分享一下具体的工具链吗？",
    "这个视角很新颖，mark",
    "有点干货，但还可以更深入。",
    "期待后续！",
    "转发给了团队，谢谢分享！",
    "有没有配套的模板或者代码？",
    "终于有人说清楚这个问题了。",
    "实操性很强，立刻去试试。",
    "已关注，希望多更新！",
    "和我的经历高度相似，共鸣了。",
]

# ─── 工具函数 ─────────────────────────────────────────────────────────────────

def rand_username():
    return random.choice(ADJ) + random.choice(NOUN) + "".join(random.choices(NUM_SUFFIX, k=3))

def rand_friend_code():
    return "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ0123456789", k=8))

def rand_date(days_ago_max=365, days_ago_min=1):
    delta = random.randint(days_ago_min, days_ago_max)
    return (datetime.now() - timedelta(days=delta)).strftime("%Y-%m-%d %H:%M:%S")

def rand_tags():
    import json
    return json.dumps(random.choice(TAGS_POOL), ensure_ascii=False)

# ─── 主逻辑 ──────────────────────────────────────────────────────────────────

def main():
    if not REAL_DB.exists():
        print(f"[错误] 真实数据库不存在: {REAL_DB}")
        print("请先启动后端服务（npm run dev），让它初始化 DB，再运行此脚本。")
        return

    # 每次重新复制真实库，确保临时库包含最新真实数据
    print(f"[INFO] 复制真实库 → {DB_PATH.name} …")
    shutil.copy2(str(REAL_DB), str(DB_PATH))

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    # ── 1. 获取已有用户 ID 上限（真实用户） ──────────────────────────────────
    cur.execute("SELECT COUNT(*) FROM users")
    existing_users = cur.fetchone()[0]
    print(f"[INFO] 真实用户 {existing_users} 个，将在临时库中追加合成数据")

    # ── 2. 生成合成用户 ───────────────────────────────────────────────────────
    TARGET_USERS = 400
    to_add = max(0, TARGET_USERS - existing_users)
    print(f"[INFO] 将生成 {to_add} 个合成用户…")

    used_usernames: set = set()
    used_codes: set = set()
    cur.execute("SELECT username, friend_code FROM users")
    for row in cur.fetchall():
        used_usernames.add(row[0])
        if row[1]:
            used_codes.add(row[1])

    new_user_ids = []
    batch = []
    attempts = 0
    while len(batch) < to_add and attempts < to_add * 20:
        attempts += 1
        uname = rand_username()
        if uname in used_usernames:
            continue
        code = rand_friend_code()
        while code in used_codes:
            code = rand_friend_code()
        used_usernames.add(uname)
        used_codes.add(code)
        email = f"{uname.lower()[:12]}_{random.randint(100,9999)}@synth.test"
        points = random.choices(
            [random.randint(100, 300), random.randint(300, 800), random.randint(800, 3000)],
            weights=[0.5, 0.35, 0.15]
        )[0]
        bio = random.choice(BIO_LIST)
        created = rand_date(days_ago_max=400)
        batch.append((uname, email, PASSWORD_HASH, "user", points, bio, code, created))

    cur.executemany(
        "INSERT OR IGNORE INTO users (username, email, password_hash, role, lingjing_points, bio, friend_code, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        batch
    )
    conn.commit()
    print(f"[OK] 插入 {cur.rowcount} 个合成用户")

    # 获取所有用户 ID
    cur.execute("SELECT id FROM users")
    all_user_ids = [r[0] for r in cur.fetchall()]
    n_users = len(all_user_ids)
    print(f"[INFO] 当前总用户数 {n_users}")

    # ── 3. 生成好友关系（模拟 scale-free 社交网络）────────────────────────────
    cur.execute("SELECT COUNT(*) FROM friendships")
    existing_fr = cur.fetchone()[0]
    TARGET_FR = 3000
    to_add_fr = max(0, TARGET_FR - existing_fr)
    print(f"[INFO] 将生成 {to_add_fr} 条好友关系…")

    cur.execute("SELECT requester_id, addressee_id FROM friendships")
    existing_edges = set((r[0], r[1]) for r in cur.fetchall())

    # 每个用户的度数（越高越容易被选中，模拟 preferential attachment）
    degree = {uid: 1 for uid in all_user_ids}
    for (a, b) in existing_edges:
        degree[a] = degree.get(a, 1) + 1
        degree[b] = degree.get(b, 1) + 1

    fr_batch = []
    attempts = 0
    MAX_ATTEMPTS = to_add_fr * 15
    while len(fr_batch) < to_add_fr * 2 and attempts < MAX_ATTEMPTS:
        attempts += 1
        weights = [degree.get(uid, 1) for uid in all_user_ids]
        a, b = random.choices(all_user_ids, weights=weights, k=2)
        if a == b:
            continue
        u, v = min(a, b), max(a, b)
        if (u, v) in existing_edges:
            continue
        existing_edges.add((u, v))
        degree[u] = degree.get(u, 1) + 1
        degree[v] = degree.get(v, 1) + 1
        created = rand_date(300)
        fr_batch.append((u, v, "accepted", created))

    cur.executemany(
        "INSERT OR IGNORE INTO friendships (requester_id, addressee_id, status, created_at) "
        "VALUES (?, ?, ?, ?)",
        fr_batch
    )
    conn.commit()
    print(f"[OK] 插入 {cur.rowcount} 条好友记录")

    # ── 4. 生成帖子 ───────────────────────────────────────────────────────────
    cur.execute("SELECT COUNT(*) FROM posts")
    existing_posts = cur.fetchone()[0]
    TARGET_POSTS = 2000
    to_add_posts = max(0, TARGET_POSTS - existing_posts)
    print(f"[INFO] 将生成 {to_add_posts} 篇帖子…")

    post_batch = []
    for _ in range(to_add_posts):
        uid = random.choice(all_user_ids)
        title = random.choice(POST_TITLES) + (
            "（续）" if random.random() < 0.15 else
            f"（{random.randint(2, 5)}）" if random.random() < 0.1 else ""
        )
        # 生成段落内容（简化版）
        lines = [
            f"本文分享一些关于「{title[:10]}」的个人经验，仅供参考。",
            "",
            f"## 背景",
            f"我在过去 {random.randint(1,3)} 年的实践中积累了一些心得。",
            "",
            f"## 核心观点",
            f"核心在于：{random.choice(['用户思维', '数据驱动', '快速迭代', '降本增效', '差异化定位'])}。",
            "",
            f"欢迎评论区交流！",
        ]
        content = "\n".join(lines)
        tags = rand_tags()
        likes = random.randint(0, 120)
        views = likes * random.randint(5, 30)
        created = rand_date(days_ago_max=300)
        post_batch.append((uid, title, content, tags, likes, views, created))

    cur.executemany(
        "INSERT INTO posts (user_id, title, content, tags, likes_count, views_count, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        post_batch
    )
    conn.commit()
    print(f"[OK] 插入 {cur.rowcount} 篇帖子")

    # ── 5. 生成点赞和评论（互动） ─────────────────────────────────────────────
    cur.execute("SELECT id FROM posts")
    all_post_ids = [r[0] for r in cur.fetchall()]
    n_posts = len(all_post_ids)

    # 点赞
    cur.execute("SELECT COUNT(*) FROM post_likes")
    existing_likes = cur.fetchone()[0]
    TARGET_LIKES = 12000
    to_add_likes = max(0, TARGET_LIKES - existing_likes)
    print(f"[INFO] 将生成 {to_add_likes} 条点赞…")

    cur.execute("SELECT post_id, user_id FROM post_likes")
    existing_like_set = set((r[0], r[1]) for r in cur.fetchall())

    likes_batch = []
    attempts = 0
    while len(likes_batch) < to_add_likes and attempts < to_add_likes * 5:
        attempts += 1
        # 热帖更容易被点赞（用二项分布模拟）
        post_idx = int(abs(random.gauss(0, n_posts * 0.3))) % n_posts
        pid = all_post_ids[post_idx]
        uid = random.choice(all_user_ids)
        if (pid, uid) in existing_like_set:
            continue
        existing_like_set.add((pid, uid))
        likes_batch.append((pid, uid, rand_date(200)))

    cur.executemany(
        "INSERT OR IGNORE INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)",
        likes_batch
    )
    conn.commit()
    print(f"[OK] 插入 {cur.rowcount} 条点赞")

    # 评论
    cur.execute("SELECT COUNT(*) FROM comments")
    existing_comments = cur.fetchone()[0]
    TARGET_COMMENTS = 5000
    to_add_comments = max(0, TARGET_COMMENTS - existing_comments)
    print(f"[INFO] 将生成 {to_add_comments} 条评论…")

    comments_batch = []
    for _ in range(to_add_comments):
        post_idx = int(abs(random.gauss(0, n_posts * 0.3))) % n_posts
        pid = all_post_ids[post_idx]
        uid = random.choice(all_user_ids)
        content = random.choice(COMMENTS)
        created = rand_date(150)
        comments_batch.append((pid, uid, content, created))

    cur.executemany(
        "INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)",
        comments_batch
    )
    conn.commit()
    print(f"[OK] 插入 {cur.rowcount} 条评论")

    # ── 6. 汇总 ──────────────────────────────────────────────────────────────
    for tbl in ["users", "friendships", "posts", "post_likes", "comments"]:
        cur.execute(f"SELECT COUNT(*) FROM {tbl}")
        print(f"  {tbl}: {cur.fetchone()[0]}")

    conn.close()
    print(f"\n[完成] 合成数据已写入 {DB_PATH.name}（真实库未改动），可以运行 train.py 开始训练。")

if __name__ == "__main__":
    main()
