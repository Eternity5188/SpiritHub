"""
export_dataset.py — 灵创社区 GNN 研究数据集导出工具
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
功能：
  从生产数据库导出多类型图神经网络训练/分析数据集。
  支持静态异构图、时序图、节点特征向量三大格式。

导出内容：
  dataset/
  ├── nodes_users.csv         用户节点 + 多维特征
  ├── nodes_posts.csv         帖子节点 + 多维特征
  ├── nodes_colab.csv         协作项目节点 + 特征
  ├── edges_friendship.csv    用户-用户好友边
  ├── edges_interact.csv      用户-帖子交互边（含类型/权重/时长）
  ├── edges_colab_member.csv  用户-项目成员边
  ├── edges_message.csv       用户-用户私信边
  ├── temporal_edges.csv      全局时序边列表（异质图研究核心）
  ├── user_tag_matrix.csv     用户×标签兴趣矩阵（稀疏）
  └── graph_stats.json        图统计摘要

用法：
    python gnn/export_dataset.py [--db path/to/lingjing.db] [--out dataset/]

依赖：Python 3.8+, 无第三方库（仅 stdlib: sqlite3, csv, json, pathlib）
"""

import argparse
import csv
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

# ─────────────────────────────────────────────────────────────
# 配置默认值
# ─────────────────────────────────────────────────────────────
DEFAULT_DB  = Path(__file__).parent.parent / 'backend' / 'data' / 'lingjing.db'
DEFAULT_OUT = Path(__file__).parent / 'dataset'


def connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def write_csv(path: Path, rows: list, fieldnames: list) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


# ─────────────────────────────────────────────────────────────
# 节点导出
# ─────────────────────────────────────────────────────────────

def export_users(conn: sqlite3.Connection, out: Path) -> int:
    """
    用户节点特征（8 维数值特征 + 4 维元数据）：
      - lingjing_points   : 灵创值（活跃度综合代理）
      - days_since_join   : 注册天数（账龄）
      - post_count        : 发帖数
      - comment_count     : 评论数
      - like_given        : 主动点赞数
      - like_received     : 获赞数
      - friend_count      : 好友数（已接受）
      - tag_diversity     : 兴趣标签多样性（unique tag 数）
    """
    sql = """
    SELECT
        u.id                                                    AS user_id,
        u.username,
        u.role,
        u.lingjing_points,
        CAST(julianday('now') - julianday(u.created_at) AS INTEGER)
                                                                AS days_since_join,
        COALESCE(p.post_count,    0)                            AS post_count,
        COALESCE(c.comment_count, 0)                            AS comment_count,
        COALESCE(lg.like_given,   0)                            AS like_given,
        COALESCE(lr.like_received,0)                            AS like_received,
        COALESCE(fr.friend_count, 0)                            AS friend_count,
        COALESCE(td.tag_diversity,0)                            AS tag_diversity,
        u.created_at
    FROM users u
    LEFT JOIN (SELECT user_id, COUNT(*) AS post_count    FROM posts    GROUP BY user_id) p  ON p.user_id  = u.id
    LEFT JOIN (SELECT user_id, COUNT(*) AS comment_count FROM comments GROUP BY user_id) c  ON c.user_id  = u.id
    LEFT JOIN (SELECT user_id, COUNT(*) AS like_given    FROM post_likes GROUP BY user_id) lg ON lg.user_id = u.id
    LEFT JOIN (SELECT p2.user_id, COUNT(*) AS like_received
               FROM post_likes pl JOIN posts p2 ON pl.post_id = p2.id
               GROUP BY p2.user_id) lr ON lr.user_id = u.id
    LEFT JOIN (SELECT requester_id AS uid, COUNT(*) AS friend_count
               FROM friendships WHERE status = 'accepted' GROUP BY requester_id) fr ON fr.uid = u.id
    LEFT JOIN (SELECT user_id, COUNT(DISTINCT tag) AS tag_diversity
               FROM user_tag_interests GROUP BY user_id) td ON td.user_id = u.id
    ORDER BY u.id
    """
    rows = [dict(r) for r in conn.execute(sql)]
    fields = ['user_id','username','role','lingjing_points','days_since_join',
              'post_count','comment_count','like_given','like_received',
              'friend_count','tag_diversity','created_at']
    return write_csv(out / 'nodes_users.csv', rows, fields)


def export_posts(conn: sqlite3.Connection, out: Path) -> int:
    """帖子节点特征（帖子质量 + 元信息）"""
    sql = """
    SELECT
        p.id            AS post_id,
        p.user_id       AS author_id,
        p.tags,
        p.likes_count,
        p.views_count,
        p.comments_count,
        CAST(julianday('now') - julianday(p.created_at) AS INTEGER) AS days_old,
        p.created_at
    FROM posts p
    ORDER BY p.id
    """
    rows = []
    for r in conn.execute(sql):
        d = dict(r)
        try:
            tag_list = json.loads(d.get('tags') or '[]')
        except Exception:
            tag_list = []
        d['tag_count'] = len(tag_list)
        d['tags'] = json.dumps(tag_list, ensure_ascii=False)
        rows.append(d)
    fields = ['post_id','author_id','tags','tag_count','likes_count',
              'views_count','comments_count','days_old','created_at']
    return write_csv(out / 'nodes_posts.csv', rows, fields)


def export_colab(conn: sqlite3.Connection, out: Path) -> int:
    """协作项目节点特征"""
    sql = """
    SELECT
        cp.id           AS colab_id,
        cp.creator_id,
        cp.name,
        cp.tags,
        cp.status,
        cp.max_members,
        cp.current_members,
        CAST(julianday('now') - julianday(cp.created_at) AS INTEGER) AS days_old,
        cp.created_at
    FROM colab_projects cp
    ORDER BY cp.id
    """
    rows = []
    for r in conn.execute(sql):
        d = dict(r)
        try:
            tag_list = json.loads(d.get('tags') or '[]')
        except Exception:
            tag_list = []
        d['tag_count'] = len(tag_list)
        d['tags'] = json.dumps(tag_list, ensure_ascii=False)
        rows.append(d)
    fields = ['colab_id','creator_id','name','tags','tag_count',
              'status','max_members','current_members','days_old','created_at']
    return write_csv(out / 'nodes_colab.csv', rows, fields)


# ─────────────────────────────────────────────────────────────
# 边导出
# ─────────────────────────────────────────────────────────────

def export_friendships(conn: sqlite3.Connection, out: Path) -> int:
    """
    好友关系边（User–User 社会图）
    status: pending=定向边, accepted=无向边（导出双向行）
    """
    sql = """
    SELECT
        requester_id    AS src_user,
        addressee_id    AS dst_user,
        status,
        created_at
    FROM friendships
    ORDER BY created_at
    """
    rows = []
    for r in conn.execute(sql):
        d = dict(r)
        rows.append(d)
        # 已接受的好友关系：补充反向边（无向图表示）
        if d['status'] == 'accepted':
            rows.append({'src_user': d['dst_user'], 'dst_user': d['src_user'],
                         'status': 'accepted', 'created_at': d['created_at']})
    fields = ['src_user','dst_user','status','created_at']
    return write_csv(out / 'edges_friendship.csv', rows, fields)


def export_interactions(conn: sqlite3.Connection, out: Path) -> int:
    """
    用户-帖子交互边（User–Post 二部图）
    包含行为类型、权重、时长等边特征
    权重映射：post_view=0.5, post_like=2, post_unlike=-1, post_comment=3, post_create=5
    """
    WEIGHTS = {
        'post_view'    :  0.5,
        'post_like'    :  2.0,
        'post_unlike'  : -1.0,
        'post_comment' :  3.0,
        'post_create'  :  5.0,
    }
    sql = """
    SELECT
        ue.user_id,
        ue.target_id        AS post_id,
        ue.event_type,
        ue.duration_ms,
        ue.session_id,
        ue.metadata,
        ue.created_at
    FROM user_events ue
    WHERE ue.target_type = 'post'
      AND ue.event_type IN ('post_view','post_like','post_unlike','post_comment','post_create')
      AND ue.user_id IS NOT NULL
      AND ue.target_id IS NOT NULL
    ORDER BY ue.created_at
    """
    rows = []
    for r in conn.execute(sql):
        d = dict(r)
        try:
            meta = json.loads(d.get('metadata') or '{}')
        except Exception:
            meta = {}
        d['scroll_pct'] = meta.get('scroll_pct', 0)
        d['weight'] = WEIGHTS.get(d['event_type'], 1.0)
        d.pop('metadata', None)
        rows.append(d)
    fields = ['user_id','post_id','event_type','weight','duration_ms','scroll_pct','session_id','created_at']
    return write_csv(out / 'edges_interact.csv', rows, fields)


def export_colab_members(conn: sqlite3.Connection, out: Path) -> int:
    """用户-项目成员边（User–Colab 二部图）"""
    sql = """
    SELECT
        cm.user_id,
        cm.project_id   AS colab_id,
        cm.role,
        cm.joined_at    AS created_at
    FROM colab_members cm
    ORDER BY cm.joined_at
    """
    rows = [dict(r) for r in conn.execute(sql)]
    fields = ['user_id','colab_id','role','created_at']
    return write_csv(out / 'edges_colab_member.csv', rows, fields)


def export_messages(conn: sqlite3.Connection, out: Path) -> int:
    """
    私信边（User–User 有向通信图）
    私信频率是社交强度的重要代理指标
    """
    sql = """
    SELECT
        sender_id,
        receiver_id,
        COUNT(*)        AS msg_count,
        MIN(created_at) AS first_at,
        MAX(created_at) AS last_at
    FROM private_messages
    GROUP BY sender_id, receiver_id
    ORDER BY last_at
    """
    rows = [dict(r) for r in conn.execute(sql)]
    fields = ['sender_id','receiver_id','msg_count','first_at','last_at']
    return write_csv(out / 'edges_message.csv', rows, fields)


def export_temporal_edges(conn: sqlite3.Connection, out: Path) -> int:
    """
    全局时序边列表（Temporal Heterogeneous Graph 核心数据）
    格式统一，支持 DyGNN / TGN / CAWN 等时序图模型
    边类型编码：
      0: friendship_request
      1: friendship_accept
      2: post_view
      3: post_like
      4: post_unlike
      5: post_comment
      6: post_create
      7: colab_join
      8: colab_create
      9: message_send
    """
    EDGE_TYPE = {
        'friend_request': 0,
        'friend_accept' : 1,
        'post_view'     : 2,
        'post_like'     : 3,
        'post_unlike'   : 4,
        'post_comment'  : 5,
        'post_create'   : 6,
        'colab_join'    : 7,
        'colab_create'  : 8,
        'message_send'  : 9,
    }
    rows = []

    # 来自 user_events
    sql_ue = """
    SELECT
        user_id         AS src_id,
        'user'          AS src_type,
        target_id       AS dst_id,
        target_type     AS dst_type,
        event_type,
        duration_ms,
        created_at
    FROM user_events
    WHERE user_id IS NOT NULL AND target_id IS NOT NULL
    ORDER BY created_at
    """
    for r in conn.execute(sql_ue):
        d = dict(r)
        d['edge_type_code'] = EDGE_TYPE.get(d['event_type'], -1)
        if d['edge_type_code'] == -1:
            continue
        rows.append(d)

    # 来自 private_messages（若 user_events 没有单条记录）
    sql_msg = """
    SELECT
        sender_id       AS src_id,
        'user'          AS src_type,
        receiver_id     AS dst_id,
        'user'          AS dst_type,
        'message_send'  AS event_type,
        NULL            AS duration_ms,
        created_at
    FROM private_messages
    ORDER BY created_at
    """
    for r in conn.execute(sql_msg):
        d = dict(r)
        d['edge_type_code'] = 9
        rows.append(d)

    # 按时间排序
    rows.sort(key=lambda x: x.get('created_at') or '')

    fields = ['src_id','src_type','dst_id','dst_type','event_type','edge_type_code','duration_ms','created_at']
    return write_csv(out / 'temporal_edges.csv', rows, fields)


def export_tag_matrix(conn: sqlite3.Connection, out: Path) -> int:
    """
    用户×标签兴趣稀疏矩阵（用户节点特征的高维表示）
    适合降维处理后作为节点初始 embedding
    """
    sql = """
    SELECT user_id, tag, weight, updated_at
    FROM user_tag_interests
    WHERE weight > 0
    ORDER BY user_id, weight DESC
    """
    rows = [dict(r) for r in conn.execute(sql)]
    fields = ['user_id','tag','weight','updated_at']
    return write_csv(out / 'user_tag_matrix.csv', rows, fields)


# ─────────────────────────────────────────────────────────────
# 图统计摘要
# ─────────────────────────────────────────────────────────────

def compute_stats(conn: sqlite3.Connection) -> dict:
    def scalar(sql: str, args=()):
        row = conn.execute(sql, args).fetchone()
        return row[0] if row else 0

    # 判断各日志表是否存在（兼容旧 schema）
    def table_exists(name: str) -> bool:
        r = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
        ).fetchone()
        return r is not None

    stats = {
        'generated_at'       : datetime.now(timezone.utc).isoformat(),
        'nodes': {
            'users'  : scalar('SELECT COUNT(*) FROM users'),
            'posts'  : scalar('SELECT COUNT(*) FROM posts'),
            'colab'  : scalar('SELECT COUNT(*) FROM colab_projects'),
        },
        'edges': {
            'friendships_total'   : scalar("SELECT COUNT(*) FROM friendships"),
            'friendships_accepted': scalar("SELECT COUNT(*) FROM friendships WHERE status='accepted'"),
            'post_likes'          : scalar('SELECT COUNT(*) FROM post_likes'),
            'comments'            : scalar('SELECT COUNT(*) FROM comments'),
            'colab_members'       : scalar('SELECT COUNT(*) FROM colab_members'),
            'private_messages'    : scalar('SELECT COUNT(*) FROM private_messages'),
        },
        'gnn_logs': {},
        'graph_density': {},
    }

    if table_exists('user_events'):
        stats['gnn_logs']['user_events_total'] = scalar('SELECT COUNT(*) FROM user_events')
        stats['gnn_logs']['user_events_by_type'] = {
            r[0]: r[1]
            for r in conn.execute('SELECT event_type, COUNT(*) FROM user_events GROUP BY event_type')
        }
    if table_exists('post_view_logs'):
        stats['gnn_logs']['post_view_logs_total'] = scalar('SELECT COUNT(*) FROM post_view_logs')
        avg = conn.execute(
            'SELECT AVG(duration_ms), AVG(scroll_pct) FROM post_view_logs WHERE duration_ms > 0'
        ).fetchone()
        stats['gnn_logs']['avg_read_ms']     = round(avg[0] or 0, 1)
        stats['gnn_logs']['avg_scroll_pct']  = round(avg[1] or 0, 1)
    if table_exists('user_tag_interests'):
        stats['gnn_logs']['tag_interest_rows'] = scalar('SELECT COUNT(*) FROM user_tag_interests')
        stats['gnn_logs']['unique_tags']        = scalar('SELECT COUNT(DISTINCT tag) FROM user_tag_interests')

    n_users = stats['nodes']['users']
    n_posts = stats['nodes']['posts']
    n_fship = stats['edges']['friendships_accepted']
    if n_users > 1:
        stats['graph_density']['social'] = round(n_fship / (n_users * (n_users - 1)), 6)
    if n_users > 0 and n_posts > 0:
        total_interact = (
            stats['edges']['post_likes'] +
            stats['edges']['comments']
        )
        stats['graph_density']['user_post_bipartite'] = round(
            total_interact / (n_users * n_posts), 6
        )

    return stats


# ─────────────────────────────────────────────────────────────
# 主入口
# ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='灵创社区 GNN 数据集导出工具')
    parser.add_argument('--db',  default=str(DEFAULT_DB),  help='SQLite 数据库路径')
    parser.add_argument('--out', default=str(DEFAULT_OUT), help='输出目录（默认 gnn/dataset/）')
    args = parser.parse_args()

    db_path  = Path(args.db)
    out_path = Path(args.out)

    if not db_path.exists():
        print(f'[错误] 数据库不存在: {db_path}')
        raise SystemExit(1)

    out_path.mkdir(parents=True, exist_ok=True)
    conn = connect(db_path)

    print(f'▶ 数据库: {db_path}')
    print(f'▶ 输出目录: {out_path}')
    print()

    tasks = [
        ('用户节点',     export_users,        'nodes_users.csv'),
        ('帖子节点',     export_posts,        'nodes_posts.csv'),
        ('项目节点',     export_colab,        'nodes_colab.csv'),
        ('好友关系边',   export_friendships,  'edges_friendship.csv'),
        ('交互边',       export_interactions, 'edges_interact.csv'),
        ('项目成员边',   export_colab_members,'edges_colab_member.csv'),
        ('私信边',       export_messages,     'edges_message.csv'),
        ('时序边列表',   export_temporal_edges,'temporal_edges.csv'),
        ('标签兴趣矩阵', export_tag_matrix,   'user_tag_matrix.csv'),
    ]

    for label, fn, fname in tasks:
        try:
            n = fn(conn, out_path)
            print(f'  ✔ {label:<12} → {fname}  ({n} 行)')
        except Exception as e:
            print(f'  ✘ {label:<12} 导出失败: {e}')

    # 写统计摘要
    stats = compute_stats(conn)
    stats_path = out_path / 'graph_stats.json'
    stats_path.write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'  ✔ 图统计摘要    → graph_stats.json')

    # 写 README
    readme = f"""# 灵创社区 GNN 研究数据集

导出时间：{stats['generated_at']}

## 节点统计
| 类型 | 数量 |
|------|------|
| 用户 | {stats['nodes']['users']} |
| 帖子 | {stats['nodes']['posts']} |
| 协作项目 | {stats['nodes']['colab']} |

## 边统计
| 关系 | 数量 |
|------|------|
| 好友关系（已接受，双向） | {stats['edges']['friendships_accepted'] * 2} |
| 点赞 | {stats['edges']['post_likes']} |
| 评论 | {stats['edges']['comments']} |
| 项目成员 | {stats['edges']['colab_members']} |
| 私信 | {stats['edges']['private_messages']} |

## 文件说明
| 文件 | 说明 |
|------|------|
| nodes_users.csv | 用户节点特征（8 维数值）|
| nodes_posts.csv | 帖子节点特征 |
| nodes_colab.csv | 协作项目节点特征 |
| edges_friendship.csv | 社会图好友边 |
| edges_interact.csv | 用户-帖子交互边（含时长/权重） |
| edges_colab_member.csv | 用户-项目协作边 |
| edges_message.csv | 用户-用户私信边（聚合） |
| temporal_edges.csv | **全局时序边（DyGNN 核心输入）** |
| user_tag_matrix.csv | 用户标签兴趣稀疏矩阵（节点特征） |
| graph_stats.json | 图统计摘要 |

## 推荐使用场景
- **链接预测**：用 edges_friendship 预测潜在好友
- **推荐系统**：用 edges_interact + 时序信息做序列推荐
- **社区检测**：在社会图上识别兴趣社群
- **节点分类**：预测用户活跃度层级
- **时序图学习**：temporal_edges 支持 TGN / DyGNN 等模型
"""
    (out_path / 'README.md').write_text(readme, encoding='utf-8')
    print(f'  ✔ README.md')

    print()
    print(f'✅ 数据集已导出至 {out_path}')
    conn.close()


if __name__ == '__main__':
    main()
