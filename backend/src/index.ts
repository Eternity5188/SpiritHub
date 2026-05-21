import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── JWT 密钥强制校验（生产环境不允许使用默认值）─────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'lingjing_secret') {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] 生产环境必须设置强随机 JWT_SECRET 环境变量，拒绝启动');
    process.exit(1);
  } else {
    console.warn('[WARN] JWT_SECRET 未设置，开发模式下使用默认密钥（生产环境会拒绝启动）');
  }
}

// ── 速率限制器 ───────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 20,                   // 最多 20 次
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请 15 分钟后再试' },
  skip: (req) => req.ip === '127.0.0.1', // 本地开发不限制
});

const pointsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '操作过于频繁，请稍后再试' },
});

import { initDb, db } from './db';
import authRouter from './routes/auth';
import postsRouter from './routes/posts';
import colabRouter from './routes/colab';
import pointsRouter from './routes/points';
import usersRouter from './routes/users';
import friendsRouter from './routes/friends';
import roomsRouter from './routes/rooms';
import aiRouter from './routes/ai';
import adminRouter from './routes/admin';
import recommendationsRouter from './routes/recommendations';
import copywriterRouter from './routes/copywriter';
import detectRouter from './routes/detect';
import scienceRouter from './routes/science';
import notificationsRouter from './routes/notifications';
import eventsRouter from './routes/events';
import { setIo } from './socketInstance';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
];

// ── Socket.io ─────────────────────────────────────────
export const io = new SocketServer(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true }
});
setIo(io);

io.use((socket, next) => {
  const token = socket.handshake.auth.token as string;
  if (!token) { next(new Error('未提供 Token')); return; }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'lingjing_secret_dev') as any;
    (socket as any).user = payload;
    next();
  } catch {
    next(new Error('Token 无效'));
  }
});

io.on('connection', async (socket) => {
  const user = (socket as any).user;
  console.log(`🔌 用户 ${user.username} 已连接 [${socket.id}]`);

  socket.join(`user:${user.id}`);

  // 连接时一次查出头像，供所有消息事件复用
  let userAvatar: string | null = null;
  try {
    const avatarRow = await db.execute({ sql: 'SELECT avatar FROM users WHERE id = ?', args: [user.id] });
    userAvatar = (avatarRow.rows[0] as any)?.avatar ?? null;
  } catch { /* 头像查询失败不影响消息收发 */ }

  // ── 公共聊天室 ─────────────────────────────────────
  socket.on('join_room', async (roomId: number) => {
    const rid = Number(roomId);
    if (!rid) return;

    // 验证是否是成员
    try {
      const check = await db.execute({
        sql: 'SELECT 1 FROM chat_room_members WHERE room_id = ? AND user_id = ?',
        args: [rid, user.id]
      });
      if (check.rows.length === 0) { socket.emit('room_error', '请先加入聊天室'); return; }
    } catch { return; }

    socket.join(`room:${rid}`);

    // 拉取历史消息（最近 50 条）
    try {
      const history = await db.execute({
        sql: `SELECT rm.id, rm.content, rm.created_at, rm.room_id,
                u.id as user_id, u.username, u.avatar, u.lingjing_points
              FROM room_messages rm JOIN users u ON rm.user_id = u.id
              WHERE rm.room_id = ? ORDER BY rm.created_at DESC LIMIT 50`,
        args: [rid]
      });
      socket.emit('room_history', history.rows.reverse());
    } catch (err) {
      console.error('拉取聊天室历史失败:', err);
    }
  });

  socket.on('leave_room', (roomId: number) => {
    socket.leave(`room:${Number(roomId)}`);
  });

  socket.on('room_message', async (data: { room_id: number; content: string }) => {
    const content = (data.content || '').trim().slice(0, 500);
    const rid = Number(data.room_id);
    if (!content || !rid) return;

    // 验证成员资格
    try {
      const check = await db.execute({
        sql: 'SELECT 1 FROM chat_room_members WHERE room_id = ? AND user_id = ?',
        args: [rid, user.id]
      });
      if (check.rows.length === 0) { socket.emit('room_error', '请先加入聊天室'); return; }

      const result = await db.execute({
        sql: 'INSERT INTO room_messages (user_id, room_id, content) VALUES (?, ?, ?)',
        args: [user.id, rid, content]
      });
      const msg = { id: Number(result.lastInsertRowid), room_id: rid, content, created_at: new Date().toISOString(), user_id: user.id, username: user.username, avatar: userAvatar, lingjing_points: null };
      io.to(`room:${rid}`).emit('room_message', msg);
    } catch (err) { console.error('发送聊天室消息失败:', err); }
  });

  // ── 群主踢人通知 ──────────────────────────────────
  socket.on('room_kick_notify', (data: { room_id: number; target_user_id: number }) => {
    io.to(`user:${data.target_user_id}`).emit('room_kicked', { room_id: data.room_id });
  });

  // ── 私信 ──────────────────────────────────────────
  socket.on('private_message', async (data: { to_user_id: number; content: string }) => {
    const content = (data.content || '').trim().slice(0, 1000);
    if (!content || !data.to_user_id) return;
    try {
      const result = await db.execute({
        sql: 'INSERT INTO private_messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
        args: [user.id, data.to_user_id, content]
      });
      const msg = { id: Number(result.lastInsertRowid), sender_id: user.id, receiver_id: data.to_user_id, content, is_read: 0, created_at: new Date().toISOString(), sender_name: user.username, sender_avatar: userAvatar };
      io.to(`user:${data.to_user_id}`).emit('private_message', msg);
      socket.emit('private_message', msg);
    } catch (err) { console.error('发送私信失败:', err); }
  });

  // ── 正在输入 ─────────────────────────────────────────
  socket.on('typing', (data: { room_id?: number; to_user_id?: number }) => {
    if (data.room_id) {
      socket.to(`room:${data.room_id}`).emit('user_typing', {
        user_id: user.id, username: user.username, room_id: data.room_id
      });
    } else if (data.to_user_id) {
      io.to(`user:${data.to_user_id}`).emit('user_typing', {
        user_id: user.id, username: user.username
      });
    }
  });

  socket.on('stop_typing', (data: { room_id?: number; to_user_id?: number }) => {
    if (data.room_id) {
      socket.to(`room:${data.room_id}`).emit('user_stop_typing', {
        user_id: user.id, username: user.username, room_id: data.room_id
      });
    } else if (data.to_user_id) {
      io.to(`user:${data.to_user_id}`).emit('user_stop_typing', {
        user_id: user.id, username: user.username
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 用户 ${user.username} 已断开`);
  });
});

// ── Express ───────────────────────────────────────────
app.use(helmet({
  // 允许同域嵌入（科学组文件预览等）
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/colab', colabRouter);
app.use('/api/points', pointsLimiter, pointsRouter);
app.use('/api/users', usersRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/admin', adminRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/copywriter', pointsLimiter, copywriterRouter);
app.use('/api/detect', pointsLimiter, detectRouter);
app.use('/api/science', scienceRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/events', eventsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', platform: '灵创社区平台', version: '1.0.0', timestamp: new Date().toISOString() });
});

// 生产环境：托管前端构建产物，支持 React Router 客户端路由
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.use((_req, res) => { res.status(404).json({ error: '接口不存在' }); });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('未捕获错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

async function main() {
  await initDb();
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 灵创社区平台后端启动成功`);
    console.log(`   地址: http://localhost:${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log(`   环境: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

main().catch(err => { console.error('启动失败:', err); process.exit(1); });

export default app;
