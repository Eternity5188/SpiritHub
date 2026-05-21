import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DB_PATH || './data/lingjing.db';
const absolutePath = path.resolve(DB_PATH);
const dbDir = path.dirname(absolutePath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db: Client = createClient({
  url: `file:${absolutePath}`,
});

export async function initDb(): Promise<void> {
  await db.execute({ sql: 'PRAGMA journal_mode = WAL', args: [] });   // 多并发读写不互斥
  await db.execute({ sql: 'PRAGMA synchronous = NORMAL', args: [] }); // WAL 下安全且更快
  await db.execute({ sql: 'PRAGMA foreign_keys = ON', args: [] });
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await db.executeMultiple(schema);
  console.log(`✅ 数据库已初始化: ${absolutePath}`);
}

export default db;
