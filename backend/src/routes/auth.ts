import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';
import { sendPasswordResetEmail } from '../utils/mailer';

const router = Router();

/** 生成 8 位大写字母+数字的唤友码 */
function genFriendCode(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase() +
         Math.random().toString(36).slice(2, 6).toUpperCase();
}

// POST /api/auth/register
router.post('/register', async (req, res: Response) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) { res.status(400).json({ error: '用户名、邮箱和密码不能为空' }); return; }
  if (username.length < 2 || username.length > 20) { res.status(400).json({ error: '用户名长度需在 2-20 个字符之间' }); return; }
  if (password.length < 6) { res.status(400).json({ error: '密码长度至少 6 位' }); return; }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) { res.status(400).json({ error: '邮箱格式不正确' }); return; }

  try {
    const existResult = await db.execute({ sql: 'SELECT id FROM users WHERE username = ? OR email = ?', args: [username, email] });
    if (existResult.rows.length > 0) { res.status(409).json({ error: '用户名或邮箱已被注册' }); return; }

    const passwordHash = await bcrypt.hash(password, 10);

    // 生成唯一唤友码
    let friendCode = genFriendCode();
    let codeExists = true;
    while (codeExists) {
      const check = await db.execute({ sql: 'SELECT id FROM users WHERE friend_code = ?', args: [friendCode] });
      if (check.rows.length === 0) { codeExists = false; } else { friendCode = genFriendCode(); }
    }

    const insertResult = await db.execute({
      sql: 'INSERT INTO users (username, email, password_hash, friend_code) VALUES (?, ?, ?, ?)',
      args: [username, email, passwordHash, friendCode]
    });
    const userId = Number(insertResult.lastInsertRowid);

    await db.execute({ sql: 'INSERT INTO points_history (user_id, amount, reason) VALUES (?, ?, ?)', args: [userId, 100, '新用户注册奖励'] });

    const token = generateToken({ id: userId, username, role: 'user' });
    res.status(201).json({ message: '注册成功，已获得 100 灵创値！', token, user: { id: userId, username, email, role: 'user', lingjing_points: 100, friend_code: friendCode } });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) { res.status(400).json({ error: '用户名和密码不能为空' }); return; }

  try {
    const result = await db.execute({
      sql: 'SELECT id, username, email, password_hash, role, lingjing_points, avatar, bio, friend_code FROM users WHERE username = ? OR email = ?',
      args: [username, username]
    });
    const user = result.rows[0] as any;
    if (!user) { res.status(401).json({ error: '用户名或密码错误' }); return; }

    const passwordValid = await bcrypt.compare(password, user.password_hash as string);
    if (!passwordValid) { res.status(401).json({ error: '用户名或密码错误' }); return; }

    const token = generateToken({ id: Number(user.id), username: user.username as string, role: user.role as string });
    res.json({ message: '登录成功', token, user: { id: Number(user.id), username: user.username, email: user.email, role: user.role, lingjing_points: user.lingjing_points, avatar: user.avatar, bio: user.bio, friend_code: user.friend_code } });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: 'SELECT id, username, email, role, lingjing_points, avatar, bio, friend_code, created_at FROM users WHERE id = ?',
      args: [req.user!.id]
    });
    const user = result.rows[0];
    if (!user) { res.status(404).json({ error: '用户不存在' }); return; }
    res.json({ user });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res: Response) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: '请提供邮箱地址' }); return; }

  try {
    const result = await db.execute({ sql: 'SELECT id, username FROM users WHERE email = ?', args: [email] });
    const user = result.rows[0] as any;

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 小时

      // 使旧令牌失效
      await db.execute({ sql: 'UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0', args: [user.id] });
      await db.execute({ sql: 'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', args: [user.id, token, expiresAt] });

      // 发送邮件（失败不中断响应，避免泄露邮箱是否存在）
      sendPasswordResetEmail(String(user.email ?? email), String(user.username), token).catch(err =>
        console.error('[mailer] 发送密码重置邮件失败:', err)
      );
    }

    // 无论邮箱是否存在，统一返回相同提示（防枚举攻击）
    res.json({ message: '如果该邮箱已注册，你将收到重置邮件，请在 1 小时内完成重置。' });
  } catch (err) {
    console.error('忘记密码失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) { res.status(400).json({ error: '参数不完整' }); return; }
  if (password.length < 6) { res.status(400).json({ error: '密码长度至少 6 位' }); return; }

  try {
    const result = await db.execute({ sql: 'SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token = ?', args: [token] });
    const record = result.rows[0] as any;

    if (!record || Number(record.used) === 1) { res.status(400).json({ error: '重置链接无效或已使用' }); return; }
    if (new Date(record.expires_at as string) < new Date()) { res.status(400).json({ error: '重置链接已过期，请重新申请' }); return; }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.execute({ sql: 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [passwordHash, record.user_id] });
    await db.execute({ sql: 'UPDATE password_reset_tokens SET used = 1 WHERE id = ?', args: [record.id] });

    res.json({ message: '密码重置成功，请用新密码登录' });
  } catch (err) {
    console.error('重置密码失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
