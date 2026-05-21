import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, ChevronDown, Loader2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

/** 简易 Markdown 渲染：支持 **bold**、有序/无序列表、换行 */
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  const renderInline = (line: string, key: number): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let idx = 0;
    while ((m = regex.exec(line)) !== null) {
      if (m.index > last) parts.push(<span key={idx++}>{line.slice(last, m.index)}</span>);
      parts.push(<strong key={idx++}>{m[1]}</strong>);
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(<span key={idx++}>{line.slice(last)}</span>);
    return <React.Fragment key={key}>{parts}</React.Fragment>;
  };

  lines.forEach((line, i) => {
    const numberedMatch = line.match(/^(\d+)\.\s(.*)$/);
    const bulletMatch = line.match(/^[-*]\s(.*)$/);
    if (numberedMatch) {
      elements.push(
        <div key={i} className="flex gap-1.5 my-0.5">
          <span className="font-semibold flex-shrink-0">{numberedMatch[1]}.</span>
          <span>{renderInline(numberedMatch[2], i)}</span>
        </div>
      );
    } else if (bulletMatch) {
      elements.push(
        <div key={i} className="flex gap-1.5 my-0.5">
          <span className="flex-shrink-0 text-primary-500">•</span>
          <span>{renderInline(bulletMatch[1], i)}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1.5" />);
    } else {
      elements.push(<div key={i}>{renderInline(line, i)}</div>);
    }
  });

  return <div className="space-y-px">{elements}</div>;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME = '你好！我是灵灵，灵创社区的智能助手 ✨\n有什么关于平台使用的问题，随时问我哦！';
const BTN = 56;

export default function AiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: WELCOME },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // drag & snap
  const [posX, setPosX] = useState(() => window.innerWidth - BTN - 4);
  const [posY, setPosY] = useState(() => window.innerHeight * 0.65);
  const [side, setSide] = useState<'left' | 'right' | null>('right');
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ sx: number; sy: number; ix: number; iy: number; moved: boolean } | null>(null);

  // 键盘弹出时面板自适应
  const [panelBottom, setPanelBottom] = useState(16);
  const [panelMaxH, setPanelMaxH] = useState(512);
  const [panelHeight, setPanelHeight] = useState(480);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeDragRef = useRef<{ startY: number; startH: number } | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // 键盘弹出时动态调整面板位置与高度
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const available = vv.height - 32;
      setPanelMaxH(Math.min(available, 512));
      setPanelBottom(window.innerHeight - vv.offsetTop - vv.height + 8);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, [open]);

  // 点击面板外部时收起（不清空消息）
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // 面板高度拖拽（桌面端）
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeDragRef.current = { startY: e.clientY, startH: panelHeight };
  };
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizeDragRef.current) return;
      const dy = resizeDragRef.current.startY - e.clientY;
      const newH = Math.max(300, Math.min(window.innerHeight - 120, resizeDragRef.current.startH + dy));
      setPanelHeight(newH);
    };
    const onMouseUp = () => { resizeDragRef.current = null; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
  }, []);

  // 拖拽 handlers
  const SNAP_DIST = 20; // 距边缘多少 px 内吸附
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ix: posX, iy: posY, moved: false };
    setIsDragging(true);
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
    const newX = Math.max(0, Math.min(window.innerWidth - BTN, dragRef.current.ix + dx));
    const newY = Math.max(72, Math.min(window.innerHeight - BTN - 16, dragRef.current.iy + dy));
    setPosX(newX);
    setPosY(newY);
    setSide(null); // 拖动中不吸附
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    const moved = dragRef.current.moved;
    dragRef.current = null;
    setIsDragging(false);
    setIsHovered(false);
    if (!moved) { setOpen(true); return; }
    // 松手时吸附判断
    if (posX < SNAP_DIST) {
      setSide('left');
    } else if (posX > window.innerWidth - BTN - SNAP_DIST) {
      setSide('right');
    } else {
      setSide(null); // 悬浮在中间
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMsg = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);

    // 添加空 assistant 占位
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) throw new Error('请求失败');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const json = JSON.parse(data);
            if (json.error) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: json.error };
                return updated;
              });
            } else if (json.content) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: (updated[updated.length - 1].content || '') + json.content,
                };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'AI 服务暂时不可用，请稍后再试 🙏' };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // tab 模式：吸附到边缘且未交互
  const tabMode = side !== null && !isDragging && !isHovered && !open;

  const btnStyle: React.CSSProperties = side === null
    ? {
        // 自由悬浮
        position: 'fixed', top: posY, left: posX,
        width: BTN, height: BTN, borderRadius: '9999px', zIndex: 50,
        transition: isDragging ? 'none' : 'transform 0.2s ease',
      }
    : {
        // 吸附到边缘
        position: 'fixed', top: posY, zIndex: 50,
        [side]: 0, width: BTN, height: BTN,
        transform: tabMode
          ? `translateX(${side === 'right' ? '50%' : '-50%'})`
          : 'translateX(0)',
        borderRadius: tabMode
          ? (side === 'right' ? '9999px 0 0 9999px' : '0 9999px 9999px 0')
          : '9999px',
        transition: isDragging
          ? 'none'
          : 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), border-radius 0.35s ease',
      };

  const panelSideStyle = side === 'left' ? { left: 8 } : { right: 8 };

  return (
    <>
      {/* 浮动按钮 */}
      {!open && (
        <button
          style={btnStyle}
          className="bg-white/95 backdrop-blur-sm border border-violet-200/80 text-violet-600 shadow-xl shadow-violet-200/40 flex items-center justify-center select-none touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => { if (!isDragging) setIsHovered(false); }}
          title="灵灵智能助手"
        >
          <span className={`transition-all duration-300 ${tabMode ? 'opacity-100 scale-100' : 'opacity-0 scale-75 absolute'}`}>
            {side === 'right' ? <ChevronLeft className="w-8 h-8" style={{ strokeWidth: 2.8 }} /> : <ChevronRight className="w-8 h-8" style={{ strokeWidth: 2.8 }} />}
          </span>
          <span className={`transition-all duration-300 ${!tabMode ? 'opacity-100 scale-100' : 'opacity-0 scale-75 absolute'}`}>
            <Sparkles className="w-6 h-6" />
          </span>
        </button>
      )}

      {/* 聊天面板 */}
      {open && (
        <div ref={panelRef}
          style={{ ...panelSideStyle, position: 'fixed', bottom: panelBottom, zIndex: 50, maxHeight: panelMaxH, height: panelHeight }}
          className="w-80 sm:w-96 flex flex-col bg-white/75 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
          {/* 拖拽调整高度手柄 */}
          <div
            className="flex-shrink-0 flex items-center justify-center h-4 cursor-ns-resize bg-white/30 hover:bg-violet-50/60 transition-colors group select-none"
            onMouseDown={handleResizeMouseDown}
          >
            <div className="w-8 h-1 rounded-full bg-slate-300/80 group-hover:bg-violet-300 transition-colors" />
          </div>
          {/* 顶栏 */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100/70 bg-white/50 backdrop-blur-sm flex-shrink-0">
            <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">灵灵智能助手</p>
              <p className="text-xs text-slate-400">在线 · 随时为您解答</p>
            </div>
            <button onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100/80 transition-colors text-slate-500">
              <ChevronDown className="w-4 h-4" />
            </button>
            <button onClick={() => { setOpen(false); setMessages([{ role: 'assistant', content: WELCOME }]); }}
              className="p-1 rounded-lg hover:bg-slate-100/80 transition-colors text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 消息区 */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-white/20">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                )}
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-tr-sm'
                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm shadow-sm'
                }`}>
                  {msg.content ? (
                    msg.role === 'assistant'
                      ? <MarkdownText text={msg.content} />
                      : <span className="whitespace-pre-wrap">{msg.content}</span>
                  ) : (i === messages.length - 1 && loading ? (
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>思考中…</span>
                    </span>
                  ) : null)}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 输入区 */}
          <div className="flex-shrink-0 px-3 py-2 border-t border-slate-100/70 bg-white/60 backdrop-blur-sm flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="有什么疑问都可以问我…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-200/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 bg-white/60 backdrop-blur-sm text-slate-800 placeholder:text-slate-400 max-h-24"
              style={{ minHeight: '2.5rem' }}
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 hover:opacity-90 disabled:opacity-30 text-white flex items-center justify-center transition-opacity flex-shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
