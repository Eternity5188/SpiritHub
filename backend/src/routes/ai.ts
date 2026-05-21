import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import path from 'path';
import fs from 'fs';

const router = Router();

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
if (!DASHSCOPE_API_KEY) {
  throw new Error('DASHSCOPE_API_KEY is required');
}

const client = new OpenAI({
  apiKey: DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// 加载知识库
const knowledgePath = path.join(__dirname, '../data/knowledge.json');
const knowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf-8'));

const SYSTEM_PROMPT = `你是"灵灵"，${knowledge.platform_name}的智能客服助手。你的职责是帮助用户了解和使用本平台的各项功能。

以下是关于本平台的详细知识库，请根据这些信息回答用户问题：

${JSON.stringify(knowledge, null, 2)}

回答规范：
- 使用友善、亲切的语气，适当使用"您"称呼用户
- 回答要简洁明了，对于操作步骤请用有序列表展示
- 如果用户的问题超出平台使用范围，礼貌地引导用户回到平台相关话题
- 不要编造平台没有的功能
- 回答语言与用户保持一致（用户用中文就用中文回复）`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// POST /api/ai/chat — 智能客服对话（SSE 流式返回）
router.post('/chat', async (req: Request, res: Response) => {
  const { messages } = req.body as { messages: ChatMessage[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: '请提供对话消息' });
    return;
  }

  // 只保留 role 和 content，防止注入额外字段
  const safeMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: String(m.content).slice(0, 2000) }));

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = await (client.chat.completions.create as any)({
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...safeMessages,
      ],
      stream: true,
      max_tokens: 1024,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('AI 接口错误:', err?.message || err);
    res.write(`data: ${JSON.stringify({ error: 'AI 服务暂时不可用，请稍后再试' })}\n\n`);
    res.end();
  }
});

export default router;
