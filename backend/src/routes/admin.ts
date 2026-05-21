import { Router, Response } from 'express';
import path from 'path';
import db from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// 管理员鉴权中间件
function adminOnly(req: AuthRequest, res: Response, next: Function): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: '仅管理员可访问' });
    return;
  }
  next();
}

// GET /api/admin/stats — 平台统计总览
router.get('/stats', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      newUsersToday,
      newUsersWeek,
      totalPosts,
      newPostsWeek,
      totalComments,
      totalColab,
      activeColab,
      totalRooms,
      totalMessages,
      topUsers,
      userGrowth,
      recentUsers,
    ] = await Promise.all([
      db.execute("SELECT COUNT(*) as cnt FROM users"),
      db.execute("SELECT COUNT(*) as cnt FROM users WHERE DATE(created_at) = DATE('now','localtime')"),
      db.execute("SELECT COUNT(*) as cnt FROM users WHERE created_at >= DATE('now','-7 days','localtime')"),
      db.execute("SELECT COUNT(*) as cnt FROM posts"),
      db.execute("SELECT COUNT(*) as cnt FROM posts WHERE created_at >= DATE('now','-7 days','localtime')"),
      db.execute("SELECT COUNT(*) as cnt FROM comments"),
      db.execute("SELECT COUNT(*) as cnt FROM colab_projects"),
      db.execute("SELECT COUNT(*) as cnt FROM colab_projects WHERE status = 'active'"),
      db.execute("SELECT COUNT(*) as cnt FROM chat_rooms"),
      db.execute("SELECT COUNT(*) as cnt FROM room_messages"),
      db.execute("SELECT id, username, avatar, lingjing_points, role, created_at FROM users WHERE role != 'admin' ORDER BY lingjing_points DESC LIMIT 10"),
      db.execute(`
        SELECT DATE(created_at,'localtime') as day, COUNT(*) as cnt
        FROM users
        WHERE created_at >= DATE('now','-6 days','localtime')
        GROUP BY day ORDER BY day ASC
      `),
      db.execute("SELECT id, username, email, role, lingjing_points, created_at FROM users ORDER BY created_at DESC LIMIT 20"),
    ]);

    res.json({
      overview: {
        totalUsers:    (totalUsers.rows[0] as any).cnt,
        newUsersToday: (newUsersToday.rows[0] as any).cnt,
        newUsersWeek:  (newUsersWeek.rows[0] as any).cnt,
        totalPosts:    (totalPosts.rows[0] as any).cnt,
        newPostsWeek:  (newPostsWeek.rows[0] as any).cnt,
        totalComments: (totalComments.rows[0] as any).cnt,
        totalColab:    (totalColab.rows[0] as any).cnt,
        activeColab:   (activeColab.rows[0] as any).cnt,
        totalRooms:    (totalRooms.rows[0] as any).cnt,
        totalMessages: (totalMessages.rows[0] as any).cnt,
      },
      topUsers:    topUsers.rows,
      userGrowth:  userGrowth.rows,
      recentUsers: recentUsers.rows,
    });
  } catch (err) {
    console.error('[admin stats]', err);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// DELETE /api/admin/users/:id — 删除用户（管理员操作）
router.delete('/users/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (Number(id) === req.user!.id) {
    res.status(400).json({ error: '不能删除自己的账号' });
    return;
  }
  try {
    await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
    res.json({ message: '用户已删除' });
  } catch (err) {
    res.status(500).json({ error: '删除失败' });
  }
});

// PATCH /api/admin/users/:id/role — 修改用户角色
router.patch('/users/:id/role', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['admin', 'user'].includes(role)) {
    res.status(400).json({ error: '无效角色' });
    return;
  }
  try {
    await db.execute({ sql: 'UPDATE users SET role = ? WHERE id = ?', args: [role, id] });
    res.json({ message: '角色已更新' });
  } catch (err) {
    res.status(500).json({ error: '更新失败' });
  }
});

// GET /api/admin/posts — 管理员查看所有帖子（含作者信息）
router.get('/posts', authMiddleware, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: `SELECT p.id, p.title, p.content, p.likes_count, p.comments_count, p.created_at,
               u.id as author_id, u.username as author_name, u.avatar as author_avatar
            FROM posts p JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC LIMIT 100`,
      args: []
    });
    res.json({ posts: result.rows });
  } catch (err) {
    res.status(500).json({ error: '获取帖子失败' });
  }
});

// POST /api/admin/posts/:id/reward — 给帖子作者发放灵创值奖励
router.post('/posts/:id/reward', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { amount, reason } = req.body;
  if (!amount || Number(amount) <= 0 || Number(amount) > 10000) {
    res.status(400).json({ error: '奖励金额无效（1-10000）' });
    return;
  }
  const pts = Math.floor(Number(amount));
  const note = String(reason || '管理员优质内容奖励').slice(0, 100);

  try {
    const postResult = await db.execute({ sql: 'SELECT user_id FROM posts WHERE id = ?', args: [id] });
    if (!postResult.rows.length) {
      res.status(404).json({ error: '帖子不存在' });
      return;
    }
    const authorId = Number((postResult.rows[0] as any).user_id);

    await db.execute({ sql: 'UPDATE users SET lingjing_points = lingjing_points + ? WHERE id = ?', args: [pts, authorId] });
    await db.execute({
      sql: "INSERT INTO points_history (user_id, amount, reason, related_type, related_id) VALUES (?, ?, ?, ?, ?)",
      args: [authorId, pts, note, 'post', Number(id)]
    });
    res.json({ success: true, points_awarded: pts });
  } catch (err) {
    res.status(500).json({ error: '发放奖励失败' });
  }
});

// ── 充值套餐管理 ───────────────────────────────────────

// GET /api/admin/packages — 所有套餐（含下架）
router.get('/packages', authMiddleware, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM recharge_packages ORDER BY sort_order ASC, price ASC', args: [] });
    res.json({ packages: result.rows });
  } catch (err) {
    res.status(500).json({ error: '获取套餐失败' });
  }
});

// POST /api/admin/packages — 新建套餐
router.post('/packages', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  const { name, points, price, description, sort_order } = req.body;
  if (!name || !points || !price || Number(points) <= 0 || Number(price) <= 0) {
    res.status(400).json({ error: '套餐名称、灵创值和价格均为必填且须大于0' });
    return;
  }
  try {
    await db.execute({
      sql: 'INSERT INTO recharge_packages (name, points, price, description, sort_order) VALUES (?, ?, ?, ?, ?)',
      args: [String(name), Math.floor(Number(points)), Number(price), String(description || ''), Number(sort_order || 0)]
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '创建套餐失败' });
  }
});

// PUT /api/admin/packages/:id — 更新套餐
router.put('/packages/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, points, price, description, is_active, sort_order } = req.body;
  try {
    await db.execute({
      sql: `UPDATE recharge_packages SET name=?, points=?, price=?, description=?, is_active=?, sort_order=?,
            updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      args: [String(name), Math.floor(Number(points)), Number(price), String(description || ''),
             is_active ? 1 : 0, Number(sort_order || 0), id]
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '更新套餐失败' });
  }
});

// DELETE /api/admin/packages/:id — 删除套餐
router.delete('/packages/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    // 先把引用该套餐的订单 package_id 置 NULL，避免外键约束冲突
    await db.execute({ sql: 'UPDATE recharge_orders SET package_id = NULL WHERE package_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM recharge_packages WHERE id = ?', args: [id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除失败' });
  }
});

// GET /api/admin/export-dataset — 导出生产数据库供本地 GNN 训练使用
router.get('/export-dataset', authMiddleware, adminOnly, async (_req: AuthRequest, res: Response) => {
  const fs = await import('fs');
  const dbPath = path.resolve(process.env.DB_PATH || './data/lingjing.db');

  if (!fs.existsSync(dbPath)) {
    res.status(404).json({ error: '数据库文件不存在' });
    return;
  }

  const stat = fs.statSync(dbPath);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `lingjing_dataset_${date}.db`;

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', String(stat.size));

  const stream = fs.createReadStream(dbPath);
  stream.on('error', (err) => {
    console.error('[export-dataset]', err);
    if (!res.headersSent) {
      res.status(500).json({ error: '读取数据库失败' });
    }
  });
  stream.pipe(res);
});

export default router;
