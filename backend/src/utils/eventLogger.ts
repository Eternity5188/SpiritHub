/**
 * GNN 研究数据采集工具
 * ─────────────────────────────────────────────
 * 所有写操作均为 fire-and-forget：不 await、异常静默处理，
 * 绝不影响主请求的响应时延。
 *
 * 边权重设计（用于 user_tag_interests）：
 *   post_view    +0.5   （曝光，低权重）
 *   post_like    +2.0   （显式正反馈）
 *   post_unlike  -1.0   （隐式负反馈）
 *   post_comment +3.0   （高参与度）
 *   post_create  +5.0   （创作行为，强兴趣信号）
 *   colab_join   +4.0   （协作意愿）
 */

import db from '../db';

export interface EventPayload {
  user_id      : number | null;
  event_type   : string;
  target_type ?: string | null;
  target_id   ?: number | null;
  target_extra?: string | null;
  session_id  ?: string | null;
  duration_ms ?: number | null;
  metadata    ?: Record<string, unknown>;
}

/** 记录一条用户行为事件（图边） */
export function logEvent(payload: EventPayload): void {
  const {
    user_id, event_type,
    target_type  = null,
    target_id    = null,
    target_extra = null,
    session_id   = null,
    duration_ms  = null,
    metadata     = {},
  } = payload;

  // 完全匿名且无 session_id 的事件噪声太高，跳过
  if (!user_id && !session_id) return;

  db.execute({
    sql: `INSERT INTO user_events
            (user_id, event_type, target_type, target_id, target_extra,
             session_id, duration_ms, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      user_id, event_type, target_type, target_id, target_extra,
      session_id, duration_ms, JSON.stringify(metadata),
    ],
  }).catch(() => {/* 日志失败不影响业务 */});
}

/** 记录一条阅读详情（提供阅读时长 / 滚动深度等质量信号） */
export function logPostView(opts: {
  post_id    : number;
  user_id   ?: number | null;
  duration_ms: number;
  scroll_pct : number;
  ref_page  ?: string | null;
  session_id?: string | null;
}): void {
  db.execute({
    sql: `INSERT INTO post_view_logs
            (post_id, user_id, duration_ms, scroll_pct, ref_page, session_id)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      opts.post_id,
      opts.user_id  ?? null,
      opts.duration_ms,
      Math.min(100, Math.max(0, opts.scroll_pct)),
      opts.ref_page  ?? null,
      opts.session_id ?? null,
    ],
  }).catch(() => {});
}

const TAG_WEIGHT: Record<string, number> = {
  post_view   :  0.5,
  post_like   :  2.0,
  post_unlike : -1.0,
  post_comment:  3.0,
  post_create :  5.0,
  colab_join  :  4.0,
};

/** 根据行为类型更新用户标签兴趣权重（用于节点特征向量） */
export function updateTagInterests(
  user_id   : number,
  tags      : string[],
  event_type: string,
): void {
  const delta = TAG_WEIGHT[event_type];
  if (!delta || !user_id || !tags.length) return;

  tags.forEach(tag => {
    if (!tag || tag.length > 30) return;
    db.execute({
      sql: `INSERT INTO user_tag_interests (user_id, tag, weight, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, tag) DO UPDATE SET
              weight     = MAX(0, weight + ?),
              updated_at = CURRENT_TIMESTAMP`,
      args: [user_id, tag, Math.max(0, delta), delta],
    }).catch(() => {});
  });
}
