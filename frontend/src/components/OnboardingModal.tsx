import React, { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'lj_onboarding_seen';

const NODES = [
  { id: 1, label: '社区共创', desc: 'CoLab 汇聚跨境经验',     color: '#a78bfa', dark: '#7c3aed' },
  { id: 2, label: '知识赋能', desc: '集体洞察驱动工具',         color: '#818cf8', dark: '#4f46e5' },
  { id: 3, label: '智能决策', desc: '文化·利润·物流三位一体', color: '#38bdf8', dark: '#0891b2' },
  { id: 4, label: '商家服务', desc: '专业顾问助力落地',         color: '#34d399', dark: '#059669' },
  { id: 5, label: '出海成功', desc: '经验回流，飞轮加速',       color: '#fbbf24', dark: '#d97706' },
];

const RADIUS = 130;
const NODE_R = 40;
const CX = 200;
const CY = 200;
const TOTAL = 5;

function polarToXY(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(fromIdx: number) {
  const p1 = polarToXY((fromIdx / TOTAL) * 360 + 22, RADIUS);
  const p2 = polarToXY(((fromIdx + 1) / TOTAL) * 360 - 22, RADIUS);
  return `M ${p1.x} ${p1.y} A ${RADIUS} ${RADIUS} 0 0 1 ${p2.x} ${p2.y}`;
}

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [activeNode, setActiveNode] = useState<number | null>(null);

  useEffect(() => {
    if (window.innerWidth < 768) return;
    if (localStorage.getItem(STORAGE_KEY) === 'never') return;

    if (!document.getElementById('lj-modal-style')) {
      const style = document.createElement('style');
      style.id = 'lj-modal-style';
      style.textContent = `
        @keyframes lj-orbit { to { transform: rotate(360deg); } }
        @keyframes lj-pulse-ring { 0%,100%{opacity:.15;transform:scale(1);}50%{opacity:.38;transform:scale(1.1);} }
        @keyframes lj-fadein { from{opacity:0;transform:scale(.95) translateY(16px);}to{opacity:1;transform:scale(1) translateY(0);} }
      `;
      document.head.appendChild(style);
    }

    const t = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setVisible(false)}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-[700px] max-w-[92vw] rounded-2xl overflow-hidden"
        style={{
          animation: 'lj-fadein 0.4s cubic-bezier(0.16,1,0.3,1) both',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        <div className="p-7">
          {/* Close */}
          <button
            onClick={() => setVisible(false)}
            className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center mb-7">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
              style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.18)' }}
            >
              <Sparkles className="w-3 h-3" />
              灵径智链 · 价值飞轮
            </span>
            <h2
              className="text-[22px] font-bold tracking-tight"
              style={{
                background: 'linear-gradient(90deg, #7c3aed 0%, #4f46e5 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              五环驱动，出海增长闭环
            </h2>
          </div>

          {/* Body */}
          <div className="flex gap-6 items-center">
            {/* Flywheel SVG */}
            <svg
              width="400"
              height="400"
              viewBox="0 0 400 400"
              className="flex-shrink-0 w-[260px] h-[260px] md:w-[310px] md:h-[310px]"
            >
              <defs>
                <filter id="lj-arc-glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="lj-node-glow">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="lj-center-glow">
                  <feGaussianBlur stdDeviation="10" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {NODES.map((n, i) => (
                  <marker
                    key={i}
                    id={`lj-arrow-${i}`}
                    markerWidth="5"
                    markerHeight="5"
                    refX="4.5"
                    refY="2.5"
                    orient="auto"
                  >
                    <path d="M0,0 L0,5 L5,2.5 z" fill={n.color} />
                  </marker>
                ))}
              </defs>

              {/* Decorative ring */}
              <circle cx={CX} cy={CY} r={RADIUS + 20} fill="none"
                stroke="rgba(139,92,246,0.07)" strokeWidth="1" strokeDasharray="4 6" />
              {/* Track */}
              <circle cx={CX} cy={CY} r={RADIUS} fill="none"
                stroke="rgba(139,92,246,0.22)" strokeWidth="1.5" strokeDasharray="3 5" />

              {/* Colored arcs */}
              {NODES.map((node, i) => (
                <path
                  key={i}
                  d={arcPath(i)}
                  fill="none"
                  stroke={node.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  markerEnd={`url(#lj-arrow-${i})`}
                  filter="url(#lj-arc-glow)"
                  style={{
                    opacity: activeNode === null || activeNode === i ? 0.9 : 0.15,
                    transition: 'opacity 0.25s',
                  }}
                />
              ))}

              {/* Orbiting particle */}
              <g style={{ transformOrigin: `${CX}px ${CY}px`, animation: 'lj-orbit 5s linear infinite' }}>
                <circle cx={CX} cy={CY - RADIUS} r={5} fill="#7c3aed" opacity="0.9" filter="url(#lj-node-glow)" />
                <circle cx={CX} cy={CY - RADIUS} r={9} fill="#a78bfa" opacity="0.2" />
              </g>

              {/* Center glow */}
              <circle cx={CX} cy={CY} r={22} fill="rgba(124,58,237,0.12)" filter="url(#lj-center-glow)" />
              <circle cx={CX} cy={CY} r={18}
                fill="none" stroke="rgba(124,58,237,0.35)" strokeWidth="1.5"
                style={{ transformOrigin: `${CX}px ${CY}px`, animation: 'lj-pulse-ring 2.5s ease-in-out infinite' }}
              />
              <circle cx={CX} cy={CY} r={16}
                fill="#f5f3ff"
                stroke="rgba(124,58,237,0.45)" strokeWidth="1.5" />
              <text x={CX} y={CY - 3} textAnchor="middle" fontSize="9" fontWeight="800" fill="#7c3aed" style={{ fontFamily: 'inherit' }}>灵径</text>
              <text x={CX} y={CY + 9} textAnchor="middle" fontSize="9" fontWeight="800" fill="#7c3aed" style={{ fontFamily: 'inherit' }}>智链</text>

              {/* Nodes */}
              {NODES.map((node, i) => {
                const pos = polarToXY((i / TOTAL) * 360, RADIUS);
                const isActive = activeNode === i;
                return (
                  <g key={node.id} style={{ cursor: 'pointer' }} onClick={() => setActiveNode(isActive ? null : i)}>
                    {isActive && (
                      <circle cx={pos.x} cy={pos.y} r={NODE_R + 10}
                        fill="none" stroke={node.color} strokeWidth="1" opacity="0.3" />
                    )}
                    <circle
                      cx={pos.x} cy={pos.y} r={NODE_R}
                      fill={isActive ? `${node.dark}18` : '#ffffff'}
                      stroke={node.color}
                      strokeWidth={isActive ? 2 : 1.5}
                      filter={isActive ? 'url(#lj-node-glow)' : undefined}
                      style={{ transition: 'all 0.25s' }}
                    />
                    <text
                      x={pos.x} y={pos.y - 5} textAnchor="middle"
                      fontSize="10" fontWeight="700"
                      fill={isActive ? node.dark : '#334155'}
                      style={{ fontFamily: 'inherit', transition: 'fill 0.2s' }}
                    >
                      {node.label}
                    </text>
                    <text
                      x={pos.x} y={pos.y + 10} textAnchor="middle"
                      fontSize="8"
                      fill={isActive ? node.color : '#94a3b8'}
                      style={{ fontFamily: 'inherit', transition: 'fill 0.2s' }}
                    >
                      0{node.id}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Right: Node list */}
            <div className="flex-1 flex flex-col gap-2">
              {NODES.map((node, i) => (
                <button
                  key={node.id}
                  onClick={() => setActiveNode(activeNode === i ? null : i)}
                  className="text-left flex items-start gap-3 rounded-xl px-3.5 py-2.5 transition-all duration-200"
                  style={{
                    background: activeNode === i ? `${node.dark}10` : '#f8fafc',
                    border: `1px solid ${activeNode === i ? `${node.color}50` : '#e2e8f0'}`,
                  }}
                >
                  <span
                    className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                    style={{ background: node.dark }}
                  >
                    {node.id}
                  </span>
                  <div>
                    <p
                      className="text-sm font-semibold transition-colors duration-200"
                      style={{ color: activeNode === i ? node.dark : '#1e293b' }}
                    >
                      {node.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                      {node.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex justify-between items-center mt-6 pt-5"
            style={{ borderTop: '1px solid #e2e8f0' }}
          >
            <button
              onClick={() => {
                localStorage.setItem(STORAGE_KEY, 'never');
                setVisible(false);
              }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              不再显示
            </button>
            <button
              onClick={() => setVisible(false)}
              className="px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                boxShadow: '0 0 20px rgba(124,58,237,0.35)',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 30px rgba(124,58,237,0.55)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(124,58,237,0.35)')}
            >
              开始探索 →
            </button>
          </div>
        </div>


      </div>
    </div>
  );
}
