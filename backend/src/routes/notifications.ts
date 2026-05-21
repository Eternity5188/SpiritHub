import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/notifications — 获取当前用户通知（最近 50 条）
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      args: [req.user!.id],
    });
    const unreadRes = await db.execute({
      sql: 'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0',
      args: [req.user!.id],
    });
    res.json({
      notifications: result.rows,
      unread_count: Number((unreadRes.rows[0] as any).cnt),
    });
  } catch {
    res.status(500).json({ error: '获取通知失败' });
  }
});

// POST /api/notifications/read-all — 全部标为已读
router.post('/read-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.execute({
      sql: 'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      args: [req.user!.id],
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: '操作失败' });
  }
});

// POST /api/notifications/:id/read — 单条标为已读
router.post('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await db.execute({
      sql: 'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      args: [id, req.user!.id],
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: '操作失败' });
  }
});

export default router;

/**
 * 工具函数：在任意路由中创建通知（异步，失败静默）
 */
export async function createNotification(
  userId: number,
  type: string,
  title: string,
  body?: string,
  relatedType?: string,
  relatedId?: number,
): Promise<void> {
  try {
    await db.execute({
      sql: `INSERT INTO notifications (user_id, type, title, body, related_type, related_id)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [userId, type, title, body ?? null, relatedType ?? null, relatedId ?? null],
    });
  } catch (err) {
    console.error('[notification] 创建通知失败:', err);
  }
}
