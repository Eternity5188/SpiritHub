import { Router, Response } from 'express';
import OpenAI from 'openai';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { deductPoints } from '../utils/points';

const router = Router();

// 各 AI 功能灵创值消耗
const COST_SUGGEST   = 10; // 生成文案
const COST_TRANSLATE =  5; // 翻译文案

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
if (!DASHSCOPE_API_KEY) {
  throw new Error('DASHSCOPE_API_KEY is required');
}

const client = new OpenAI({
  apiKey: DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

const MARKET_CULTURE: Record<string, string> = {
  '巴西': '巴西文化（热情奔放、重视家庭，节庆氛围浓厚，偏好鲜艳色彩）',
  '墨西哥': '墨西哥文化（传统与现代并存、重视手工艺、家庭为核心）',
  '阿根廷': '阿根廷文化（欧式气质、注重品质与档次、热爱艺术）',
  '智利': '智利文化（务实低调、注重可持续，较为保守）',
  '哥伦比亚': '哥伦比亚文化（多元包容、色彩丰富、重视人情味）',
  '秘鲁': '秘鲁文化（历史底蕴深厚、崇尚自然与传统工艺）',
};

const SCENE_INSTRUCTION: Record<string, string> = {
  '商品标题': '生成一条精炼有力的商品标题（30字以内），突出核心卖点，适合电商搜索优化。',
  '五条卖点': '生成五条简洁有力的商品卖点，每条不超过25字，用数字编号列出。',
  '详情页短文案': '生成200字以内的商品详情页短文案，分段描述品质、工艺和使用场景。',
  '短视频口播': '生成一段适合短视频口播的营销文案（60秒以内），节奏感强，有呼吁行动语句。',
};

// POST /api/copywriter/suggest — 生成文案（消耗 10 灵创值）
router.post('/suggest', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { product, market, platform, scene, extra } = req.body as {
    product: string; market: string; platform: string; scene: string; extra?: string;
  };

  if (!product || !market || !platform || !scene) {
    res.status(400).json({ error: '缺少必要参数' });
    return;
  }

  // 先扣点
  try {
    await deductPoints(req.user!.id, COST_SUGGEST, `文化转译·生成文案（${product}/${market}）`, 'copywriter');
  } catch (e: any) {
    res.status(402).json({ error: e.message === '余额不足'
      ? `灵创值不足，生成文案需消耗 ${COST_SUGGEST} 灵创值，请先充值`
      : '扣费失败，请重试' });
    return;
  }

  const cultureNote = MARKET_CULTURE[market] || market;
  const sceneInstruct = SCENE_INSTRUCTION[scene] || `生成适合"${scene}"场景的文案。`;

  const prompt = `你是一位精通跨境文创营销的文案专家，深谙中拉文化差异。

**任务**：为以下商品生成适合${market}市场的营销文案。
**商品**：${product}
**目标市场**：${market}（${cultureNote}）
**发布平台**：${platform}
**文案场景**：${scene}

${sceneInstruct}

注意事项：
- 结合目标市场的文化特点和审美偏好
- 突出中国文化工艺的独特价值
- 避免文化禁忌和不当表达
- 语言简洁有力，适合${platform}平台风格
${extra ? `- 补充要求：${extra}` : ''}
- **请用中文输出文案，不要使用目标市场的本地语言**

请直接输出文案内容，不要解释或前言。`;

  try {
    const response = await (client.chat.completions.create as any)({
      model: 'qwen-plus',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
    });
    const result = response.choices[0]?.message?.content?.trim() || '';
    res.json({ result, points_cost: COST_SUGGEST });
  } catch (err: any) {
    console.error('copywriter suggest error:', err?.message || err);
    res.status(500).json({ error: 'AI 生成失败，请稍后重试' });
  }
});

// POST /api/copywriter/translate — 翻译文案（消耗 5 灵创值）
router.post('/translate', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { text, targetLang } = req.body as { text: string; targetLang: string };

  if (!text || !targetLang) {
    res.status(400).json({ error: '缺少必要参数' });
    return;
  }

  try {
    await deductPoints(req.user!.id, COST_TRANSLATE, `文化转译·翻译（→${targetLang}）`, 'translate');
  } catch (e: any) {
    res.status(402).json({ error: e.message === '余额不足'
      ? `灵创值不足，翻译需消耗 ${COST_TRANSLATE} 灵创值，请先充值`
      : '扣费失败，请重试' });
    return;
  }

  const langMap: Record<string, string> = {
    'pt-BR': '巴西葡萄牙语',
    'es-MX': '墨西哥西班牙语',
    'es-AR': '阿根廷西班牙语',
    'es-CL': '智利西班牙语',
    'es-CO': '哥伦比亚西班牙语',
    'es-PE': '秘鲁西班牙语',
    'es':    '西班牙语',
  };

  const langName = langMap[targetLang] || targetLang;
  const prompt = `请将以下中文营销文案准确翻译为${langName}，保持营销语气和格式，不要添加解释：\n\n${text.slice(0, 2000)}`;

  try {
    const response = await (client.chat.completions.create as any)({
      model: 'qwen-plus',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    });
    const translation = response.choices[0]?.message?.content?.trim() || '';
    res.json({ translation, points_cost: COST_TRANSLATE });
  } catch (err: any) {
    console.error('copywriter translate error:', err?.message || err);
    res.status(500).json({ error: '翻译失败，请稍后重试' });
  }
});

export default router;
