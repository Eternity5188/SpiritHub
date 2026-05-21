import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createNotification } from './notifications';
import { logEvent } from '../utils/eventLogger';

const router = Router();

// GET /api/friends — 获取好友列表
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    const result = await db.execute({
      sql: `SELECT u.id, u.username, u.avatar, u.bio, u.lingjing_points,
              f.id as friendship_id, f.created_at as friend_since
            FROM friendships f
            JOIN users u ON (
              CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END = u.id
            )
            WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
            ORDER BY u.username`,
      args: [userId, userId, userId]
    });
    res.json({ friends: result.rows });
  } catch (err) {
    console.error('获取好友列表失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/friends/requests — 获取待处理的好友申请
router.get('/requests', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    const received = await db.execute({
      sql: `SELECT f.id, f.created_at, u.id as user_id, u.username, u.avatar, u.lingjing_points
            FROM friendships f JOIN users u ON f.requester_id = u.id
            WHERE f.addressee_id = ? AND f.status = 'pending'
            ORDER BY f.created_at DESC`,
      args: [userId]
    });
    const sent = await db.execute({
      sql: `SELECT f.id, f.created_at, u.id as user_id, u.username, u.avatar, u.lingjing_points
            FROM friendships f JOIN users u ON f.addressee_id = u.id
            WHERE f.requester_id = ? AND f.status = 'pending'
            ORDER BY f.created_at DESC`,
      args: [userId]
    });
    res.json({ received: received.rows, sent: sent.rows });
  } catch (err) {
    console.error('获取好友申请失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/friends/request/:username — 发送好友申请
router.post('/request/:username', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { username } = req.params;
  const requesterId = req.user!.id;

  try {
    const targetResult = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [username] });
    const target = targetResult.rows[0] as any;
    if (!target) { res.status(404).json({ error: '用户不存在' }); return; }
    if (Number(target.id) === requesterId) { res.status(400).json({ error: '不能添加自己为好友' }); return; }

    // 检查是否已有关系
    const existing = await db.execute({
      sql: 'SELECT id, status FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)',
      args: [requesterId, target.id, target.id, requesterId]
    });
    if (existing.rows.length > 0) {
      const rel = existing.rows[0] as any;
      if (rel.status === 'accepted') { res.status(409).json({ error: '你们已经是好友了' }); return; }
      if (rel.status === 'pending') { res.status(409).json({ error: '好友申请已发送，等待对方确认' }); return; }
    }

    await db.execute({
      sql: 'INSERT OR REPLACE INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, ?)',
      args: [requesterId, target.id, 'pending']
    });
    createNotification(Number(target.id), 'friend_request', '你有一条好友申请', `${req.user!.username} 想加你为好友`, 'user', requesterId);
    // GNN: 记录好友申请事件（user→user 有向边）
    logEvent({ user_id: requesterId, event_type: 'friend_request', target_type: 'user', target_id: Number(target.id) });
    res.json({ message: '好友申请已发送' });
  } catch (err) {
    console.error('发送好友申请失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/friends/accept/:id — 接受好友申请
router.post('/accept/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  try {
    const result = await db.execute({ sql: 'SELECT * FROM friendships WHERE id = ? AND addressee_id = ? AND status = ?', args: [id, userId, 'pending'] });
    if (result.rows.length === 0) { res.status(404).json({ error: '申请不存在' }); return; }

    await db.execute({ sql: "UPDATE friendships SET status = 'accepted' WHERE id = ?", args: [id] });
    // GNN: 记录好友接受事件（双向边确认）
    const fr = result.rows[0] as any;
    logEvent({ user_id: userId, event_type: 'friend_accept', target_type: 'user', target_id: Number(fr.requester_id) });
    res.json({ message: '已接受好友申请' });
  } catch (err) {
    console.error('接受好友申请失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/friends/reject/:id — 拒绝好友申请
router.post('/reject/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  try {
    await db.execute({ sql: "UPDATE friendships SET status = 'rejected' WHERE id = ? AND addressee_id = ?", args: [id, userId] });
    res.json({ message: '已拒绝好友申请' });
  } catch (err) {
    console.error('拒绝好友申请失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /api/friends/:userId — 删除好友
router.delete('/:friendId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { friendId } = req.params;

  try {
    await db.execute({
      sql: "DELETE FROM friendships WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)) AND status = 'accepted'",
      args: [userId, friendId, friendId, userId]
    });
    res.json({ message: '已删除好友' });
  } catch (err) {
    console.error('删除好友失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/friends/search?q=xxx — 搜索用户（支持用户名和唯一ID）
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string || '').trim();
  if (!q || q.length < 1) { res.json({ users: [] }); return; }
  const userId = req.user!.id;

  try {
    const result = await db.execute({
      sql: `SELECT u.id, u.username, u.avatar, u.lingjing_points, u.friend_code,
              f.status as friendship_status,
              CASE WHEN f.requester_id = ? THEN 'sent' WHEN f.addressee_id = ? THEN 'received' ELSE NULL END as my_role
            FROM users u
            LEFT JOIN friendships f ON (
              (f.requester_id = ? AND f.addressee_id = u.id) OR
              (f.requester_id = u.id AND f.addressee_id = ?)
            )
            WHERE (u.username LIKE ? OR u.friend_code = ?) AND u.id != ?
            LIMIT 20`,
      args: [userId, userId, userId, userId, `%${q}%`, q.toUpperCase(), userId]
    });
    res.json({ users: result.rows });
  } catch (err) {
    console.error('搜索用户失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/friends/messages/:username — 获取与某用户的私信历史
router.get('/messages/:username', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { username } = req.params;

  try {
    const targetResult = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [username] });
    const target = targetResult.rows[0] as any;
    if (!target) { res.status(404).json({ error: '用户不存在' }); return; }

    // 标记为已读
    await db.execute({
      sql: 'UPDATE private_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?',
      args: [target.id, userId]
    });

    const messages = await db.execute({
      sql: `SELECT pm.*, u.username as sender_name, u.avatar as sender_avatar
            FROM private_messages pm JOIN users u ON pm.sender_id = u.id
            WHERE (pm.sender_id = ? AND pm.receiver_id = ?) OR (pm.sender_id = ? AND pm.receiver_id = ?)
            ORDER BY pm.created_at ASC LIMIT 100`,
      args: [userId, target.id, target.id, userId]
    });
    res.json({ messages: messages.rows });
  } catch (err) {
    console.error('获取私信历史失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/friends/unread — 获取未读消息数
router.get('/unread', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    const result = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM private_messages WHERE receiver_id = ? AND is_read = 0',
      args: [userId]
    });
    const pendingResult = await db.execute({
      sql: "SELECT COUNT(*) as count FROM friendships WHERE addressee_id = ? AND status = 'pending'",
      args: [userId]
    });
    res.json({
      unread_messages: Number((result.rows[0] as any).count),
      pending_requests: Number((pendingResult.rows[0] as any).count)
    });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
