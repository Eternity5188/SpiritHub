import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/users/profile/:username
router.get('/profile/:username', async (req, res: Response) => {
  const { username } = req.params;

  try {
    const userResult = await db.execute({ sql: 'SELECT id, username, avatar, bio, lingjing_points, role, created_at, friend_code FROM users WHERE username = ?', args: [username] });
    const user = userResult.rows[0] as any;
    if (!user) { res.status(404).json({ error: '用户不存在' }); return; }

    const [postCountResult, colabCountResult, postsResult] = await Promise.all([
      db.execute({ sql: 'SELECT COUNT(*) as post_count FROM posts WHERE user_id = ?', args: [user.id] }),
      db.execute({ sql: 'SELECT COUNT(*) as colab_count FROM colab_members WHERE user_id = ?', args: [user.id] }),
      db.execute({ sql: 'SELECT id, title, likes_count, comments_count, created_at FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', args: [user.id] })
    ]);

    res.json({
      user,
      stats: {
        post_count: Number((postCountResult.rows[0] as any).post_count),
        colab_count: Number((colabCountResult.rows[0] as any).colab_count)
      },
      recentPosts: postsResult.rows
    });
  } catch (err) {
    console.error('获取用户资料失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/users/profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { bio, avatar } = req.body;

  try {
    await db.execute({ sql: 'UPDATE users SET bio = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [bio || '', avatar || null, req.user!.id] });
    res.json({ message: '个人资料更新成功' });
  } catch (err) {
    console.error('更新用户资料失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
