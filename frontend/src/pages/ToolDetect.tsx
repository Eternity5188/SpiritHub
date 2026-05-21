import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, AlertCircle, Upload, Image, MessageSquare, ChevronDown, Send, RotateCcw } from 'lucide-react';

const REGIONS = ['巴西', '墨西哥', '阿根廷', '智利', '哥伦比亚', '秘鲁'];

type RiskLevel = 'high' | 'mid' | 'low' | null;
type Mode = 'text' | 'image';
type StepStatus = 'idle' | 'running' | 'done';
type ImagePhase = 'upload' | 'running' | 'done';

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
  region?: string;
  level?: RiskLevel;
  streaming?: boolean;
}

interface ImageStep {
  step: number;
  status: StepStatus;
  content?: string;
  level?: RiskLevel;
}

const STEP_META = [
  { label: '图像理解',     desc: '视觉模型解析画面元素、颜色与符号' },
  { label: '文化风险分析', desc: '对照目标市场禁忌逐维度检测' },
  { label: '风险定级',     desc: '综合评估，输出研判结论' },
  { label: '优化建议',     desc: '生成可落地的具体改进方案' },
];

const LEVEL_CONFIG: Record<NonNullable<RiskLevel>, { label: string; color: string; dot: string; icon: React.ReactNode }> = {
  high: {
    label: '高风险',
    color: 'text-red-600 bg-red-50 border-red-200',
    dot:   'bg-red-500',
    icon:  <AlertTriangle className="w-4 h-4" />,
  },
  mid: {
    label: '中风险',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    dot:   'bg-amber-500',
    icon:  <AlertCircle className="w-4 h-4" />,
  },
  low: {
    label: '低风险',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    dot:   'bg-emerald-500',
    icon:  <CheckCircle className="w-4 h-4" />,
  },
};

function parseLevel(text: string): RiskLevel {
  if (/风险等级[：:]\s*高/.test(text)) return 'high';
  if (/风险等级[：:]\s*中/.test(text)) return 'mid';
  if (/风险等级[：:]\s*低/.test(text)) return 'low';
  return null;
}

function formatAnalysisText(text: string) {
  return text.split('\n').filter(Boolean).map((line, i) => {
    const isHeader = /^(风险等级|风险摘要|详细分析|优化建议)[：:]/.test(line);
    const isBullet = line.startsWith('·');
    if (isHeader) return <p key={i} className="font-semibold text-slate-800 mt-3 first:mt-0">{line}</p>;
    if (isBullet) return <p key={i} className="text-slate-600 pl-2">{line}</p>;
    return <p key={i} className="text-slate-700 leading-relaxed">{line}</p>;
  });
}

// ─── Text Chat ────────────────────────────────────────────────────────────────
export function TextChat() {
  const [region, setRegion] = useState(REGIONS[0]);
  const [input, setInput]   = useState('');
  const [msgs, setMsgs]     = useState<ChatMsg[]>([]);
  const [running, setRunning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function scrollBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  async function send() {
    const txt = input.trim();
    if (!txt || running) return;
    setInput('');

    const userMsg: ChatMsg = { role: 'user', text: txt, region };
    const asstIdx = msgs.length + 1;
    setMsgs(prev => [...prev, userMsg, { role: 'assistant', text: '', streaming: true }]);
    setRunning(true);
    scrollBottom();

    try {
      const res = await fetch('/api/detect/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: txt, region }),
      });
      const reader = res.body!.getReader();
      const dec    = new TextDecoder();
      let buf = '', full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value);
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          try {
            const delta = JSON.parse(raw)?.choices?.[0]?.delta?.content;
            if (delta) {
              full += delta;
              setMsgs(prev => prev.map((m, i) => i === asstIdx ? { ...m, text: full } : m));
            }
          } catch { /* skip */ }
        }
      }
      const level = parseLevel(full);
      setMsgs(prev => prev.map((m, i) => i === asstIdx ? { ...m, text: full, streaming: false, level } : m));
    } catch {
      setMsgs(prev => prev.map((m, i) => i === asstIdx ? { ...m, text: '请求失败，请稍后重试', streaming: false } : m));
    } finally {
      setRunning(false);
      scrollBottom();
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const selectCls = 'appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-8 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all';

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-indigo-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">文本风险检测</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">输入营销文案、产品描述或广告语，AI 将分析其在目标市场的文化风险</p>
          </div>
        )}

        {msgs.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%]">
                {msg.region && (
                  <p className="text-right text-xs text-slate-400 mb-1 pr-1">{msg.region}</p>
                )}
                <div className="bg-indigo-600 text-white text-sm rounded-2xl rounded-br-sm px-4 py-3 leading-relaxed">
                  {msg.text}
                </div>
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="3" fill="#6366f1" opacity="0.9" />
                  <circle cx="8" cy="8" r="6.5" stroke="#6366f1" strokeWidth="1.2" opacity="0.4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm space-y-1">
                  {msg.text ? formatAnalysisText(msg.text) : null}
                  {msg.streaming && (
                    <span className="inline-flex gap-0.5 mt-1">
                      {[0, 0.2, 0.4].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${d}s` }} />
                      ))}
                    </span>
                  )}
                </div>
                {!msg.streaming && msg.level && (
                  <div className="mt-2 pl-1">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${LEVEL_CONFIG[msg.level].color}`}>
                      {LEVEL_CONFIG[msg.level].icon}
                      {LEVEL_CONFIG[msg.level].label}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="flex gap-2 items-end">
          <div className="relative">
            <select className={selectCls} value={region} onChange={e => setRegion(e.target.value)}>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
          <textarea
            className="flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all min-h-[42px] max-h-32"
            placeholder="输入营销文本，按 Enter 发送，Shift+Enter 换行…"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
          />
          <button
            onClick={send}
            disabled={running || !input.trim()}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Image Detect ─────────────────────────────────────────────────────────────
export function ImageDetect() {
  const [phase, setPhase]       = useState<ImagePhase>('upload');
  const [region, setRegion]     = useState(REGIONS[0]);
  const [imgFile, setImgFile]   = useState<File | null>(null);
  const [imgPreview, setPreview] = useState('');
  const [dragging, setDragging] = useState(false);
  const [steps, setSteps]       = useState<ImageStep[]>([
    { step: 1, status: 'idle' }, { step: 2, status: 'idle' },
    { step: 3, status: 'idle' }, { step: 4, status: 'idle' },
  ]);
  const fileRef = useRef<HTMLInputElement>(null);

  function resetAll() {
    setPhase('upload'); setImgFile(null); setPreview(''); setDragging(false);
    setSteps([{ step:1,status:'idle' },{ step:2,status:'idle' },{ step:3,status:'idle' },{ step:4,status:'idle' }]);
  }

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    setImgFile(file);
    const r = new FileReader();
    r.onload = e => setPreview(e.target?.result as string);
    r.readAsDataURL(file);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, []);

  async function run() {
    if (!imgFile) return;
    setPhase('running');
    setSteps([{ step:1,status:'idle' },{ step:2,status:'idle' },{ step:3,status:'idle' },{ step:4,status:'idle' }]);

    const base64 = await new Promise<string>(resolve => {
      const r = new FileReader();
      r.onload = e => resolve((e.target?.result as string).split(',')[1]);
      r.readAsDataURL(imgFile);
    });

    try {
      const res = await fetch('/api/detect/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: imgFile.type, region }),
      });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value);
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6).trim());
            if (evt.done) { setPhase('done'); break; }
            if (typeof evt.step === 'number') {
              setSteps(prev => prev.map(st =>
                st.step === evt.step
                  ? {
                      ...st,
                      status: evt.status,
                      content: evt.content ?? st.content,
                      level: evt.riskLevel
                        ? (evt.riskLevel === '高' ? 'high' : evt.riskLevel === '中' ? 'mid' : 'low')
                        : st.level,
                    }
                  : st
              ));
            }
          } catch { /* skip */ }
        }
      }
    } catch (e) { console.error(e); }
    setPhase('done');
  }

  const finalLevel = steps.find(st => st.step === 3)?.level ?? null;
  const selectCls = 'appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-8 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all';

  // ── Upload phase
  if (phase === 'upload') return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
            <Image className="w-6 h-6 text-indigo-400" />
          </div>
          <h3 className="font-semibold text-slate-800">图像风险检测</h3>
          <p className="text-xs text-slate-500 mt-1">上传商品图片，AI 四步工作流分析文化适配性</p>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer overflow-hidden ${
            dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-slate-100'
          }`}
          style={{ minHeight: 180 }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {imgPreview ? (
            <img src={imgPreview} className="w-full h-48 object-contain p-2" alt="preview" />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Upload className="w-8 h-8 mb-3 opacity-60" />
              <p className="text-sm font-medium">拖入图片或点击选择</p>
              <p className="text-xs mt-1">PNG · JPG · WEBP</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <select className={`${selectCls} w-full`} value={region} onChange={e => setRegion(e.target.value)}>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
          <button
            onClick={run}
            disabled={!imgFile}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
          >
            启动检测工作流
          </button>
        </div>
      </div>
    </div>
  );

  // ── Running / Done phase
  return (
    <div className="flex gap-5 h-full p-5 overflow-auto">
      {/* Left: image + verdict */}
      <div className="w-52 flex-shrink-0 space-y-3">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <img src={imgPreview} className="w-full h-40 object-contain bg-slate-50 p-2" alt="target" />
          <div className="px-3 py-2.5 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-700 truncate">{imgFile?.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">目标市场：{region}</p>
          </div>
        </div>

        {phase === 'done' && finalLevel && (
          <div className={`flex items-center gap-2.5 rounded-xl border p-3 ${LEVEL_CONFIG[finalLevel].color}`}>
            {LEVEL_CONFIG[finalLevel].icon}
            <div>
              <p className="text-xs text-slate-500">综合风险</p>
              <p className="font-bold text-sm">{LEVEL_CONFIG[finalLevel].label}</p>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <button
            onClick={resetAll}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-600 border border-slate-300 rounded-xl py-2 hover:border-slate-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重新上传
          </button>
        )}
      </div>

      {/* Right: workflow steps */}
      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold text-slate-700">AI 检测工作流</p>
          <span className="text-xs text-slate-400">{region}</span>
        </div>

        {steps.map((step, idx) => {
          const meta    = STEP_META[idx];
          const isIdle  = step.status === 'idle';
          const isRun   = step.status === 'running';
          const isDone  = step.status === 'done';
          return (
            <div
              key={step.step}
              className={`bg-white border rounded-2xl p-4 transition-all ${
                isRun ? 'border-indigo-300 shadow-sm shadow-indigo-100' :
                isDone ? 'border-emerald-200' :
                'border-slate-200 opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isDone ? 'bg-emerald-500 text-white' :
                  isRun  ? 'bg-indigo-600 text-white' :
                  'bg-slate-200 text-slate-500'
                }`}>
                  {isRun ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
                  ) : isDone ? '✓' : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
                  <p className="text-xs text-slate-400">{meta.desc}</p>
                </div>
                {isRun && <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">处理中</span>}
                {isDone && step.step === 3 && step.level && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${LEVEL_CONFIG[step.level].color}`}>
                    {LEVEL_CONFIG[step.level].label}
                  </span>
                )}
              </div>

              {isRun && (
                <div className="flex gap-1 mt-3 pl-10">
                  {[0, 0.2, 0.4].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${d}s` }} />
                  ))}
                </div>
              )}

              {isDone && step.content && (
                <div className="mt-3 pl-10 text-sm space-y-1">
                  {step.content.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i} className={line.startsWith('·') ? 'text-slate-600 pl-1' : 'text-slate-700 leading-relaxed'}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ToolDetect() {
  const [mode, setMode] = useState<Mode>('text');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex-shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-2 text-indigo-200 text-sm mb-4">
            <Link to="/tools" className="flex items-center gap-1 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              工具箱
            </Link>
            <span>/</span>
            <span>风控检测</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">风控检测</h1>
                <p className="text-indigo-200 text-sm mt-0.5">文化语义风险智能识别 · 支持文本与图像双模式</p>
              </div>
            </div>
            {/* Mode tabs */}
            <div className="flex bg-white/10 rounded-xl p-1 gap-1">
              <button
                onClick={() => setMode('text')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-indigo-200 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                文本检测
              </button>
              <button
                onClick={() => setMode('image')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'image' ? 'bg-white text-indigo-600 shadow-sm' : 'text-indigo-200 hover:text-white'
                }`}
              >
                <Image className="w-4 h-4" />
                图像检测
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 min-h-0">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-full" style={{ minHeight: 520 }}>
          {mode === 'text'  && <TextChat />}
          {mode === 'image' && <ImageDetect />}
        </div>
      </div>
    </div>
  );
}
