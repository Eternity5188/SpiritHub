import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { deductPoints } from '../utils/points';

const router = Router();

// 各检测功能灵创值消耗
const COST_TEXT  =  8; // 文本风险检测
const COST_IMAGE = 12; // 图像风险检测

const DASHSCOPE_KEY = process.env.DASHSCOPE_API_KEY;
if (!DASHSCOPE_KEY) {
  throw new Error('DASHSCOPE_API_KEY is required');
}
const BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

async function qwenCall(model: string, messages: unknown[]): Promise<string> {
  const r = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DASHSCOPE_KEY}` },
    body: JSON.stringify({ model, messages, max_tokens: 800 }),
  });
  const d = (await r.json()) as { choices: { message: { content: string } }[] };
  return d.choices[0]?.message?.content?.trim() ?? '';
}

// POST /api/detect/text — 流式 SSE 文本风险检测（消耗 8 灵创值）
router.post('/text', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { text, region } = req.body as { text: string; region: string };
  if (!text || !region) { res.status(400).json({ error: '缺少参数' }); return; }

  // 先扣费，再返回 SSE
  try {
    await deductPoints(req.user!.id, COST_TEXT, `文化风控·文本检测（${region}）`, 'detect_text');
  } catch (e: any) {
    res.status(402).json({ error: e.message === '余额不足'
      ? `灵创值不足，文本检测需消耗 ${COST_TEXT} 灵创值，请先充值`
      : '扣费失败，请重试' });
    return;
  }

  const prompt = `你是专业的跨境文化语义风险分析师，精通${region}市场的文化禁忌与消费心理。

**分析任务**：评估以下营销文案在${region}市场的文化风险。

**文案内容**：
${text}

请按以下结构输出（不要使用 Markdown 标题符号，直接写标签）：

风险等级：[高/中/低]
风险摘要：（一句话概括核心风险点，无风险写"无明显文化风险"）
详细分析：
（逐条说明潜在文化冲突、禁忌表达或敏感元素，无则写"暂无明显风险点"）
优化建议：
（3条具体可执行的改进建议，每条以"·"开头）`;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  try {
    const upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DASHSCOPE_KEY}` },
      body: JSON.stringify({
        model: 'qwen-plus',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        max_tokens: 800,
      }),
    });
    const reader = upstream.body!.getReader();
    const dec = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(dec.decode(value));
    }
  } catch (e: unknown) {
    res.write(`data: ${JSON.stringify({ error: (e as Error).message })}\n\n`);
  }
  res.end();
});

// POST /api/detect/image — SSE 四步工作流图像检测（消耗 12 灵创值）
router.post('/image', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { imageBase64, mimeType, region } = req.body as Record<string, string>;
  if (!imageBase64 || !region) { res.status(400).json({ error: '缺少参数' }); return; }

  try {
    await deductPoints(req.user!.id, COST_IMAGE, `文化风控·图像检测（${region}）`, 'detect_image');
  } catch (e: any) {
    res.status(402).json({ error: e.message === '余额不足'
      ? `灵创值不足，图像检测需消耗 ${COST_IMAGE} 灵创值，请先充值`
      : '扣费失败，请重试' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  const send = (data: Record<string, unknown>) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    // Step 1: 图像理解
    send({ step: 1, status: 'running' });
    const description = await qwenCall('qwen-vl-plus', [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mimeType ?? 'image/jpeg'};base64,${imageBase64}` } },
        { type: 'text', text: '请详细描述这张图片的内容，包括主体元素、颜色、符号、场景氛围，以及任何可能与宗教、文化相关的视觉元素。用中文回复，150字以内。' },
      ],
    }]);
    send({ step: 1, status: 'done', content: description });

    // Step 2: 文化风险分析
    send({ step: 2, status: 'running' });
    const analysis = await qwenCall('qwen-plus', [{
      role: 'user',
      content: `你是专业的跨境文化语义风险分析师。\n图片内容描述：${description}\n目标市场：${region}\n\n请分析该图片的文化风险：\n风险等级：[高/中/低]\n核心风险点：（1-3个具体风险，无风险写"无明显风险"）`,
    }]);
    send({ step: 2, status: 'done', content: analysis });

    // Step 3: 风险定级
    send({ step: 3, status: 'running' });
    const riskLine = analysis.match(/风险等级[：:]\s*([高中低])/)?.[1] ?? '中';
    const verdict =
      riskLine === '高'
        ? '该图片在目标市场存在较高文化风险，直接使用可能引发消费者反感或法律纠纷，建议修改后再投放。'
        : riskLine === '中'
        ? '该图片存在一定文化敏感性，建议针对风险点做局部调整后使用。'
        : '该图片在目标市场文化风险较低，可基本放心使用，但仍建议参考优化建议做细节完善。';
    send({ step: 3, status: 'done', content: verdict, riskLevel: riskLine });

    // Step 4: 优化建议
    send({ step: 4, status: 'running' });
    const suggestion = await qwenCall('qwen-plus', [{
      role: 'user',
      content: `给出3条针对该图片在${region}市场的优化建议，每条不超过40字，每条以"·"开头。\n图片：${description}\n风险：${analysis}`,
    }]);
    send({ step: 4, status: 'done', content: suggestion });
    send({ done: true });
  } catch (e: unknown) {
    send({ error: (e as Error).message });
  }
  res.end();
});

export default router;
