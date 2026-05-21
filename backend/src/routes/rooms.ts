import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getIo } from '../socketInstance';

const router = Router();

// GET /api/rooms — 获取所有聊天室（附带成员数、是否已加入）
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    const result = await db.execute({
      sql: `SELECT cr.id, cr.name, cr.description, cr.community, cr.created_at,
              u.username as owner_name, u.id as owner_id,
              (SELECT COUNT(*) FROM chat_room_members m WHERE m.room_id = cr.id) as member_count,
              (SELECT COUNT(*) FROM chat_room_members m WHERE m.room_id = cr.id AND m.user_id = ?) as is_joined
            FROM chat_rooms cr JOIN users u ON cr.owner_id = u.id
            ORDER BY cr.created_at DESC`,
      args: [userId]
    });
    res.json({ rooms: result.rows });
  } catch (err) {
    console.error('获取聊天室列表失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/rooms — 创建聊天室
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, description, community } = req.body;

  if (!name || name.trim().length < 2) { res.status(400).json({ error: '聊天室名称至少 2 个字符' }); return; }
  if (!community) { res.status(400).json({ error: '请选择所属社区' }); return; }

  try {
    const result = await db.execute({
      sql: 'INSERT INTO chat_rooms (name, description, community, owner_id) VALUES (?, ?, ?, ?)',
      args: [name.trim().slice(0, 30), (description || '').trim().slice(0, 100), community, userId]
    });
    const roomId = Number(result.lastInsertRowid);
    // 创建者自动加入
    await db.execute({ sql: 'INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)', args: [roomId, userId] });
    res.status(201).json({ message: '聊天室创建成功', room_id: roomId });
  } catch (err) {
    console.error('创建聊天室失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/rooms/:id — 获取聊天室详情（含成员列表）
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  try {
    const roomResult = await db.execute({
      sql: `SELECT cr.*, u.username as owner_name,
              (SELECT COUNT(*) FROM chat_room_members m WHERE m.room_id = cr.id) as member_count,
              (SELECT COUNT(*) FROM chat_room_members m WHERE m.room_id = cr.id AND m.user_id = ?) as is_joined
            FROM chat_rooms cr JOIN users u ON cr.owner_id = u.id WHERE cr.id = ?`,
      args: [userId, id]
    });
    if (roomResult.rows.length === 0) { res.status(404).json({ error: '聊天室不存在' }); return; }

    const membersResult = await db.execute({
      sql: `SELECT u.id, u.username, u.avatar, u.lingjing_points, m.joined_at
            FROM chat_room_members m JOIN users u ON m.user_id = u.id
            WHERE m.room_id = ? ORDER BY m.joined_at ASC`,
      args: [id]
    });
    res.json({ room: roomResult.rows[0], members: membersResult.rows });
  } catch (err) {
    console.error('获取聊天室详情失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/rooms/:id — 修改聊天室名称/描述（仅群主）
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name || name.trim().length < 2) { res.status(400).json({ error: '聊天室名称至少 2 个字符' }); return; }

  try {
    const roomResult = await db.execute({ sql: 'SELECT owner_id FROM chat_rooms WHERE id = ?', args: [id] });
    if (roomResult.rows.length === 0) { res.status(404).json({ error: '聊天室不存在' }); return; }
    if (Number((roomResult.rows[0] as any).owner_id) !== userId) { res.status(403).json({ error: '仅群主可修改聊天室信息' }); return; }

    await db.execute({
      sql: 'UPDATE chat_rooms SET name = ?, description = ? WHERE id = ?',
      args: [name.trim().slice(0, 30), (description || '').trim().slice(0, 100), id]
    });
    res.json({ message: '聊天室信息已更新' });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /api/rooms/:id — 解散聊天室（仅群主，官方大厅不可解散）
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  if (Number(id) === 1) { res.status(403).json({ error: '灵创大厅是官方聊天室，不可解散' }); return; }
  try {
    const roomResult = await db.execute({ sql: 'SELECT owner_id FROM chat_rooms WHERE id = ?', args: [id] });
    if (roomResult.rows.length === 0) { res.status(404).json({ error: '聊天室不存在' }); return; }
    if (Number((roomResult.rows[0] as any).owner_id) !== userId) { res.status(403).json({ error: '仅群主可解散聊天室' }); return; }

    // 先广播解散事件（在删除前，房间成员还在 socket room 中）
    getIo().to('room:' + id).emit('room_dissolved', { room_id: Number(id) });
    // 显式删除关联数据（确保无 CASCADE 时也能清理）
    await db.execute({ sql: 'DELETE FROM room_messages WHERE room_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM chat_room_members WHERE room_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM chat_rooms WHERE id = ?', args: [id] });
    res.json({ message: '聊天室已解散' });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/rooms/:id/join — 加入聊天室
router.post('/:id/join', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  try {
    const roomResult = await db.execute({ sql: 'SELECT id FROM chat_rooms WHERE id = ?', args: [id] });
    if (roomResult.rows.length === 0) { res.status(404).json({ error: '聊天室不存在' }); return; }

    await db.execute({ sql: 'INSERT OR IGNORE INTO chat_room_members (room_id, user_id) VALUES (?, ?)', args: [id, userId] });
    res.json({ message: '已加入聊天室' });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/rooms/:id/leave — 离开聊天室
router.post('/:id/leave', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  try {
    const roomResult = await db.execute({ sql: 'SELECT owner_id FROM chat_rooms WHERE id = ?', args: [id] });
    if (roomResult.rows.length === 0) { res.status(404).json({ error: '聊天室不存在' }); return; }
    if (Number((roomResult.rows[0] as any).owner_id) === userId) { res.status(400).json({ error: '群主不能直接离开，请先转让或解散聊天室' }); return; }

    await db.execute({ sql: 'DELETE FROM chat_room_members WHERE room_id = ? AND user_id = ?', args: [id, userId] });
    res.json({ message: '已离开聊天室' });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// DELETE /api/rooms/:id/members/:targetId — 踢出成员（仅群主）
router.delete('/:id/members/:targetId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const operatorId = req.user!.id;
  const { id, targetId } = req.params;
  try {
    const roomResult = await db.execute({ sql: 'SELECT owner_id FROM chat_rooms WHERE id = ?', args: [id] });
    if (roomResult.rows.length === 0) { res.status(404).json({ error: '聊天室不存在' }); return; }
    if (Number((roomResult.rows[0] as any).owner_id) !== operatorId) { res.status(403).json({ error: '仅群主可踢出成员' }); return; }
    if (Number(targetId) === operatorId) { res.status(400).json({ error: '不能踢出自己' }); return; }

    await db.execute({ sql: 'DELETE FROM chat_room_members WHERE room_id = ? AND user_id = ?', args: [id, targetId] });
    // 服务端直接广播踢出事件，无需客户端再次 emit
    getIo().to(`user:${targetId}`).emit('room_kicked', { room_id: Number(id) });
    res.json({ message: '已踢出该成员' });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/rooms/:id/messages — 获取历史消息
router.get('/:id/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  try {
    // 验证是否是成员
    const memberCheck = await db.execute({ sql: 'SELECT 1 FROM chat_room_members WHERE room_id = ? AND user_id = ?', args: [id, userId] });
    if (memberCheck.rows.length === 0) { res.status(403).json({ error: '请先加入聊天室' }); return; }

    const messages = await db.execute({
      sql: `SELECT rm.id, rm.content, rm.created_at, rm.room_id,
              u.id as user_id, u.username, u.avatar, u.lingjing_points
            FROM room_messages rm JOIN users u ON rm.user_id = u.id
            WHERE rm.room_id = ? ORDER BY rm.created_at DESC LIMIT ?`,
      args: [id, limit]
    });
    res.json({ messages: messages.rows.reverse() });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
