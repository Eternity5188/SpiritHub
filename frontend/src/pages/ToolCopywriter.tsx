import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, Check, RotateCcw, Globe, Languages, ChevronDown, ShieldAlert, MessageSquare, Image } from 'lucide-react';
import api from '../lib/api';
import { TextChat, ImageDetect } from './ToolDetect';
import { useLocale } from '../contexts/LocaleContext';

const MARKETS = [
  { zh: '巴西', en: 'Brazil' },
  { zh: '墨西哥', en: 'Mexico' },
  { zh: '阿根廷', en: 'Argentina' },
  { zh: '智利', en: 'Chile' },
  { zh: '哥伦比亚', en: 'Colombia' },
  { zh: '秘鲁', en: 'Peru' },
];
const PLATFORMS = [
  { zh: 'TikTok Shop', en: 'TikTok Shop' },
  { zh: 'Shopee', en: 'Shopee' },
  { zh: 'Amazon', en: 'Amazon' },
  { zh: 'Mercado Libre', en: 'Mercado Libre' },
];
const SCENES = [
  { zh: '商品标题', en: 'Product Title' },
  { zh: '五条卖点', en: '5 Selling Points' },
  { zh: '详情页短文案', en: 'Detail Page Copy' },
  { zh: '短视频口播', en: 'Short Video Script' },
];
const PRODUCTS = [
  { zh: '香囊', en: 'Sachet' },
  { zh: '工艺扇', en: 'Craft Fan' },
  { zh: '汉服', en: 'Hanfu' },
  { zh: '茶具', en: 'Tea Set' },
  { zh: '瓷器', en: 'Porcelain' },
  { zh: '丝巾', en: 'Silk Scarf' },
  { zh: '其他', en: 'Other' },
];

const MARKET_LANG: Record<string, string> = {
  '巴西': 'pt-BR',
  '墨西哥': 'es-MX',
  '阿根廷': 'es-AR',
  '智利': 'es-CL',
  '哥伦比亚': 'es-CO',
  '秘鲁': 'es-PE',
};

const TRANS_LANGS: { code: string; name: string }[] = [
  { code: 'pt-BR', name: '葡萄牙语 (巴西)' },
  { code: 'es-MX', name: '西班牙语 (墨西哥)' },
  { code: 'es-AR', name: '西班牙语 (阿根廷)' },
  { code: 'es-CL', name: '西班牙语 (智利)' },
  { code: 'es-CO', name: '西班牙语 (哥伦比亚)' },
  { code: 'es-PE', name: '西班牙语 (秘鲁)' },
  { code: 'en',    name: '英语' },
  { code: 'ja',    name: '日语' },
];

type CopyState = 'idle' | 'orig' | 'trans';
type PageTab  = 'copywriter' | 'detect';
type DetectMode = 'text' | 'image';

export default function ToolCopywriter() {
  const { t } = useLocale();
  const [product, setProduct]     = useState(PRODUCTS[0].zh);
  const [custom, setCustom]       = useState('');
  const [market, setMarket]       = useState(MARKETS[0].zh);
  const [platform, setPlatform]   = useState(PLATFORMS[0].zh);
  const [scene, setScene]         = useState(SCENES[0].zh);
  const [extra, setExtra]         = useState('');
  const [result, setResult]       = useState('');
  const [translation, setTrans]   = useState('');
  const [transLang, setTransLang] = useState(TRANS_LANGS[0].code);
  const [generating, setGenerating] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [showTrans, setShowTrans] = useState(false);
  const [error, setError]         = useState('');
  const [copied, setCopied]       = useState<CopyState>('idle');
  const [pageTab, setPageTab]     = useState<PageTab>('copywriter');
  const [detectMode, setDetectMode] = useState<DetectMode>('text');

  const productName = product === '其他' ? custom.trim() : product;
  const { lang } = useLocale();

  async function generate() {
    if (!productName || generating) return;
    setError(''); setResult(''); setTrans(''); setShowTrans(false); setGenerating(true);
    try {
      const res = await api.post('/copywriter/suggest', {
        product: productName, market, platform, scene, extra,
      });
      setResult(res.data.result || res.data.text || '');
    } catch (e: any) {
      const msg: string = e.response?.data?.error || e.message || t('生成失败，请稍后重试', 'Generation failed, please try again');
      if (e.response?.status === 402) {
        setError(msg + ' → ');
      } else {
        setError(msg);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function translate() {
    if (!result || translating) return;
    setTrans(''); setShowTrans(false);
    setTranslating(true);
    try {
      const res = await api.post('/copywriter/translate', {
        text: result, targetLang: transLang,
      });
      setTrans(res.data.translation || res.data.text || '');
      setShowTrans(true);
    } catch (e: any) {
      const msg: string = e.response?.data?.error || t('翻译失败', 'Translation failed');
      if (e.response?.status === 402) setError(msg + ' → ');
      else setError(msg);
    } finally {
      setTranslating(false);
    }
  }

  async function copy(text: string, which: CopyState) {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied('idle'), 1800);
  }

  function reset() {
    setProduct(PRODUCTS[0].zh); setCustom(''); setMarket(MARKETS[0].zh);
    setPlatform(PLATFORMS[0].zh); setScene(SCENES[0].zh); setExtra('');
    setResult(''); setTrans(''); setShowTrans(false); setError('');
  }

  function renderResult(text: string) {
    return text.split('\n').filter(Boolean).map((line, i) => {
      const isHeader = /^[一二三四五\d][\.\、]/.test(line) || /^【.+】/.test(line) || /^#+\s/.test(line);
      return (
        <p key={i} className={isHeader ? 'font-semibold text-slate-800 mt-3 mb-1' : 'text-slate-700 leading-relaxed'}>
          {line}
        </p>
      );
    });
  }

  const selectCls = 'w-full appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-8 py-2 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all';
  const chipCls   = (active: boolean) =>
    `px-3 py-1.5 text-sm rounded-lg border font-medium transition-all ${
      active ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'bg-white text-slate-600 border-slate-300 hover:border-violet-400 hover:text-violet-700'
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-violet-200 text-sm mb-2">
            <Link to="/tools" className="flex items-center gap-1 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              {t('工具箱', 'Toolkit')}
            </Link>
            <span>/</span>
            <span>{t('文化转译', 'Cultural AI')}</span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t('灵境文化转译', 'SpiritHub Cultural Transcreation')}</h1>
                <p className="text-violet-200 text-sm mt-0.5">{t('AI 跨境营销文案生成 · 六大拉美市场', 'AI marketing copy generation · 6 LATAM markets')}</p>
              </div>
            </div>
            {/* 页面级 Tab 切换 */}
            <div className="flex bg-white/10 rounded-xl p-1 gap-1">
              <button
                onClick={() => setPageTab('copywriter')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  pageTab === 'copywriter' ? 'bg-white text-violet-600 shadow-sm' : 'text-violet-200 hover:text-white'
                }`}
              >
                <Globe className="w-4 h-4" />
                {t('文化转译', 'Transcreation')}
              </button>
              <button
                onClick={() => setPageTab('detect')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  pageTab === 'detect' ? 'bg-white text-violet-600 shadow-sm' : 'text-violet-200 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                {t('风控检测', 'Risk Detection')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 风控检测面板 */}
        {pageTab === 'detect' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" style={{ minHeight: 520 }}>
            {/* 检测内部模式 Tab */}
            <div className="flex gap-1 border-b border-slate-200 px-4 py-2 bg-slate-50">
              <button
                onClick={() => setDetectMode('text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  detectMode === 'text' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {t('文本检测', 'Text Scan')}
              </button>
              <button
                onClick={() => setDetectMode('image')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  detectMode === 'image' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Image className="w-3.5 h-3.5" />
                {t('图像检测', 'Image Scan')}
              </button>
            </div>
            <div className="flex flex-col" style={{ height: 520 }}>
              {detectMode === 'text'  && <TextChat />}
              {detectMode === 'image' && <ImageDetect />}
            </div>
          </div>
        )}

        {/* 文化转译面板 */}
        {pageTab === 'copywriter' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Form Card */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h2 className="text-sm font-bold text-slate-700">{t('生成参数', 'Generation Inputs')}</h2>
              </div>
              <div className="p-6 space-y-6">

                {/* Product */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">{t('商品类型', 'Product Type')}</label>
                  <div className="flex flex-wrap gap-2">
                    {PRODUCTS.map(p => (
                      <button key={p.zh} onClick={() => setProduct(p.zh)} className={chipCls(product === p.zh)}>{lang === 'en' ? p.en : p.zh}</button>
                    ))}
                  </div>
                  {product === '其他' && (
                    <input
                      className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                      value={custom}
                      onChange={e => setCustom(e.target.value)}
                      placeholder={t('输入自定义商品名称', 'Enter custom product')}
                    />
                  )}
                </div>

                {/* Market & Platform */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('目标市场', 'Target Market')}</label>
                    <div className="relative">
                      <select
                        className={selectCls}
                        value={market}
                        onChange={e => { setMarket(e.target.value); setTrans(''); setShowTrans(false); }}
                      >
                        {MARKETS.map(m => <option key={m.zh} value={m.zh}>{lang === 'en' ? m.en : m.zh}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('发布平台', 'Platform')}</label>
                    <div className="relative">
                      <select className={selectCls} value={platform} onChange={e => setPlatform(e.target.value)}>
                        {PLATFORMS.map(p => <option key={p.zh} value={p.zh}>{lang === 'en' ? p.en : p.zh}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Scene */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">{t('文案场景', 'Copy Scene')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SCENES.map(sc => (
                      <button key={sc.zh} onClick={() => setScene(sc.zh)} className={chipCls(scene === sc.zh)}>{lang === 'en' ? sc.en : sc.zh}</button>
                    ))}
                  </div>
                </div>

                {/* Extra */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {t('补充要求', 'Extra Notes')} <span className="text-slate-400 font-normal normal-case">{t('（可选）', '(optional)')}</span>
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                    rows={3}
                    value={extra}
                    onChange={e => setExtra(e.target.value)}
                    placeholder={t('补充风格偏好、卖点侧重、禁忌词等…', 'Style, selling points, taboo words, etc...')}
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={generate}
                    disabled={generating || !productName}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 transition-all shadow-sm"
                  >
                    {generating ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('生成中…', 'Generating...')}
                      </>
                    ) : t('生成文案', 'Generate')}
                  </button>
                    <button onClick={reset} className="btn-secondary px-3 py-2.5" title={t('重置', 'Reset')}>
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Result */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">{t('生成结果', 'Result')}</h2>
                  {result && (
                <span className="text-xs text-slate-400">
                  {lang === 'en' ? (MARKETS.find(m => m.zh === market)?.en ?? market) : market} ·
                  {lang === 'en' ? (PLATFORMS.find(p => p.zh === platform)?.en ?? platform) : platform} ·
                  {lang === 'en' ? (SCENES.find(s => s.zh === scene)?.en ?? scene) : scene}
                </span>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2 flex-wrap">
                <span>{error.replace(' → ', '')}</span>
                {error.includes(' → ') && (
                  <Link to="/recharge" className="underline font-semibold text-violet-600 hover:text-violet-800">
                    {t('去充值', 'Recharge now')}
                  </Link>
                )}
              </div>
            )}

            {result ? (
              <>
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('中文原文', 'Original')}</span>
                    <button
                      onClick={() => copy(result, 'orig')}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-600 transition-colors"
                    >
                      {copied === 'orig' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied === 'orig' ? t('已复制', 'Copied') : t('复制', 'Copy')}
                    </button>
                  </div>
                  <div className="p-5 text-sm space-y-1.5">{renderResult(result)}</div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      className="w-full appearance-none rounded-xl border border-slate-300 bg-white pl-3 pr-8 py-2.5 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                      value={transLang}
                      onChange={e => { setTransLang(e.target.value); setTrans(''); setShowTrans(false); }}
                    >
                      {TRANS_LANGS.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  <button
                    onClick={translate}
                    disabled={translating}
                    className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:border-violet-400 hover:text-violet-700 text-slate-600 font-medium text-sm px-4 py-2.5 transition-all shadow-sm whitespace-nowrap disabled:opacity-50"
                  >
                    <Languages className="w-4 h-4" />
                    {translating ? t('翻译中…', 'Translating...') : t('翻译', 'Translate')}
                  </button>
                </div>

                {showTrans && translation && (
                  <div className="bg-white border border-violet-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-violet-100 bg-violet-50">
                      <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
                        {TRANS_LANGS.find(l => l.code === transLang)?.name ?? ''} {t('译文', 'Translation')}
                      </span>
                      <button
                        onClick={() => copy(translation, 'trans')}
                        className="flex items-center gap-1.5 text-xs text-violet-500 hover:text-violet-700 transition-colors"
                      >
                        {copied === 'trans' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied === 'trans' ? t('已复制', 'Copied') : t('复制', 'Copy')}
                      </button>
                    </div>
                    <p className="p-5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{translation}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center text-slate-400 py-20">
                <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
                  <Globe className="w-7 h-7 text-violet-300" />
                </div>
                <p className="text-sm font-medium text-slate-500">{t('配置左侧参数后点击「生成文案」', 'Configure inputs and click Generate')}</p>
                <p className="text-xs text-slate-400 mt-1">{t('支持中文原文 + 本地语言双版本输出', 'Supports original + localized bilingual output')}</p>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
