import sqlite3
from pathlib import Path

DB = Path(__file__).parent.parent / "backend" / "data" / "lingjing.db"
conn = sqlite3.connect(str(DB))
conn.execute("PRAGMA foreign_keys = ON")
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM users WHERE email LIKE '%@synth.test'")
print("将删除合成用户:", cur.fetchone()[0])

cur.execute("DELETE FROM users WHERE email LIKE '%@synth.test'")
conn.commit()

for t in ["users","friendships","posts","post_likes","comments","friend_recommendations","post_recommendations"]:
    cur.execute(f"SELECT COUNT(*) FROM {t}")
    print(f"  {t}: {cur.fetchone()[0]}")

conn.close()
print("清理完成")
