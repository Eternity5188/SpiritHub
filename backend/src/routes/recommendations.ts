import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/recommendations/friends
 * 返回当前用户的 GNN 好友推荐列表（top-10）
 * 若推荐表为空（尚未运行 train.py），则返回 []
 */
router.get('/friends', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    // 先检查推荐表是否存在并有数据
    const check = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='friend_recommendations'`,
      args: []
    });
    const tableExists = Number((check.rows[0] as any).cnt) > 0;
    if (!tableExists) {
      res.json({ recommendations: [], ready: false });
      return;
    }

    const result = await db.execute({
      sql: `SELECT u.id, u.username, u.avatar, u.bio, u.lingjing_points, u.friend_code,
                   fr.score
            FROM friend_recommendations fr
            JOIN users u ON u.id = fr.rec_user_id
            WHERE fr.user_id = ?
            ORDER BY fr.score DESC
            LIMIT 10`,
      args: [userId]
    });
    res.json({ recommendations: result.rows, ready: true });
  } catch (err) {
    console.error('获取好友推荐失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/recommendations/posts
 * 返回当前用户的 GNN 帖子推荐列表（top-10）
 */
router.get('/posts', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    const check = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='post_recommendations'`,
      args: []
    });
    const tableExists = Number((check.rows[0] as any).cnt) > 0;
    if (!tableExists) {
      res.json({ recommendations: [], ready: false });
      return;
    }

    const result = await db.execute({
      sql: `SELECT p.id, p.title, p.content, p.tags, p.likes_count, p.views_count,
                   p.comments_count, p.created_at,
                   u.id as author_id, u.username as author_name, u.avatar as author_avatar,
                   pr.score
            FROM post_recommendations pr
            JOIN posts p ON p.id = pr.post_id
            JOIN users u ON u.id = p.user_id
            WHERE pr.user_id = ?
            ORDER BY pr.score DESC
            LIMIT 10`,
      args: [userId]
    });
    res.json({ recommendations: result.rows, ready: true });
  } catch (err) {
    console.error('获取帖子推荐失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
