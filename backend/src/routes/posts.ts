import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth';
import { createNotification } from './notifications';
import { logEvent, updateTagInterests } from '../utils/eventLogger';

const router = Router();

// GET /api/posts
router.get('/', async (req, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
  const offset = (page - 1) * limit;
  const tag = req.query.tag as string;
  const q = (req.query.q as string)?.trim();

  try {
    let sql = `SELECT p.id, p.title, p.content, p.tags, p.likes_count, p.views_count, p.comments_count, p.created_at,
               u.id as author_id, u.username as author_name, u.avatar as author_avatar, u.lingjing_points as author_points
               FROM posts p JOIN users u ON p.user_id = u.id`;
    const params: any[] = [];
    const conditions: string[] = [];

    if (tag) { conditions.push('p.tags LIKE ?'); params.push(`%"${tag}"%`); }
    if (q) { conditions.push('p.title LIKE ?'); params.push(`%${q}%`); }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const postsResult = await db.execute({ sql, args: params });
    const posts = postsResult.rows as any[];

    let countSql = 'SELECT COUNT(*) as total FROM posts p';
    const countParams: any[] = [];
    const countConditions: string[] = [];
    if (tag) { countConditions.push('p.tags LIKE ?'); countParams.push(`%"${tag}"%`); }
    if (q) { countConditions.push('p.title LIKE ?'); countParams.push(`%${q}%`); }
    if (countConditions.length > 0) countSql += ' WHERE ' + countConditions.join(' AND ');
    const countResult = await db.execute({ sql: countSql, args: countParams });
    const total = Number((countResult.rows[0] as any).total);

    res.json({
      posts: posts.map(p => ({
        ...p,
        tags: JSON.parse((p.tags as string) || '[]'),
        content: (p.content as string).slice(0, 200) + ((p.content as string).length > 200 ? '...' : '')
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('获取帖子列表失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/posts/:id
router.get('/:id', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id ?? null;
  try {
    const postResult = await db.execute({
      sql: 'SELECT p.*, u.username as author_name, u.avatar as author_avatar, u.lingjing_points as author_points FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?',
      args: [id]
    });
    const post = postResult.rows[0] as any;
    if (!post) { res.status(404).json({ error: '帖子不存在' }); return; }

    await db.execute({ sql: 'UPDATE posts SET views_count = views_count + 1 WHERE id = ?', args: [id] });

    // GNN: 记录浏览事件（user→post 边）
    const postTags: string[] = JSON.parse((post.tags as string) || '[]');
    const sessionId = (req.headers['x-session-id'] as string) || null;
    logEvent({ user_id: userId, event_type: 'post_view', target_type: 'post', target_id: Number(id), session_id: sessionId, metadata: { tags: postTags } });

    const commentsResult = await db.execute({
      sql: 'SELECT c.*, u.username, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC',
      args: [id]
    });

    let userLiked = false;
    if (userId) {
      const likedResult = await db.execute({ sql: 'SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?', args: [id, userId] });
      userLiked = likedResult.rows.length > 0;
    }

    res.json({
      post: { ...post, tags: JSON.parse((post.tags as string) || '[]'), user_liked: userLiked },
      comments: commentsResult.rows
    });
  } catch (err) {
    console.error('获取帖子详情失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/posts
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { title, content, tags = [] } = req.body;
  if (!title || !content) { res.status(400).json({ error: '标题和内容不能为空' }); return; }
  if (title.length > 100) { res.status(400).json({ error: '标题最多 100 个字符' }); return; }

  try {
    const result = await db.execute({
      sql: 'INSERT INTO posts (user_id, title, content, tags) VALUES (?, ?, ?, ?)',
      args: [req.user!.id, title, content, JSON.stringify(tags)]
    });
    const postId = Number(result.lastInsertRowid);

    await db.execute({ sql: 'UPDATE users SET lingjing_points = lingjing_points + 10 WHERE id = ?', args: [req.user!.id] });
    await db.execute({ sql: 'INSERT INTO points_history (user_id, amount, reason, related_type, related_id) VALUES (?, ?, ?, ?, ?)', args: [req.user!.id, 10, '发布社区帖子', 'post', postId] });

    // GNN: 记录发帖事件，更新标签兴趣权重
    logEvent({ user_id: req.user!.id, event_type: 'post_create', target_type: 'post', target_id: postId, metadata: { tags } });
    updateTagInterests(req.user!.id, Array.isArray(tags) ? tags : [], 'post_create');

    res.status(201).json({ message: '帖子发布成功，获得 10 灵创值！', postId });
  } catch (err) {
    console.error('创建帖子失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/posts/:id/like
router.post('/:id/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    const postResult = await db.execute({ sql: 'SELECT p.id, p.user_id, p.tags, u.role as author_role FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?', args: [id] });
    const post = postResult.rows[0] as any;
    if (!post) { res.status(404).json({ error: '帖子不存在' }); return; }

    const likedResult = await db.execute({ sql: 'SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?', args: [id, userId] });

    const likeTags: string[] = JSON.parse((post.tags as string) || '[]');
    if (likedResult.rows.length > 0) {
      await db.execute({ sql: 'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', args: [id, userId] });
      await db.execute({ sql: 'UPDATE posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?', args: [id] });
      // GNN: 记录取消点赞事件
      logEvent({ user_id: userId, event_type: 'post_unlike', target_type: 'post', target_id: Number(id), metadata: { tags: likeTags } });
      updateTagInterests(userId, likeTags, 'post_unlike');
      res.json({ liked: false, message: '已取消点赞' });
    } else {
      await db.execute({ sql: 'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', args: [id, userId] });
      await db.execute({ sql: 'UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?', args: [id] });
      // GNN: 记录点赞事件，更新标签兴趣权重
      logEvent({ user_id: userId, event_type: 'post_like', target_type: 'post', target_id: Number(id), metadata: { tags: likeTags } });
      updateTagInterests(userId, likeTags, 'post_like');
      if (Number(post.user_id) !== userId && post.author_role !== 'admin') {
        await db.execute({ sql: 'UPDATE users SET lingjing_points = lingjing_points + 2 WHERE id = ?', args: [post.user_id] });
        await db.execute({ sql: 'INSERT INTO points_history (user_id, amount, reason, related_type, related_id) VALUES (?, ?, ?, ?, ?)', args: [post.user_id, 2, '帖子被点赞', 'post', post.id] });
        createNotification(Number(post.user_id), 'like', '你的帖子被点赞了', `有人点赞了你的帖子`, 'post', post.id);
      }
      res.json({ liked: true, message: '点赞成功' });
    }
  } catch (err) {
    console.error('点赞操作失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/posts/:id/comments
router.post('/:id/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content || content.trim().length === 0) { res.status(400).json({ error: '评论内容不能为空' }); return; }

  try {
    const postResult = await db.execute({ sql: 'SELECT id, user_id, tags FROM posts WHERE id = ?', args: [id] });
    if (postResult.rows.length === 0) { res.status(404).json({ error: '帖子不存在' }); return; }

    const postRow = (postResult.rows[0] as any);
    const result = await db.execute({ sql: 'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)', args: [id, req.user!.id, content.trim()] });
    await db.execute({ sql: 'UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?', args: [id] });
    if (req.user!.role !== 'admin') {
      await db.execute({ sql: 'UPDATE users SET lingjing_points = lingjing_points + 3 WHERE id = ?', args: [req.user!.id] });
      await db.execute({ sql: 'INSERT INTO points_history (user_id, amount, reason, related_type, related_id) VALUES (?, ?, ?, ?, ?)', args: [req.user!.id, 3, '发表评论', 'comment', Number(result.lastInsertRowid)] });
    }
    if (postRow.user_id && Number(postRow.user_id) !== req.user!.id) {
      createNotification(Number(postRow.user_id), 'comment', '你的帖子有新评论', content.trim().slice(0, 80), 'post', Number(id));
    }

    // GNN: 记录评论事件，更新标签兴趣权重（评论是高参与度信号）
    const commentTags: string[] = JSON.parse((postRow.tags as string) || '[]');
    logEvent({ user_id: req.user!.id, event_type: 'post_comment', target_type: 'post', target_id: Number(id), metadata: { tags: commentTags, comment_len: content.trim().length } });
    updateTagInterests(req.user!.id, commentTags, 'post_comment');

    res.status(201).json({ message: '评论成功，获得 3 灵创值！', commentId: Number(result.lastInsertRowid) });
  } catch (err) {
    console.error('发表评论失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
