import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import OpenAI from 'openai';
import db from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ── 文件存储配置 ────────────────────────────────────────
const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持该文件类型，请上传 PDF、Word、图片、Excel 或纯文本文件'));
    }
  },
});

// ── AI 客户端 ───────────────────────────────────────────
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const ai = DASHSCOPE_API_KEY
  ? new OpenAI({
      apiKey: DASHSCOPE_API_KEY,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    })
  : null;

// ── 辅助：检查是否是科学组成员 ─────────────────────────
async function isMember(groupId: number, userId: number): Promise<boolean> {
  const r = await db.execute({
    sql: 'SELECT 1 FROM science_members WHERE group_id = ? AND user_id = ?',
    args: [groupId, userId],
  });
  return r.rows.length > 0;
}
async function isLead(groupId: number, userId: number): Promise<boolean> {
  const r = await db.execute({
    sql: "SELECT 1 FROM science_members WHERE group_id = ? AND user_id = ? AND role = 'lead'",
    args: [groupId, userId],
  });
  return r.rows.length > 0;
}

// ────────────────────────────────────────────────────────
// GET /api/science  — 列出所有科学组（公开）
// ────────────────────────────────────────────────────────
router.get('/', async (req, res: Response) => {
  try {
    const rows = await db.execute({
      sql: `SELECT sg.*, u.username as lead_name, u.avatar as lead_avatar
            FROM science_groups sg
            JOIN users u ON sg.lead_id = u.id
            ORDER BY sg.created_at DESC`,
      args: [],
    });
    res.json({ groups: rows.rows.map((g: any) => ({ ...g, tags: JSON.parse(g.tags || '[]') })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ────────────────────────────────────────────────────────
// GET /api/science/:id — 科学组详情（公开基本信息）
// ────────────────────────────────────────────────────────
router.get('/:id', async (req, res: Response) => {
  const id = Number(req.params.id);
  try {
    const gRes = await db.execute({
      sql: `SELECT sg.*, u.username as lead_name, u.avatar as lead_avatar
            FROM science_groups sg JOIN users u ON sg.lead_id = u.id WHERE sg.id = ?`,
      args: [id],
    });
    if (!gRes.rows.length) { res.status(404).json({ error: '科学组不存在' }); return; }
    const group = gRes.rows[0] as any;

    const membersRes = await db.execute({
      sql: `SELECT sm.role, sm.joined_at, u.id, u.username, u.avatar, u.lingjing_points
            FROM science_members sm JOIN users u ON sm.user_id = u.id
            WHERE sm.group_id = ? ORDER BY sm.joined_at ASC`,
      args: [id],
    });

    res.json({
      group: { ...group, tags: JSON.parse(group.tags || '[]') },
      members: membersRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ────────────────────────────────────────────────────────
// POST /api/science — 创建科学组（仅管理员）
// ────────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') { res.status(403).json({ error: '仅管理员可创建科学组' }); return; }
  const { name, description = '', research_domain, max_members = 12, tags = [] } = req.body;
  if (!name || !research_domain) { res.status(400).json({ error: '请填写科学组名称和研究领域' }); return; }
  try {
    const r = await db.execute({
      sql: 'INSERT INTO science_groups (name, description, research_domain, lead_id, max_members, tags) VALUES (?,?,?,?,?,?)',
      args: [name, description, research_domain, req.user!.id, max_members, JSON.stringify(tags)],
    });
    const gId = Number(r.lastInsertRowid);
    await db.execute({ sql: "INSERT INTO science_members (group_id, user_id, role) VALUES (?,?,'lead')", args: [gId, req.user!.id] });
    res.status(201).json({ message: '科学组创建成功', groupId: gId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建失败' });
  }
});

// ────────────────────────────────────────────────────────
// POST /api/science/:id/apply — 申请加入
// ────────────────────────────────────────────────────────
router.post('/:id/apply', authMiddleware, async (req: AuthRequest, res: Response) => {
  const groupId = Number(req.params.id);
  const userId = req.user!.id;
  const { statement, research_background = '' } = req.body;
  if (!statement || statement.trim().length < 20) {
    res.status(400).json({ error: '申请理由至少 20 个字' }); return;
  }
  try {
    const gRes = await db.execute({ sql: 'SELECT * FROM science_groups WHERE id = ?', args: [groupId] });
    if (!gRes.rows.length) { res.status(404).json({ error: '科学组不存在' }); return; }
    const group = gRes.rows[0] as any;
    if (group.status === 'closed') { res.status(400).json({ error: '该科学组已关闭申请' }); return; }

    // 已是成员？
    if (await isMember(groupId, userId)) { res.status(400).json({ error: '您已是该科学组成员' }); return; }

    await db.execute({
      sql: 'INSERT OR REPLACE INTO science_applications (group_id, user_id, statement, research_background) VALUES (?,?,?,?)',
      args: [groupId, userId, statement.trim(), research_background.trim()],
    });
    res.json({ message: '申请已提交，等待组长审核' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '申请提交失败' });
  }
});

// ────────────────────────────────────────────────────────
// GET /api/science/:id/applications — 待审申请（组长）
// ────────────────────────────────────────────────────────
router.get('/:id/applications', authMiddleware, async (req: AuthRequest, res: Response) => {
  const groupId = Number(req.params.id);
  if (!(await isLead(groupId, req.user!.id)) && req.user!.role !== 'admin') {
    res.status(403).json({ error: '无权限' }); return;
  }
  try {
    const r = await db.execute({
      sql: `SELECT sa.*, u.username, u.avatar, u.lingjing_points
            FROM science_applications sa JOIN users u ON sa.user_id = u.id
            WHERE sa.group_id = ? ORDER BY sa.created_at DESC`,
      args: [groupId],
    });
    res.json({ applications: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取申请列表失败' });
  }
});

// ────────────────────────────────────────────────────────
// POST /api/science/:id/applications/:appId/review — 审核
// ────────────────────────────────────────────────────────
router.post('/:id/applications/:appId/review', authMiddleware, async (req: AuthRequest, res: Response) => {
  const groupId = Number(req.params.id);
  const appId = Number(req.params.appId);
  const { action, reviewer_note = '' } = req.body; // action: 'approve' | 'reject'
  if (!['approve', 'reject'].includes(action)) { res.status(400).json({ error: '无效操作' }); return; }
  if (!(await isLead(groupId, req.user!.id)) && req.user!.role !== 'admin') {
    res.status(403).json({ error: '无权限' }); return;
  }
  try {
    const appRes = await db.execute({ sql: 'SELECT * FROM science_applications WHERE id = ? AND group_id = ?', args: [appId, groupId] });
    if (!appRes.rows.length) { res.status(404).json({ error: '申请不存在' }); return; }
    const app = appRes.rows[0] as any;
    if (app.status !== 'pending') { res.status(400).json({ error: '该申请已处理' }); return; }

    const status = action === 'approve' ? 'approved' : 'rejected';
    await db.execute({
      sql: 'UPDATE science_applications SET status = ?, reviewer_note = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [status, reviewer_note, appId],
    });

    if (action === 'approve') {
      // 检查名额
      const gRes = await db.execute({ sql: 'SELECT * FROM science_groups WHERE id = ?', args: [groupId] });
      const group = gRes.rows[0] as any;
      if (group.current_members >= group.max_members) {
        res.status(400).json({ error: '成员名额已满' }); return;
      }
      await db.execute({ sql: "INSERT OR IGNORE INTO science_members (group_id, user_id, role) VALUES (?,?,'member')", args: [groupId, app.user_id] });
      await db.execute({ sql: 'UPDATE science_groups SET current_members = current_members + 1 WHERE id = ?', args: [groupId] });
      // 奖励积分
      await db.execute({ sql: 'UPDATE users SET lingjing_points = lingjing_points + 30 WHERE id = ?', args: [app.user_id] });
      await db.execute({
        sql: "INSERT INTO points_history (user_id, amount, reason, related_type, related_id) VALUES (?,?,?,?,?)",
        args: [app.user_id, 30, '通过科学组审核入组', 'science', groupId],
      });
    }
    res.json({ message: action === 'approve' ? '已批准申请' : '已拒绝申请' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '审核失败' });
  }
});

// ────────────────────────────────────────────────────────
// GET /api/science/:id/files — 知识库文件列表（成员）
// ────────────────────────────────────────────────────────
router.get('/:id/files', authMiddleware, async (req: AuthRequest, res: Response) => {
  const groupId = Number(req.params.id);
  if (!(await isMember(groupId, req.user!.id)) && req.user!.role !== 'admin') {
    res.status(403).json({ error: '请先加入科学组' }); return;
  }
  try {
    const r = await db.execute({
      sql: `SELECT sf.*, u.username as uploader_name, u.avatar as uploader_avatar
            FROM science_files sf JOIN users u ON sf.uploader_id = u.id
            WHERE sf.group_id = ? ORDER BY sf.created_at DESC`,
      args: [groupId],
    });
    res.json({ files: r.rows.map((f: any) => ({ ...f, market_tags: JSON.parse(f.market_tags || '[]') })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取文件列表失败' });
  }
});

// ────────────────────────────────────────────────────────
// POST /api/science/:id/files — 上传文件（成员）
// ────────────────────────────────────────────────────────
router.post('/:id/files', authMiddleware, async (req: AuthRequest, res: Response) => {
  const groupId = Number(req.params.id);
  if (!(await isMember(groupId, req.user!.id)) && req.user!.role !== 'admin') {
    res.status(403).json({ error: '请先加入科学组' }); return;
  }
  upload.single('file')(req as any, res as any, async (err: any) => {
    if (err) { res.status(400).json({ error: err.message || '文件上传失败' }); return; }
    const file = (req as any).file;
    if (!file) { res.status(400).json({ error: '请选择文件' }); return; }
    const { display_title = '', description = '', category = '未分类', market_tags = '[]' } = req.body;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    try {
      const r = await db.execute({
        sql: 'INSERT INTO science_files (group_id, uploader_id, original_name, stored_name, file_type, file_size, display_title, description, category, market_tags) VALUES (?,?,?,?,?,?,?,?,?,?)',
        args: [groupId, req.user!.id, file.originalname, file.filename, ext, file.size, display_title || file.originalname, description, category, market_tags],
      });
      // 积分奖励
      await db.execute({ sql: 'UPDATE users SET lingjing_points = lingjing_points + 10 WHERE id = ?', args: [req.user!.id] });
      await db.execute({
        sql: "INSERT INTO points_history (user_id, amount, reason, related_type, related_id) VALUES (?,?,?,?,?)",
        args: [req.user!.id, 10, '上传科学组研究文件', 'science', groupId],
      });
      res.status(201).json({ message: '文件上传成功，获得 10 灵创值！', fileId: Number(r.lastInsertRowid) });
    } catch (dbErr) {
      fs.unlink(path.join(UPLOADS_DIR, file.filename), () => {});
      console.error(dbErr);
      res.status(500).json({ error: '文件记录保存失败' });
    }
  });
});

// ────────────────────────────────────────────────────────
// GET /api/science/:id/files/:fileId/download — 下载文件
// ────────────────────────────────────────────────────────
router.get('/:id/files/:fileId/download', authMiddleware, async (req: AuthRequest, res: Response) => {
  const groupId = Number(req.params.id);
  const fileId = Number(req.params.fileId);
  if (!(await isMember(groupId, req.user!.id)) && req.user!.role !== 'admin') {
    res.status(403).json({ error: '请先加入科学组' }); return;
  }
  try {
    const fRes = await db.execute({ sql: 'SELECT * FROM science_files WHERE id = ? AND group_id = ?', args: [fileId, groupId] });
    if (!fRes.rows.length) { res.status(404).json({ error: '文件不存在' }); return; }
    const f = fRes.rows[0] as any;
    const filePath = path.join(UPLOADS_DIR, f.stored_name);
    if (!fs.existsSync(filePath)) { res.status(404).json({ error: '文件已被删除' }); return; }
    res.download(filePath, f.original_name);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '下载失败' });
  }
});

// ────────────────────────────────────────────────────────
// DELETE /api/science/:id/files/:fileId — 删除文件
// ────────────────────────────────────────────────────────
router.delete('/:id/files/:fileId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const groupId = Number(req.params.id);
  const fileId = Number(req.params.fileId);
  try {
    const fRes = await db.execute({ sql: 'SELECT * FROM science_files WHERE id = ? AND group_id = ?', args: [fileId, groupId] });
    if (!fRes.rows.length) { res.status(404).json({ error: '文件不存在' }); return; }
    const f = fRes.rows[0] as any;
    const uid = req.user!.id;
    if (f.uploader_id !== uid && !(await isLead(groupId, uid)) && req.user!.role !== 'admin') {
      res.status(403).json({ error: '无权删除此文件' }); return;
    }
    fs.unlink(path.join(UPLOADS_DIR, f.stored_name), () => {});
    await db.execute({ sql: 'DELETE FROM science_files WHERE id = ?', args: [fileId] });
    res.json({ message: '文件已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除失败' });
  }
});

// ────────────────────────────────────────────────────────
// POST /api/science/:id/files/:fileId/summarize — AI 结构化摘要
// ────────────────────────────────────────────────────────
router.post('/:id/files/:fileId/summarize', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!ai) {
    res.status(503).json({ error: 'AI 功能未配置 DASHSCOPE_API_KEY，当前不可用' });
    return;
  }

  const groupId = Number(req.params.id);
  const fileId = Number(req.params.fileId);
  if (!(await isMember(groupId, req.user!.id)) && req.user!.role !== 'admin') {
    res.status(403).json({ error: '请先加入科学组' }); return;
  }
  try {
    const fRes = await db.execute({ sql: 'SELECT * FROM science_files WHERE id = ? AND group_id = ?', args: [fileId, groupId] });
    if (!fRes.rows.length) { res.status(404).json({ error: '文件不存在' }); return; }
    const f = fRes.rows[0] as any;
    const markets = JSON.parse(f.market_tags || '[]').join('、') || '拉美市场';

    const prompt = `你是一位国潮出海研究专家。请根据以下研究文件信息，生成一份结构化的出海洞察摘要：

文件名称：${f.display_title || f.original_name}
研究类别：${f.category}
关联市场：${markets}
研究描述：${f.description || '（暂无描述）'}

请严格按照以下格式输出（每项1-3句话，语言精炼）：

**核心发现**
（本研究最重要的发现或结论）

**市场机遇**
（在 ${markets} 市场中，国潮品牌可把握的具体机会）

**文化风险点**
（需要注意的文化禁忌或敏感点，避免品牌受损）

**落地建议**
（可立即行动的出海策略或优化方向）

**关键词**
（3-5个核心关键词，逗号分隔）`;

    const resp = await (ai.chat.completions.create as any)({
      model: 'qwen-plus',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
    });
    const summary = resp.choices[0]?.message?.content || '';
    await db.execute({ sql: 'UPDATE science_files SET ai_summary = ? WHERE id = ?', args: [summary, fileId] });
    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI 摘要生成失败，请稍后重试' });
  }
});

// ────────────────────────────────────────────────────────
// GET /api/science/:id/threads — 研究讨论列表（成员）
// ────────────────────────────────────────────────────────
router.get('/:id/threads', authMiddleware, async (req: AuthRequest, res: Response) => {
  const groupId = Number(req.params.id);
  if (!(await isMember(groupId, req.user!.id)) && req.user!.role !== 'admin') {
    res.status(403).json({ error: '请先加入科学组' }); return;
  }
  try {
    const r = await db.execute({
      sql: `SELECT st.*, u.username as creator_name, u.avatar as creator_avatar
            FROM science_threads st JOIN users u ON st.creator_id = u.id
            WHERE st.group_id = ? ORDER BY st.pinned DESC, st.updated_at DESC`,
      args: [groupId],
    });
    res.json({ threads: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取讨论列表失败' });
  }
});

// ────────────────────────────────────────────────────────
// POST /api/science/:id/threads — 发起研究线程（成员）
// ────────────────────────────────────────────────────────
router.post('/:id/threads', authMiddleware, async (req: AuthRequest, res: Response) => {
  const groupId = Number(req.params.id);
  if (!(await isMember(groupId, req.user!.id)) && req.user!.role !== 'admin') {
    res.status(403).json({ error: '请先加入科学组' }); return;
  }
  const { title, content, thread_type = 'discussion', market = null } = req.body;
  if (!title || !content) { res.status(400).json({ error: '标题和内容不能为空' }); return; }
  if (!['discussion', 'research', 'proposal', 'report'].includes(thread_type)) {
    res.status(400).json({ error: '无效的线程类型' }); return;
  }
  try {
    const r = await db.execute({
      sql: 'INSERT INTO science_threads (group_id, creator_id, title, content, thread_type, market) VALUES (?,?,?,?,?,?)',
      args: [groupId, req.user!.id, title, content, thread_type, market],
    });
    // 积分奖励（研究/成果类多给）
    const pts = ['research', 'report'].includes(thread_type) ? 15 : 8;
    await db.execute({ sql: 'UPDATE users SET lingjing_points = lingjing_points + ? WHERE id = ?', args: [pts, req.user!.id] });
    await db.execute({
      sql: "INSERT INTO points_history (user_id, amount, reason, related_type, related_id) VALUES (?,?,?,?,?)",
      args: [req.user!.id, pts, '发起科学组研究讨论', 'science', groupId],
    });
    res.status(201).json({ message: `讨论已发起，获得 ${pts} 灵创值！`, threadId: Number(r.lastInsertRowid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '发起讨论失败' });
  }
});

// ────────────────────────────────────────────────────────
// GET /api/science/:id/threads/:threadId — 线程详情+回复
// ────────────────────────────────────────────────────────
router.get('/:id/threads/:threadId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const groupId = Number(req.params.id);
  const threadId = Number(req.params.threadId);
  if (!(await isMember(groupId, req.user!.id)) && req.user!.role !== 'admin') {
    res.status(403).json({ error: '请先加入科学组' }); return;
  }
  try {
    const tRes = await db.execute({
      sql: `SELECT st.*, u.username as creator_name, u.avatar as creator_avatar
            FROM science_threads st JOIN users u ON st.creator_id = u.id
            WHERE st.id = ? AND st.group_id = ?`,
      args: [threadId, groupId],
    });
    if (!tRes.rows.length) { res.status(404).json({ error: '讨论不存在' }); return; }
    const rRes = await db.execute({
      sql: `SELECT sr.*, u.username, u.avatar, u.lingjing_points
            FROM science_replies sr JOIN users u ON sr.user_id = u.id
            WHERE sr.thread_id = ? ORDER BY sr.created_at ASC`,
      args: [threadId],
    });
    res.json({ thread: tRes.rows[0], replies: rRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取讨论详情失败' });
  }
});

// ────────────────────────────────────────────────────────
// POST /api/science/:id/threads/:threadId/replies — 回复
// ────────────────────────────────────────────────────────
router.post('/:id/threads/:threadId/replies', authMiddleware, async (req: AuthRequest, res: Response) => {
  const groupId = Number(req.params.id);
  const threadId = Number(req.params.threadId);
  if (!(await isMember(groupId, req.user!.id)) && req.user!.role !== 'admin') {
    res.status(403).json({ error: '请先加入科学组' }); return;
  }
  const { content } = req.body;
  if (!content || content.trim().length < 2) { res.status(400).json({ error: '回复内容太短' }); return; }
  try {
    await db.execute({ sql: 'INSERT INTO science_replies (thread_id, user_id, content) VALUES (?,?,?)', args: [threadId, req.user!.id, content.trim()] });
    await db.execute({ sql: 'UPDATE science_threads SET replies_count = replies_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [threadId] });
    await db.execute({ sql: 'UPDATE users SET lingjing_points = lingjing_points + 3 WHERE id = ?', args: [req.user!.id] });
    res.status(201).json({ message: '回复成功，获得 3 灵创值！' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '回复失败' });
  }
});

// ────────────────────────────────────────────────────────
// GET /api/science/:id/my-application — 查询自己的申请状态
// ────────────────────────────────────────────────────────
router.get('/:id/my-application', authMiddleware, async (req: AuthRequest, res: Response) => {
  const groupId = Number(req.params.id);
  try {
    const r = await db.execute({
      sql: 'SELECT * FROM science_applications WHERE group_id = ? AND user_id = ?',
      args: [groupId, req.user!.id],
    });
    res.json({ application: r.rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});

// ────────────────────────────────────────────────────────
// DELETE /api/science/:id — 删除科学组（仅管理员）
// ────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') { res.status(403).json({ error: '仅管理员可删除科学组' }); return; }
  const id = Number(req.params.id);
  try {
    const gRes = await db.execute({ sql: 'SELECT id FROM science_groups WHERE id = ?', args: [id] });
    if (!gRes.rows.length) { res.status(404).json({ error: '科学组不存在' }); return; }

    // 级联删除所有关联数据
    await db.execute({ sql: 'DELETE FROM science_replies WHERE thread_id IN (SELECT id FROM science_threads WHERE group_id = ?)', args: [id] });
    await db.execute({ sql: 'DELETE FROM science_threads WHERE group_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM science_files WHERE group_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM science_applications WHERE group_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM science_members WHERE group_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM science_groups WHERE id = ?', args: [id] });

    res.json({ message: '科学组已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除失败' });
  }
});

export default router;
