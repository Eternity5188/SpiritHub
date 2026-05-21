import db from '../db';

/**
 * 扣除用户灵创值。若余额不足，抛出 Error('余额不足')。
 * 成功后写入 points_history，返回新余额。
 */
export async function deductPoints(
  userId: number,
  amount: number,
  reason: string,
  relatedType?: string,
  relatedId?: number,
): Promise<number> {
  // 原子扣减：WHERE 条件保证余额不足时 rowsAffected=0，彻底消除并发透支竞态
  const upd = await db.execute({
    sql: 'UPDATE users SET lingjing_points = lingjing_points - ? WHERE id = ? AND lingjing_points >= ?',
    args: [amount, userId, amount],
  });
  if ((upd.rowsAffected ?? 0) === 0) {
    // 区分用户不存在 vs 余额不足
    const chk = await db.execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [userId] });
    if (!chk.rows.length) throw new Error('用户不存在');
    throw new Error('余额不足');
  }
  await db.execute({
    sql: 'INSERT INTO points_history (user_id, amount, reason, related_type, related_id) VALUES (?, ?, ?, ?, ?)',
    args: [userId, -amount, reason, relatedType ?? null, relatedId ?? null],
  });
  const balRes = await db.execute({ sql: 'SELECT lingjing_points FROM users WHERE id = ?', args: [userId] });
  return Number((balRes.rows[0] as any).lingjing_points);
}

/**
 * 增加用户灵创值，写入 points_history，返回新余额。
 */
export async function addPoints(
  userId: number,
  amount: number,
  reason: string,
  relatedType?: string,
  relatedId?: number,
): Promise<number> {
  await db.execute({
    sql: 'UPDATE users SET lingjing_points = lingjing_points + ? WHERE id = ?',
    args: [amount, userId],
  });
  await db.execute({
    sql: 'INSERT INTO points_history (user_id, amount, reason, related_type, related_id) VALUES (?, ?, ?, ?, ?)',
    args: [userId, amount, reason, relatedType ?? null, relatedId ?? null],
  });
  const res = await db.execute({
    sql: 'SELECT lingjing_points FROM users WHERE id = ?',
    args: [userId],
  });
  return Number((res.rows[0] as any).lingjing_points);
}
