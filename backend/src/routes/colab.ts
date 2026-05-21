import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logEvent, updateTagInterests } from '../utils/eventLogger';

const router = Router();

// GET /api/colab
router.get('/', async (req, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
  const offset = (page - 1) * limit;
  const status = req.query.status as string;

  try {
    let sql = 'SELECT cp.*, u.username as creator_name, u.avatar as creator_avatar FROM colab_projects cp JOIN users u ON cp.creator_id = u.id';
    const params: any[] = [];
    if (status && ['recruiting', 'active', 'completed'].includes(status)) {
      sql += ' WHERE cp.status = ?'; params.push(status);
    }
    sql += ' ORDER BY cp.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const projectsResult = await db.execute({ sql, args: params });
    const countResult = await db.execute({ sql: status ? 'SELECT COUNT(*) as total FROM colab_projects WHERE status = ?' : 'SELECT COUNT(*) as total FROM colab_projects', args: status ? [status] : [] });
    const total = Number((countResult.rows[0] as any).total);

    res.json({
      projects: projectsResult.rows.map((p: any) => ({ ...p, tags: JSON.parse((p.tags as string) || '[]') })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('获取 CoLab 项目列表失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/colab/:id
router.get('/:id', async (req, res: Response) => {
  const { id } = req.params;
  try {
    const projectResult = await db.execute({ sql: 'SELECT cp.*, u.username as creator_name, u.avatar as creator_avatar FROM colab_projects cp JOIN users u ON cp.creator_id = u.id WHERE cp.id = ?', args: [id] });
    const project = projectResult.rows[0] as any;
    if (!project) { res.status(404).json({ error: '项目不存在' }); return; }

    const membersResult = await db.execute({ sql: 'SELECT cm.role, cm.joined_at, u.id, u.username, u.avatar, u.lingjing_points FROM colab_members cm JOIN users u ON cm.user_id = u.id WHERE cm.project_id = ? ORDER BY cm.joined_at ASC', args: [id] });

    res.json({ project: { ...project, tags: JSON.parse((project.tags as string) || '[]') }, members: membersResult.rows });
  } catch (err) {
    console.error('获取项目详情失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/colab
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, description, max_members = 5, tags = [] } = req.body;
  if (!name) { res.status(400).json({ error: '项目名称不能为空' }); return; }
  if (max_members < 2 || max_members > 20) { res.status(400).json({ error: '团队人数应在 2-20 之间' }); return; }

  try {
    const result = await db.execute({ sql: 'INSERT INTO colab_projects (creator_id, name, description, max_members, tags) VALUES (?, ?, ?, ?, ?)', args: [req.user!.id, name, description || '', max_members, JSON.stringify(tags)] });
    const projectId = Number(result.lastInsertRowid);

    await db.execute({ sql: 'INSERT INTO colab_members (project_id, user_id, role) VALUES (?, ?, ?)', args: [projectId, req.user!.id, 'creator'] });
    if (req.user!.role !== 'admin') {
      await db.execute({ sql: 'UPDATE users SET lingjing_points = lingjing_points + 20 WHERE id = ?', args: [req.user!.id] });
      await db.execute({ sql: 'INSERT INTO points_history (user_id, amount, reason, related_type, related_id) VALUES (?, ?, ?, ?, ?)', args: [req.user!.id, 20, '创建 CoLab 项目', 'colab', projectId] });
    }

    // GNN: 记录创建项目事件，更新标签兴趣权重
    logEvent({ user_id: req.user!.id, event_type: 'colab_create', target_type: 'colab', target_id: projectId, metadata: { tags } });
    updateTagInterests(req.user!.id, Array.isArray(tags) ? tags : [], 'colab_join');

    res.status(201).json({ message: '项目创建成功，获得 20 灵创值！', projectId });
  } catch (err) {
    console.error('创建项目失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/colab/:id/join
router.post('/:id/join', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    const projectResult = await db.execute({ sql: 'SELECT * FROM colab_projects WHERE id = ?', args: [id] });
    const project = projectResult.rows[0] as any;
    if (!project) { res.status(404).json({ error: '项目不存在' }); return; }
    if (project.status !== 'recruiting') { res.status(400).json({ error: '该项目已不再招募成员' }); return; }
    if (Number(project.current_members) >= Number(project.max_members)) { res.status(400).json({ error: '项目成员已满' }); return; }

    const memberResult = await db.execute({ sql: 'SELECT 1 FROM colab_members WHERE project_id = ? AND user_id = ?', args: [id, userId] });
    if (memberResult.rows.length > 0) { res.status(409).json({ error: '您已经是该项目的成员' }); return; }

    await db.execute({ sql: 'INSERT INTO colab_members (project_id, user_id, role) VALUES (?, ?, ?)', args: [id, userId, 'member'] });
    await db.execute({ sql: 'UPDATE colab_projects SET current_members = current_members + 1 WHERE id = ?', args: [id] });

    if (Number(project.current_members) + 1 >= Number(project.max_members)) {
      await db.execute({ sql: "UPDATE colab_projects SET status = 'active' WHERE id = ?", args: [id] });
    }

    if (req.user!.role !== 'admin') {
      await db.execute({ sql: 'UPDATE users SET lingjing_points = lingjing_points + 5 WHERE id = ?', args: [userId] });
      await db.execute({ sql: 'INSERT INTO points_history (user_id, amount, reason, related_type, related_id) VALUES (?, ?, ?, ?, ?)', args: [userId, 5, '加入 CoLab 项目', 'colab', id] });
    }

    // GNN: 记录加入项目事件，更新标签兴趣权重
    const projectTags: string[] = JSON.parse((project.tags as string) || '[]');
    logEvent({ user_id: userId, event_type: 'colab_join', target_type: 'colab', target_id: Number(id), metadata: { tags: projectTags } });
    updateTagInterests(userId, projectTags, 'colab_join');

    res.json({ message: '加入项目成功，获得 5 灵创值！' });
  } catch (err) {
    console.error('加入项目失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// PUT /api/colab/:id/status
router.put('/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['recruiting', 'active', 'completed'].includes(status)) { res.status(400).json({ error: '状态值无效' }); return; }

  try {
    const projectResult = await db.execute({ sql: 'SELECT * FROM colab_projects WHERE id = ?', args: [id] });
    const project = projectResult.rows[0] as any;
    if (!project) { res.status(404).json({ error: '项目不存在' }); return; }
    if (Number(project.creator_id) !== req.user!.id && req.user!.role !== 'admin') { res.status(403).json({ error: '只有项目创建者才能修改项目状态' }); return; }

    await db.execute({ sql: 'UPDATE colab_projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [status, id] });

    if (status === 'completed') {
      const membersResult = await db.execute({ sql: "SELECT cm.user_id FROM colab_members cm JOIN users u ON cm.user_id = u.id WHERE cm.project_id = ? AND u.role != 'admin'", args: [id] });
      for (const m of membersResult.rows as any[]) {
        await db.execute({ sql: 'UPDATE users SET lingjing_points = lingjing_points + 50 WHERE id = ?', args: [m.user_id] });
        await db.execute({ sql: 'INSERT INTO points_history (user_id, amount, reason, related_type, related_id) VALUES (?, ?, ?, ?, ?)', args: [m.user_id, 50, 'CoLab 项目完成奖励', 'colab', id] });
      }
    }

    res.json({ message: '项目状态更新成功' });
  } catch (err) {
    console.error('更新项目状态失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
