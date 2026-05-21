import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, RefreshCcw } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';

interface Inputs {
  shippingUsd: string;
  exchangeRate: string;
  productCost: string;
  salesPrice: string;
  fixedCost: string;
}

const DEFAULTS: Inputs = {
  shippingUsd:   '8',
  exchangeRate:  '7.25',
  productCost:   '35',
  salesPrice:    '120',
  fixedCost:     '2000',
};

interface Scenario {
  key: string;
  labelZh: string;
  labelEn: string;
  tagZh: string;
  tagEn: string;
  tagColor: string;
  modifier: (i: Inputs) => Inputs;
}

const SCENARIOS: Scenario[] = [
  {
    key: 'bear',
    labelZh: '悲观：运费 +30%',
    labelEn: 'Bear case: shipping +30%',
    tagZh: '压力测试',
    tagEn: 'Stress Test',
    tagColor: 'text-red-600 bg-red-50 border-red-200',
    modifier: i => ({ ...i, shippingUsd: String(+(i.shippingUsd) * 1.3) }),
  },
  {
    key: 'base',
    labelZh: '基准：当前参数',
    labelEn: 'Baseline: current inputs',
    tagZh: '基准',
    tagEn: 'Baseline',
    tagColor: 'text-slate-600 bg-slate-50 border-slate-200',
    modifier: i => i,
  },
  {
    key: 'bull',
    labelZh: '乐观：运费 -20%',
    labelEn: 'Bull case: shipping -20%',
    tagZh: '乐观',
    tagEn: 'Optimistic',
    tagColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    modifier: i => ({ ...i, shippingUsd: String(+(i.shippingUsd) * 0.8) }),
  },
  {
    key: 'hike',
    labelZh: '提价 15%',
    labelEn: 'Raise price 15%',
    tagZh: '定价策略',
    tagEn: 'Pricing',
    tagColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    modifier: i => ({ ...i, salesPrice: String(+(i.salesPrice) * 1.15) }),
  },
  {
    key: 'cut',
    labelZh: '降价 10%',
    labelEn: 'Discount 10%',
    tagZh: '促销',
    tagEn: 'Promotion',
    tagColor: 'text-amber-700 bg-amber-50 border-amber-200',
    modifier: i => ({ ...i, salesPrice: String(+(i.salesPrice) * 0.9) }),
  },
  {
    key: 'lean',
    labelZh: '固定成本减半',
    labelEn: 'Cut fixed cost by half',
    tagZh: '精简运营',
    tagEn: 'Lean ops',
    tagColor: 'text-teal-700 bg-teal-50 border-teal-200',
    modifier: i => ({ ...i, fixedCost: String(+(i.fixedCost) * 0.5) }),
  },
];

function calc(i: Inputs) {
  const shippingUsd  = +i.shippingUsd  || 0;
  const exchangeRate = +i.exchangeRate || 7.25;
  const productCost  = +i.productCost  || 0;
  const salesPrice   = +i.salesPrice   || 1;
  const fixedCost    = +i.fixedCost    || 0;

  const shippingCny    = shippingUsd * exchangeRate;
  const totalVarCost   = shippingCny + productCost;
  const profitPerUnit  = salesPrice - totalVarCost;
  const marginRate     = (profitPerUnit / salesPrice) * 100;
  const breakEven      = profitPerUnit > 0 ? fixedCost / profitPerUnit : Infinity;
  return { shippingCny, totalVarCost, profitPerUnit, marginRate, breakEven };
}

function fmt(n: number, d = 2) {
  if (!isFinite(n)) return '∞';
  return n.toFixed(d);
}

// Simple SVG line chart
function BEPChart({ salesPrice, totalVarCost, fixedCost }: { salesPrice: number; totalVarCost: number; fixedCost: number }) {
  const { t, lang } = useLocale();
  const maxQ  = 200;
  const step  = 20;
  const W = 480, H = 220;
  const PL = 52, PR = 16, PT = 16, PB = 40;
  const cW = W - PL - PR, cH = H - PT - PB;

  const maxRev = salesPrice * maxQ;
  const maxCost = fixedCost + totalVarCost * maxQ;
  const maxY = Math.max(maxRev, maxCost, 1);

  const toX = (q: number) => PL + (q / maxQ) * cW;
  const toY = (v: number) => PT + cH - (v / maxY) * cH;

  const revPts = [0, maxQ].map(q => `${toX(q)},${toY(salesPrice * q)}`).join(' ');
  const costPts = [0, maxQ].map(q => `${toX(q)},${toY(fixedCost + totalVarCost * q)}`).join(' ');

  // BEP quantity
  const bepQ = (salesPrice - totalVarCost) > 0 ? fixedCost / (salesPrice - totalVarCost) : null;
  const bepX = bepQ !== null && bepQ <= maxQ ? toX(bepQ) : null;

  const xTicks = Array.from({ length: maxQ / step + 1 }, (_, i) => i * step);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => r * maxY);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
      {/* Grid */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PL} y1={toY(v)} x2={PL + cW} y2={toY(v)} stroke="#e2e8f0" strokeWidth="1" />
          <text x={PL - 4} y={toY(v) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
            {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : fmt(v, 0)}
          </text>
        </g>
      ))}
      {xTicks.map(q => (
        <text key={q} x={toX(q)} y={H - PT + 4} textAnchor="middle" fontSize="10" fill="#94a3b8">{q}</text>
      ))}

      {/* Lines */}
      <polyline points={revPts} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
      <polyline points={costPts} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 3" />

      {/* BEP marker */}
      {bepX !== null && bepQ !== null && (
        <>
          <line x1={bepX} y1={PT} x2={bepX} y2={PT + cH} stroke="#6366f1" strokeWidth="1" strokeDasharray="4 2" opacity="0.5" />
          <circle cx={bepX} cy={toY(salesPrice * bepQ)} r="4" fill="#6366f1" />
          <text x={bepX + 5} y={toY(salesPrice * bepQ) - 6} fontSize="10" fill="#4f46e5">
            {lang === 'en' ? `BEP ${fmt(bepQ, 0)} units` : `BEP ${fmt(bepQ, 0)}件`}
          </text>
        </>
      )}

      {/* Legend */}
      <rect x={PL} y={PT} width="10" height="3" fill="#6366f1" rx="1" />
      <text x={PL + 14} y={PT + 4} fontSize="10" fill="#6366f1">{t('营收', 'Revenue')}</text>
      <rect x={PL + 52} y={PT} width="10" height="3" fill="#f97316" rx="1" />
      <text x={PL + 66} y={PT + 4} fontSize="10" fill="#f97316">{t('总成本', 'Total Cost')}</text>

      {/* Axes */}
      <line x1={PL} y1={PT} x2={PL} y2={PT + cH} stroke="#cbd5e1" strokeWidth="1" />
      <line x1={PL} y1={PT + cH} x2={PL + cW} y2={PT + cH} stroke="#cbd5e1" strokeWidth="1" />
    </svg>
  );
}

export default function ToolProfit() {
  const { t, lang } = useLocale();
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);

  const res = useMemo(() => calc(inputs), [inputs]);
  const isProfit = res.profitPerUnit > 0;

  function set(k: keyof Inputs, v: string) {
    setInputs(prev => ({ ...prev, [k]: v }));
  }

  function reset() { setInputs(DEFAULTS); }

  const MetricCard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );

  const InputField = ({ label, k, prefix, suffix }: { label: string; k: keyof Inputs; prefix?: string; suffix?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-400 bg-white transition-all">
        {prefix && <span className="px-2 text-slate-400 text-sm bg-slate-50 border-r border-slate-300 py-2">{prefix}</span>}
        <input
          type="number"
          min="0"
          step="any"
          className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
          value={inputs[k]}
          onChange={e => set(k, e.target.value)}
        />
        {suffix && <span className="px-2 text-slate-400 text-sm bg-slate-50 border-l border-slate-300 py-2">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-emerald-200 text-sm mb-2">
            <Link to="/tools" className="flex items-center gap-1 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              {t('工具箱', 'Toolkit')}
            </Link>
            <span>/</span>
            <span>ProfitLab</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t('ProfitLab 利润量化', 'ProfitLab Analytics')}</h1>
                <p className="text-emerald-200 text-sm mt-0.5">{t('实时盈亏平衡分析 · 情景压力测试', 'Real-time break-even analysis · Scenario stress test')}</p>
              </div>
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              {t('重置参数', 'Reset')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Input Card */}
          <div>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden sticky top-6">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                <h2 className="text-sm font-bold text-slate-700">{t('成本 & 定价参数', 'Cost & Pricing Inputs')}</h2>
              </div>
              <div className="p-5 space-y-4">
                <InputField label={t('国际运费', 'Shipping')} k="shippingUsd" suffix={t('USD/件', 'USD/unit')} />
                <InputField label={t('汇率', 'Exchange Rate')} k="exchangeRate" prefix="1 USD =" suffix="CNY" />
                <InputField label={t('商品成本', 'Product Cost')} k="productCost" suffix={t('CNY/件', 'CNY/unit')} />
                <InputField label={t('销售定价', 'Sale Price')} k="salesPrice" suffix={t('CNY/件', 'CNY/unit')} />
                <InputField label={t('月度固定成本', 'Monthly Fixed Cost')} k="fixedCost" suffix={t('CNY/月', 'CNY/month')} />

                <div className="mt-2 rounded-xl bg-emerald-50 border border-emerald-100 p-4 space-y-2.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">{t('运费折算（CNY）', 'Shipping in CNY')}</span>
                    <span className="font-semibold text-slate-800">¥{fmt(res.shippingCny)}</span>
                  </div>
                  <div className="h-px bg-emerald-100" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">{t('单件总变动成本', 'Total variable cost / unit')}</span>
                    <span className="font-semibold text-slate-800">¥{fmt(res.totalVarCost)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Metrics + Chart + Scenarios */}
          <div className="lg:col-span-2 space-y-6">

            {/* Metric Cards */}
            <div className="grid grid-cols-3 gap-4">
              <MetricCard
                label={t('单件利润', 'Profit / Unit')}
                value={`¥${fmt(res.profitPerUnit)}`}
                color={isProfit ? 'text-emerald-600' : 'text-red-500'}
              />
              <MetricCard
                label={t('利润率', 'Margin')}
                value={`${fmt(res.marginRate, 1)}%`}
                color={res.marginRate >= 20 ? 'text-emerald-600' : res.marginRate > 0 ? 'text-amber-600' : 'text-red-500'}
              />
              <MetricCard
                label={t('盈亏平衡', 'Break-even')}
                value={isProfit ? `${fmt(res.breakEven, 0)} ${t('件', 'units')}` : '∞'}
                sub={t('月度销量目标', 'Monthly sales target')}
                color={isProfit ? 'text-indigo-600' : 'text-red-500'}
              />
            </div>

            {/* BEP Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">{t('盈亏平衡分析图', 'Break-even Chart')}</h3>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5 h-0.5 bg-indigo-500 rounded" />{t('营收曲线', 'Revenue')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5 h-0.5 bg-orange-400 rounded border-dashed border border-orange-300" />{t('总成本', 'Total Cost')}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <BEPChart
                  salesPrice={+inputs.salesPrice || 1}
                  totalVarCost={res.totalVarCost}
                  fixedCost={+inputs.fixedCost || 0}
                />
                <p className="text-xs text-slate-400 mt-3 text-center">{t('横轴：销量（件） · 纵轴：金额（CNY）', 'X-axis: unit volume · Y-axis: amount (CNY)')}</p>
              </div>
            </div>

            {/* Scenarios */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-700">{t('情景压力测试', 'Scenario Stress Tests')}</h3>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SCENARIOS.map(sc => {
                  const r = calc(sc.modifier(inputs));
                  const ok = r.profitPerUnit > 0;
                  return (
                    <div key={sc.key} className={`border rounded-xl p-4 ${sc.tagColor}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold">{lang === 'en' ? sc.labelEn : sc.labelZh}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sc.tagColor}`}>
                          {lang === 'en' ? sc.tagEn : sc.tagZh}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                            <p className="text-slate-500 mb-0.5">{t('单件利润', 'Profit / unit')}</p>
                          <p className={`font-bold text-sm ${ok ? '' : 'text-red-500'}`}>¥{fmt(r.profitPerUnit)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 mb-0.5">{t('利润率', 'Margin')}</p>
                          <p className="font-bold text-sm">{fmt(r.marginRate, 1)}%</p>
                        </div>
                        <div>
                          <p className="text-slate-500 mb-0.5">BEP</p>
                            <p className="font-bold text-sm">{ok ? `${fmt(r.breakEven, 0)}${t('件', 'units')}` : '∞'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
