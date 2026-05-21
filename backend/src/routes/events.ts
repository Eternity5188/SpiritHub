/**
 * POST /api/events
 * ──────────────────────────────────────────────────────────
 * 接收前端主动上报的行为事件，主要用于采集：
 *   1. 阅读停留时长（dwell time）
 *   2. 滚动深度（scroll depth）
 *   3. 页面访问路径（page_visit）
 *   4. 搜索关键词（search）
 *
 * 这些信号在纯后端 API 层无法捕获，必须由前端主动上报。
 * 事件类型白名单严格限制，防止滥用。
 */

import { Router, Response, Request } from 'express';
import { optionalAuthMiddleware, AuthRequest } from '../middleware/auth';
import { logEvent, logPostView } from '../utils/eventLogger';

const router = Router();

// 允许上报的事件类型（前端侧）
const ALLOWED_FRONTEND_EVENTS = new Set([
  'post_view',    // 含阅读时长 / 滚动深度
  'colab_view',   // 含停留时长
  'profile_view', // 浏览他人主页
  'page_visit',   // 页面跳转
  'search',       // 搜索关键词
]);

// POST /api/events
router.post('/', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  const {
    event_type,
    target_type  = null,
    target_id    = null,
    session_id   = null,
    duration_ms  = null,
    metadata     = {},
  } = req.body as {
    event_type  : string;
    target_type?: string;
    target_id  ?: number;
    session_id ?: string;
    duration_ms?: number;
    metadata   ?: Record<string, unknown>;
  };

  // ── 基础校验 ────────────────────────────────────────────
  if (!event_type || !ALLOWED_FRONTEND_EVENTS.has(event_type)) {
    res.status(400).json({ error: '不支持的 event_type' });
    return;
  }
  if (!req.user?.id && !session_id) {
    res.status(400).json({ error: '需要提供 session_id（匿名事件）' });
    return;
  }
  if (session_id && typeof session_id !== 'string') {
    res.status(400).json({ error: 'session_id 格式无效' });
    return;
  }

  const userId = req.user?.id ?? null;

  // ── 写入事件日志（fire-and-forget 已在 logEvent 内部） ──
  logEvent({
    user_id    : userId,
    event_type,
    target_type: target_type ?? null,
    target_id  : target_id  ? Number(target_id) : null,
    session_id : session_id ?? null,
    duration_ms: duration_ms != null ? Math.min(Number(duration_ms), 3_600_000) : null,
    metadata,
  });

  // 帖子阅读事件额外写入高精度日志表
  if (event_type === 'post_view' && target_id) {
    const scroll_pct = typeof metadata.scroll_pct === 'number' ? metadata.scroll_pct : 0;
    const ref_page   = typeof metadata.ref_page   === 'string' ? metadata.ref_page  : null;
    logPostView({
      post_id    : Number(target_id),
      user_id    : userId,
      duration_ms: duration_ms != null ? Math.min(Number(duration_ms), 3_600_000) : 0,
      scroll_pct,
      ref_page,
      session_id : session_id ?? null,
    });
  }

  res.json({ ok: true });
});

export default router;
