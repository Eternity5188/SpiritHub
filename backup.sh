#!/bin/bash
# 灵创平台数据库自动备份脚本
# 每天 3:00 AM 由 cron 调用
# crontab -e 添加: 0 3 * * * /home/ubuntu/lingjing-platform/backup.sh >> /home/ubuntu/lingjing-platform/backup.log 2>&1

set -e

DB_SRC="/home/ubuntu/lingjing-platform/data/lingjing.db"
BACKUP_DIR="/home/ubuntu/lingjing-platform/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/lingjing_${DATE}.db"
KEEP_DAYS=14   # 保留最近 14 天备份

mkdir -p "$BACKUP_DIR"

# sqlite3 online backup（不锁表，热备份）
sqlite3 "$DB_SRC" ".backup '${BACKUP_FILE}'"

# 压缩
gzip "$BACKUP_FILE"

echo "[$(date)] ✅ 备份完成: ${BACKUP_FILE}.gz"

# 清理 14 天前的旧备份
find "$BACKUP_DIR" -name "lingjing_*.db.gz" -mtime +${KEEP_DAYS} -delete
echo "[$(date)] 🧹 已清理 ${KEEP_DAYS} 天前的旧备份"
