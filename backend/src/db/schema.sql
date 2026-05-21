-- 灵创社区平台 · 数据库初始化 Schema

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar TEXT DEFAULT NULL,
  bio TEXT DEFAULT '',
  lingjing_points INTEGER DEFAULT 100,
  role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
  friend_code TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 社区帖子表
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 帖子评论表
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 帖子点赞表
CREATE TABLE IF NOT EXISTS post_likes (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id)
);

-- CoLab 协作项目表
CREATE TABLE IF NOT EXISTS colab_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'recruiting' CHECK(status IN ('recruiting', 'active', 'completed')),
  max_members INTEGER DEFAULT 5,
  current_members INTEGER DEFAULT 1,
  tags TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CoLab 成员表
CREATE TABLE IF NOT EXISTS colab_members (
  project_id INTEGER NOT NULL REFERENCES colab_projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK(role IN ('creator', 'member')),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, user_id)
);

-- 灵创值积分记录表
CREATE TABLE IF NOT EXISTS points_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  related_type TEXT DEFAULT NULL,
  related_id INTEGER DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 好友关系表
CREATE TABLE IF NOT EXISTS friendships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(requester_id, addressee_id)
);

-- 私信表（1对1）
CREATE TABLE IF NOT EXISTS private_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 聊天室表
CREATE TABLE IF NOT EXISTS chat_rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  community TEXT NOT NULL DEFAULT 'general',
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 聊天室成员表
CREATE TABLE IF NOT EXISTS chat_room_members (
  room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════════════
-- GNN 研究数据集专用表
-- 设计目标：捕获完整的用户行为时序数据，支持异构图神经网络研究
-- 节点类型：User / Post / ColabProject / Tag
-- 边类型：6 类（见 event_type 枚举）
-- ═══════════════════════════════════════════════════════════════════════

-- 用户行为事件日志（核心边数据源）
-- 每条记录对应图上的一条带时间戳的有向边：user → target
CREATE TABLE IF NOT EXISTS user_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,   -- 发起者节点
  event_type   TEXT NOT NULL,      -- 边类型枚举:
                                   --   'post_view'      user→post  阅读
                                   --   'post_like'      user→post  点赞
                                   --   'post_unlike'    user→post  取消点赞
                                   --   'post_comment'   user→post  评论
                                   --   'post_create'    user→post  发帖
                                   --   'colab_view'     user→colab 浏览项目
                                   --   'colab_join'     user→colab 加入项目
                                   --   'colab_create'   user→colab 创建项目
                                   --   'profile_view'   user→user  浏览他人主页
                                   --   'friend_request' user→user  发送好友申请
                                   --   'friend_accept'  user→user  接受好友申请
                                   --   'message_send'   user→user  发送私信
                                   --   'search'         user→NULL  搜索
                                   --   'page_visit'     user→NULL  页面访问
  target_type  TEXT,               -- 'post' | 'user' | 'colab' | 'tag' | NULL
  target_id    INTEGER,            -- 对应节点 id（target_type='tag' 时存 user_tag_interests.tag）
  target_extra TEXT,               -- 辅助字段（如 search_query、page_path 等）
  session_id   TEXT,               -- 前端 session UUID（同一会话内的连续行为）
  duration_ms  INTEGER,            -- 持续时长（阅读时长、会话时长等），NULL=非时长型事件
  metadata     TEXT DEFAULT '{}',  -- JSON：任意附加字段（scroll_pct、ref_page、tag_list 等）
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_events_user    ON user_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_events_target  ON user_events(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_user_events_session ON user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_events_type    ON user_events(event_type, created_at);

-- 帖子阅读详情日志（细粒度阅读行为，含匿名用户）
-- 提供比 views_count 更丰富的阅读质量信号，用于计算注意力权重
CREATE TABLE IF NOT EXISTS post_view_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- NULL=匿名访客
  duration_ms INTEGER DEFAULT 0,   -- 阅读停留时长（前端上报）
  scroll_pct  INTEGER DEFAULT 0,   -- 最大滚动深度 0-100（前端上报）
  ref_page    TEXT,                -- 来源页面路径（'/community'、'/home' 等）
  session_id  TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pvl_post    ON post_view_logs(post_id);
CREATE INDEX IF NOT EXISTS idx_pvl_user    ON post_view_logs(user_id, created_at);

-- 用户标签兴趣权重（节点特征：用户在各标签维度的兴趣强度）
-- 权重由各类行为加权累计：浏览+0.5 / 点赞+2 / 评论+3 / 发帖+5
CREATE TABLE IF NOT EXISTS user_tag_interests (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag        TEXT NOT NULL,
  weight     REAL DEFAULT 0.0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_uti_tag ON user_tag_interests(tag, weight DESC);

-- 聊天室消息表
CREATE TABLE IF NOT EXISTS room_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 默认聊天室（灵创大厅）
INSERT OR IGNORE INTO chat_rooms (id, name, description, community, owner_id)
SELECT 1, '灵创大厅', '灵创平台官方聊天室，欢迎所有人！', 'general', id FROM users WHERE username = 'admin' LIMIT 1;

-- 灵创大厅创始人默认加入
INSERT OR IGNORE INTO chat_room_members (room_id, user_id)
SELECT 1, id FROM users WHERE username = 'admin' LIMIT 1;

-- 文化风控数据表
CREATE TABLE IF NOT EXISTS cultural_risks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country TEXT NOT NULL,
  country_en TEXT NOT NULL,
  country_code TEXT UNIQUE NOT NULL,
  flag TEXT NOT NULL,
  taboo_colors TEXT DEFAULT '[]',
  religious_taboos TEXT DEFAULT '[]',
  marketing_notes TEXT DEFAULT '[]',
  risk_level TEXT NOT NULL CHECK(risk_level IN ('high', 'mid', 'low')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 充值套餐表（管理员定价）
CREATE TABLE IF NOT EXISTS recharge_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  points INTEGER NOT NULL,
  price REAL NOT NULL,
  description TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 充值订单表
CREATE TABLE IF NOT EXISTS recharge_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id INTEGER REFERENCES recharge_packages(id),
  points INTEGER NOT NULL,
  price REAL NOT NULL,
  note TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- GNN 好友推荐结果表（由 gnn/train.py 离线写入）
CREATE TABLE IF NOT EXISTS friend_recommendations (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rec_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, rec_user_id)
);

-- GNN 帖子推荐结果表（由 gnn/train.py 离线写入）
CREATE TABLE IF NOT EXISTS post_recommendations (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  score REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id)
);

-- ── 科学组系列表 ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS science_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  research_domain TEXT NOT NULL,
  lead_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_members INTEGER DEFAULT 12,
  current_members INTEGER DEFAULT 1,
  status TEXT DEFAULT 'recruiting' CHECK(status IN ('recruiting', 'active', 'closed')),
  tags TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS science_members (
  group_id INTEGER NOT NULL REFERENCES science_groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK(role IN ('lead', 'member')),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS science_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES science_groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  statement TEXT NOT NULL,
  research_background TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  reviewer_note TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME DEFAULT NULL,
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS science_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES science_groups(id) ON DELETE CASCADE,
  uploader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  display_title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  category TEXT DEFAULT '未分类',
  market_tags TEXT DEFAULT '[]',
  ai_summary TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS science_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES science_groups(id) ON DELETE CASCADE,
  creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  thread_type TEXT DEFAULT 'discussion' CHECK(thread_type IN ('discussion', 'research', 'proposal', 'report')),
  market TEXT DEFAULT NULL,
  pinned INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS science_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL REFERENCES science_threads(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户通知表
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT DEFAULT NULL,
  is_read INTEGER DEFAULT 0,
  related_type TEXT DEFAULT NULL,
  related_id INTEGER DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 密码重置令牌表
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初始管理员账号（密码: admin123）
INSERT OR IGNORE INTO users (username, email, password_hash, role, lingjing_points)
VALUES (
  'admin',
  'admin@lingjing.com',
  '$2a$10$seKzAP.MhNoqlJq.aTBZj.o53cZjxeh.8/ny.Z0UC1k6Lw.xcpxZG',
  'admin',
  9999
);

-- 初始测试用户（密码: test123）
INSERT OR IGNORE INTO users (username, email, password_hash, role, lingjing_points)
VALUES (
  'demo',
  'demo@lingjing.com',
  '$2a$10$vDVpT8g8VsNMD63Zv9hbTuN02ht5eGmcM/4QyMmvu0YBGHbZayXOW',
  'user',
  500
);
