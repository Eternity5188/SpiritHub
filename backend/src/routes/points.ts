import { Router, Response } from 'express';
import crypto from 'crypto';
import db from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { addPoints } from '../utils/points';

const router = Router();

// GET /api/points/history
router.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const offset = (page - 1) * limit;

  try {
    const historyResult = await db.execute({ sql: 'SELECT * FROM points_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', args: [req.user!.id, limit, offset] });
    const totalResult = await db.execute({ sql: 'SELECT COUNT(*) as total FROM points_history WHERE user_id = ?', args: [req.user!.id] });
    const earnedResult = await db.execute({ sql: 'SELECT COALESCE(SUM(amount), 0) as total_earned FROM points_history WHERE user_id = ? AND amount > 0', args: [req.user!.id] });

    const total = Number((totalResult.rows[0] as any).total);
    const total_earned = Number((earnedResult.rows[0] as any).total_earned);

    res.json({ history: historyResult.rows, total_earned, pagination: { page, limit, total } });
  } catch (err) {
    console.error('获取灵创值记录失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/points/packages — 所有启用的充值套餐（公开）
router.get('/packages', async (_req, res: Response) => {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM recharge_packages WHERE is_active = 1 ORDER BY sort_order ASC, price ASC",
      args: []
    });
    res.json({ packages: result.rows });
  } catch (err) {
    res.status(500).json({ error: '获取套餐失败' });
  }
});

// POST /api/points/recharge/:packageId — 购买套餐（模拟到账）
router.post('/recharge/:packageId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { packageId } = req.params;
  try {
    const pkgResult = await db.execute({
      sql: "SELECT * FROM recharge_packages WHERE id = ? AND is_active = 1",
      args: [packageId]
    });
    if (!pkgResult.rows.length) {
      res.status(404).json({ error: '套餐不存在或已下架' });
      return;
    }
    const pkg = pkgResult.rows[0] as any;
    const points = Number(pkg.points);
    const price = Number(pkg.price);

    // 更新用户积分
    await db.execute({
      sql: 'UPDATE users SET lingjing_points = lingjing_points + ? WHERE id = ?',
      args: [points, req.user!.id]
    });
    // 写账本
    await db.execute({
      sql: "INSERT INTO points_history (user_id, amount, reason, related_type, related_id) VALUES (?, ?, ?, ?, ?)",
      args: [req.user!.id, points, `充值套餐：${pkg.name}`, 'recharge', Number(pkg.id)]
    });
    // 写订单
    await db.execute({
      sql: "INSERT INTO recharge_orders (user_id, package_id, points, price, note) VALUES (?, ?, ?, ?, ?)",
      args: [req.user!.id, Number(pkg.id), points, price, String(pkg.name)]
    });

    // 返回新余额
    const balanceResult = await db.execute({
      sql: 'SELECT lingjing_points FROM users WHERE id = ?',
      args: [req.user!.id]
    });
    const newBalance = Number((balanceResult.rows[0] as any).lingjing_points);
    res.json({ success: true, points_added: points, new_balance: newBalance });
  } catch (err) {
    console.error('充值失败:', err);
    res.status(500).json({ error: '充值失败' });
  }
});

// GET /api/points/leaderboard
router.get('/leaderboard', async (req, res: Response) => {
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

  try {
    const result = await db.execute({ sql: "SELECT id, username, avatar, lingjing_points, created_at FROM users WHERE role != 'admin' ORDER BY lingjing_points DESC LIMIT ?", args: [limit] });
    res.json({ leaderboard: result.rows });
  } catch (err) {
    console.error('获取排行榜失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/points/create-order — 创建充值订单（返回订单号供展示二维码）
// ─────────────────────────────────────────────────────────
router.post('/create-order', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { packageId, payMethod = 'wechat' } = req.body as { packageId: number; payMethod?: string };
  if (!packageId) { res.status(400).json({ error: '缺少套餐ID' }); return; }
  try {
    const pkgResult = await db.execute({
      sql: 'SELECT * FROM recharge_packages WHERE id = ? AND is_active = 1',
      args: [packageId],
    });
    if (!pkgResult.rows.length) { res.status(404).json({ error: '套餐不存在或已下架' }); return; }

    const pkg = pkgResult.rows[0] as any;
    // 生成唯一订单号：LJ + 时间戳 + 随机6位
    const orderNo = `LJ${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5分钟有效期

    await db.execute({
      sql: `INSERT INTO recharge_orders (user_id, package_id, points, price, note, status, order_no, expires_at, pay_method)
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      args: [req.user!.id, Number(pkg.id), Number(pkg.points), Number(pkg.price),
             String(pkg.name), orderNo, expiresAt, payMethod],
    });

    res.json({
      order_no: orderNo,
      package_name: pkg.name,
      points: Number(pkg.points),
      price: Number(pkg.price),
      expires_at: expiresAt,
      pay_method: payMethod,
    });
  } catch (err) {
    console.error('创建订单失败:', err);
    res.status(500).json({ error: '创建订单失败' });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/points/confirm-payment/:orderNo — 用户确认已付款
// ─────────────────────────────────────────────────────────
router.post('/confirm-payment/:orderNo', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { orderNo } = req.params;
  try {
    const orderRes = await db.execute({
      sql: "SELECT * FROM recharge_orders WHERE order_no = ? AND user_id = ?",
      args: [orderNo, req.user!.id],
    });
    if (!orderRes.rows.length) { res.status(404).json({ error: '订单不存在' }); return; }

    const order = orderRes.rows[0] as any;

    // 幂等性：用单条原子 UPDATE 把 status 从 pending → confirmed
    // 若订单已 confirmed/expired 或已过期，rowsAffected=0
    const updRes = await db.execute({
      sql: `UPDATE recharge_orders
            SET status='confirmed', confirmed_at=CURRENT_TIMESTAMP
            WHERE order_no=? AND status='pending'
              AND (expires_at IS NULL OR expires_at > datetime('now'))`,
      args: [orderNo],
    });

    if ((updRes.rowsAffected ?? 0) === 0) {
      // 判断具体原因返回友好提示
      if (order.status === 'confirmed') {
        res.status(400).json({ error: '该订单已到账，请勿重复提交' }); return;
      }
      res.status(400).json({ error: '订单已过期，请重新下单' }); return;
    }

    const points = Number(order.points);

    // 到账
    const newBalance = await addPoints(
      req.user!.id, points,
      `充值套餐：${order.note}（订单号 ${orderNo}）`,
      'recharge', Number(order.id),
    );

    res.json({ success: true, points_added: points, new_balance: newBalance, order_no: orderNo });
  } catch (err) {
    console.error('确认支付失败:', err);
    res.status(500).json({ error: '处理失败，请联系客服' });
  }
});

export default router;
