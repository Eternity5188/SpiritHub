#!/bin/bash
# 应用数据库自动备份脚本
# 每天 3:00 AM 由 cron 调用
# 示例：0 3 * * * /srv/your-app/backup.sh >> /srv/your-app/backup.log 2>&1

set -e

APP_ROOT="${APP_ROOT:-/srv/your-app}"
DB_SRC="${BACKUP_DB_PATH:-$APP_ROOT/data/app.db}"
BACKUP_DIR="${BACKUP_DIR:-$APP_ROOT/backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/app_${DATE}.db"
KEEP_DAYS=14   # 保留最近 14 天备份

mkdir -p "$BACKUP_DIR"

# sqlite3 online backup（不锁表，热备份）
sqlite3 "$DB_SRC" ".backup '${BACKUP_FILE}'"

# 压缩
gzip "$BACKUP_FILE"

echo "[$(date)] ✅ 备份完成: ${BACKUP_FILE}.gz"

# 清理 14 天前的旧备份
find "$BACKUP_DIR" -name "app_*.db.gz" -mtime +${KEEP_DAYS} -delete
echo "[$(date)] 🧹 已清理 ${KEEP_DAYS} 天前的旧备份"
