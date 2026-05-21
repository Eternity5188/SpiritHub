#!/usr/bin/env python3
"""
灵创平台 · 本地 GNN 训练 + 上传脚本
=====================================
用法：
  python gnn/run_local.py [步骤标志]

步骤标志（可组合使用）：
  --download   从服务器下载最新生产数据库（默认：开启）
  --train      本地训练 GNN 并写入推荐结果（默认：开启）
  --upload     将推荐结果 + 权重上传到服务器（默认：开启）

示例：
  python gnn/run_local.py                    # 全流程（下载→训练→上传）
  python gnn/run_local.py --train --upload   # 跳过下载，直接用已有本地DB训练并上传
  python gnn/run_local.py --download         # 只下载DB，不训练不上传

服务器配置：通过环境变量设置 SERVER_* 参数。
"""

import argparse
import os
import sqlite3
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

# ─── 服务器配置 ───────────────────────────────────────────────────────────────

SERVER_USER = os.getenv("LINGJING_SERVER_USER", "deploy-user")
SERVER_HOST = os.getenv("LINGJING_SERVER_HOST", "your-server-host")
SERVER_DB   = os.getenv("LINGJING_SERVER_DB", f"/srv/{SERVER_USER}/your-app/data/app.db")
SERVER_WEIGHTS_DIR = os.getenv("LINGJING_SERVER_WEIGHTS_DIR", f"/srv/{SERVER_USER}/your-app/gnn/weights/")
# 若使用 SSH 密钥文件，填写路径；使用 ssh-agent 可留空字符串
SSH_KEY = ""   # 例如 r"C:\Users\you\.ssh\lingjing_key.pem"

# ─── 本地路径 ─────────────────────────────────────────────────────────────────

GNN_DIR    = Path(__file__).parent          # lingjing-platform/gnn/
ROOT_DIR   = GNN_DIR.parent                # lingjing-platform/
LOCAL_DB   = ROOT_DIR / "data" / "lingjing.db"
WEIGHT_DIR = GNN_DIR / "weights"
TRAIN_SCRIPT = GNN_DIR / "train.py"

# ─── SSH/SCP 辅助 ─────────────────────────────────────────────────────────────

def _ssh_opts(is_ssh: bool = False) -> list[str]:
    """返回 SSH/SCP 公共选项（密钥文件 + 跳过 host 验证）"""
    opts = ["-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=15"]
    if is_ssh:
        opts = ["-n"] + opts   # -n 防止 SSH 读取本地 stdin，避免远程命令挂起
    if SSH_KEY:
        opts += ["-i", SSH_KEY]
    return opts


def run(cmd: list[str], check: bool = True, **kwargs) -> subprocess.CompletedProcess:
    print(f"  $ {' '.join(cmd)}")
    return subprocess.run(cmd, check=check, **kwargs)


# ─── Step 1: 下载生产数据库 ────────────────────────────────────────────────────

def download_db() -> None:
    print("\n" + "─" * 60)
    print("  [Step 1] 从服务器下载最新生产数据库")
    print("─" * 60)

    LOCAL_DB.parent.mkdir(parents=True, exist_ok=True)

    # 备份已有本地 DB（如果存在）
    if LOCAL_DB.exists():
        backup = LOCAL_DB.with_suffix(f".bak_{datetime.now():%Y%m%d_%H%M%S}.db")
        LOCAL_DB.rename(backup)
        print(f"  已备份旧本地库 → {backup.name}")

    cmd = ["scp"] + _ssh_opts() + [
        f"{SERVER_USER}@{SERVER_HOST}:{SERVER_DB}",
        str(LOCAL_DB),
    ]
    run(cmd)
    size_mb = LOCAL_DB.stat().st_size / 1_048_576
    print(f"  ✓ 下载完成，大小 {size_mb:.2f} MB → {LOCAL_DB}")


# ─── Step 2: 本地训练 ─────────────────────────────────────────────────────────

def train() -> None:
    print("\n" + "─" * 60)
    print("  [Step 2] 本地 GNN 训练")
    print("─" * 60)

    if not LOCAL_DB.exists():
        print("  [错误] 找不到本地数据库，请先运行 --download")
        sys.exit(1)

    if not TRAIN_SCRIPT.exists():
        print(f"  [错误] 找不到训练脚本: {TRAIN_SCRIPT}")
        sys.exit(1)

    # 使用当前 Python 解释器运行训练脚本
    cmd = [sys.executable, str(TRAIN_SCRIPT)]
    run(cmd, cwd=str(ROOT_DIR))
    print("  ✓ 训练完成，推荐结果已写入本地 DB，权重已保存至 gnn/weights/")


# ─── Step 3: 上传推荐结果 + 权重 ─────────────────────────────────────────────

def upload() -> None:
    print("\n" + "─" * 60)
    print("  [Step 3] 上传推荐结果 + 权重到服务器")
    print("─" * 60)

    _upload_recommendations()
    _upload_weights()
    _reload_backend()


def _upload_recommendations() -> None:
    """从本地训练库中导出推荐 SQL，通过 SSH 注入生产库"""
    if not LOCAL_DB.exists():
        print("  [错误] 本地 DB 不存在，无法导出推荐")
        sys.exit(1)

    conn = sqlite3.connect(str(LOCAL_DB))
    cur  = conn.cursor()

    # 检查推荐表是否存在
    tables = {r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    if "friend_recommendations" not in tables and "post_recommendations" not in tables:
        print("  [警告] 本地 DB 中不含推荐表，请先运行 --train")
        conn.close()
        return

    # 生成 SQL
    lines: list[str] = []
    lines.append("PRAGMA journal_mode=WAL;")
    lines.append("BEGIN;")

    # 推荐表建表（IF NOT EXISTS，幂等）
    lines.append("""CREATE TABLE IF NOT EXISTS friend_recommendations (
    user_id INTEGER NOT NULL,
    rec_user_id INTEGER NOT NULL,
    score REAL NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, rec_user_id)
);""")
    lines.append("""CREATE TABLE IF NOT EXISTS post_recommendations (
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    score REAL NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)
);""")

    # 清空旧数据
    lines.append("DELETE FROM friend_recommendations;")
    lines.append("DELETE FROM post_recommendations;")

    # 插入好友推荐
    if "friend_recommendations" in tables:
        rows = cur.execute("SELECT user_id, rec_user_id, score FROM friend_recommendations").fetchall()
        for u, v, s in rows:
            lines.append(f"INSERT OR REPLACE INTO friend_recommendations(user_id,rec_user_id,score) VALUES({u},{v},{s});")
        print(f"  → 好友推荐 {len(rows)} 条")

    # 插入帖子推荐
    if "post_recommendations" in tables:
        rows = cur.execute("SELECT user_id, post_id, score FROM post_recommendations").fetchall()
        for u, p, s in rows:
            lines.append(f"INSERT OR REPLACE INTO post_recommendations(user_id,post_id,score) VALUES({u},{p},{s});")
        print(f"  → 帖子推荐 {len(rows)} 条")

    lines.append("COMMIT;")
    conn.close()

    sql_content = "\n".join(lines)

    # 写本地临时文件 → SCP 到服务器 → SSH 应用
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sql", delete=False,
                                     encoding="utf-8") as tf:
        tf.write(sql_content)
        tmp_path = tf.name

    remote_tmp = "/tmp/lingjing_recs.sql"
    try:
        # 上传 SQL 文件
        run(["scp"] + _ssh_opts() + [tmp_path, f"{SERVER_USER}@{SERVER_HOST}:{remote_tmp}"])
        # 在服务器上应用到生产 DB
        run(["ssh"] + _ssh_opts(is_ssh=True) + [f"{SERVER_USER}@{SERVER_HOST}",
            f"sqlite3 {SERVER_DB} < {remote_tmp} && rm -f {remote_tmp}"])
        print("  ✓ 推荐结果已写入生产数据库")
        # 重启后端使 libsql 连接刷新，读到最新数据
        run(["ssh"] + _ssh_opts(is_ssh=True) + [f"{SERVER_USER}@{SERVER_HOST}",
            "pm2 restart app-backend"])
        print("  ✓ 后端已重启（刷新 DB 读快照）")
    finally:
        os.unlink(tmp_path)


def _upload_weights() -> None:
    """上传本地模型权重到服务器（供下次热启动用）"""
    weight_files = list(WEIGHT_DIR.glob("*.pt"))
    if not weight_files:
        print("  [跳过] gnn/weights/ 下无 .pt 权重文件")
        return

    # 确保远端目录存在
    run(["ssh"] + _ssh_opts(is_ssh=True) + [f"{SERVER_USER}@{SERVER_HOST}",
        f"mkdir -p {SERVER_WEIGHTS_DIR}"])

    for wf in weight_files:
        run(["scp"] + _ssh_opts() + [str(wf),
            f"{SERVER_USER}@{SERVER_HOST}:{SERVER_WEIGHTS_DIR}"])
        print(f"  ✓ 权重 {wf.name} 已上传")


def _reload_backend() -> None:
    """通知 PM2 热重载后端（可选，推荐结果是数据库级别，无需重启）"""
    print("  [提示] 推荐结果已持久化到数据库，后端无需重启即可读取新推荐。")
    print(f"  若需强制刷新可手动运行: ssh {SERVER_USER}@{SERVER_HOST} 'pm2 restart app-backend'")


# ─── 主入口 ───────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="灵创平台本地 GNN 训练 + 上传脚本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--download", action="store_true",
                        help="从服务器下载最新生产数据库")
    parser.add_argument("--train",    action="store_true",
                        help="本地训练 GNN 并写入推荐结果")
    parser.add_argument("--upload",   action="store_true",
                        help="将推荐结果 + 权重上传到服务器")
    args = parser.parse_args()

    # 如果没有任何标志，默认跑全流程
    run_all = not (args.download or args.train or args.upload)

    print("=" * 60)
    print("  灵创平台 · 本地 GNN 训练 + 上传")
    print(f"  服务器: {SERVER_USER}@{SERVER_HOST}")
    print("=" * 60)

    if run_all or args.download:
        download_db()

    if run_all or args.train:
        train()

    if run_all or args.upload:
        upload()

    print("\n" + "=" * 60)
    print("  全部完成！")
    print("=" * 60)


if __name__ == "__main__":
    main()
