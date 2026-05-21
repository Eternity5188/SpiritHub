import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, TrendingUp, Package, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';

const TOOLS = [
  {
    id: 'copywriter',
    path: '/tools/copywriter',
    icon: Globe,
    iconBg: 'from-indigo-500 to-violet-600',
    badge: '文化转译',
    title: '灵境文化转译',
    subtitle: 'Cultural Intelligence Engine',
    desc: '基于大模型的跨境营销文案生成工具，覆盖拉美六大市场，帮助品牌在出海过程中提升内容本地化质量。',
    features: ['六大拉美市场覆盖', '多平台文案场景', 'AI 智能生成', '一键翻译'],
    tag: '核心·文化层',
    tagColor: 'bg-violet-100 text-violet-700',
    cost: 10,
  },
  {
    id: 'profit',
    path: '/tools/profit',
    icon: TrendingUp,
    iconBg: 'from-emerald-500 to-teal-600',
    badge: 'ProfitLab',
    title: 'ProfitLab 利润量化',
    subtitle: 'Profit Analytics Platform',
    desc: '专为跨境电商设计的实时盈亏平衡分析工具，支持情景压力测试，帮助卖家快速定价、优化成本结构。',
    features: ['盈亏平衡点可视化', '汇率 / 运费敏感度', '多情景压力测试', 'AI 财务分析'],
    tag: '核心·商业层',
    tagColor: 'bg-emerald-100 text-emerald-700',
    cost: 5,
  },
  {
    id: 'logistics',
    path: '/tools/logistics',
    icon: Package,
    iconBg: 'from-sky-500 to-blue-600',
    badge: 'Puente',
    title: 'Puente 物流追踪',
    subtitle: 'Logistics Intelligence Hub',
    desc: '面向拉美市场的跨境物流可视化平台，提供订单全生命周期追踪、状态看板与物流数据分析。',
    features: ['订单全链路追踪', '实时状态看板', '清关节点预警', '物流数据分析'],
    tag: '核心·物流层',
    tagColor: 'bg-sky-100 text-sky-700',
    cost: 3,
  },
];

export default function Tools() {
  const { t } = useLocale();

  const tools = [
    {
      ...TOOLS[0],
      badge: t('文化转译', 'Cultural AI'),
      title: t('灵境文化转译', 'SpiritHub Cultural Transcreation'),
      desc: t('基于大模型的跨境营销文案生成工具，覆盖拉美六大市场，帮助品牌在出海过程中提升内容本地化质量。', 'AI-assisted marketing copy generation across six LATAM markets for localized growth.'),
      features: [
        t('六大拉美市场覆盖', '6 LATAM markets'),
        t('多平台文案场景', 'Multi-platform copy scenes'),
        t('AI 智能生成', 'AI generation'),
        t('一键翻译', 'One-click translation'),
      ],
      tag: t('核心·文化层', 'Core · Culture'),
    },
    {
      ...TOOLS[1],
      badge: 'ProfitLab',
      title: t('ProfitLab 利润量化', 'ProfitLab Analytics'),
      desc: t('专为跨境电商设计的实时盈亏平衡分析工具，支持情景压力测试，帮助卖家快速定价、优化成本结构。', 'Break-even and scenario analytics for pricing and cross-border margin optimization.'),
      features: [
        t('盈亏平衡点可视化', 'Break-even visualization'),
        t('汇率 / 运费敏感度', 'FX / shipping sensitivity'),
        t('多情景压力测试', 'Scenario stress tests'),
        t('AI 财务分析', 'AI finance insights'),
      ],
      tag: t('核心·商业层', 'Core · Business'),
    },
    {
      ...TOOLS[2],
      badge: 'Puente',
      title: t('Puente 物流追踪', 'Puente Logistics Tracking'),
      desc: t('面向拉美市场的跨境物流可视化平台，提供订单全生命周期追踪、状态看板与物流数据分析。', 'Cross-border logistics tracking with lifecycle visibility and status dashboards.'),
      features: [
        t('订单全链路追踪', 'End-to-end tracking'),
        t('实时状态看板', 'Real-time dashboard'),
        t('清关节点预警', 'Customs alerts'),
        t('物流数据分析', 'Logistics analytics'),
      ],
      tag: t('核心·物流层', 'Core · Logistics'),
    },
  ];

  useEffect(() => {
    document.title = t('工具箱 - 灵创平台', 'Toolkit - SpiritHub');
    return () => { document.title = t('灵创平台', 'SpiritHub'); };
  }, [t]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-600 text-sm font-semibold px-3 py-1 rounded-full mb-4">
          <span>{t('一核两翼', 'One Core, Two Wings')}</span>
          <ChevronRight className="w-4 h-4" />
          <span>{t('工具箱', 'Toolkit')}</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">{t('灵创工具箱', 'SpiritHub Toolkit')}</h1>
        <p className="text-slate-600 max-w-2xl">
          {t('集成文化智能、利润量化与物流追踪三大核心工具，助力跨境文创品牌从内容生产到商业落地的全链路数字化赋能。', 'An integrated stack for cultural intelligence, profit analytics, and logistics tracking.')}
        </p>
      </div>

      {/* Tool Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-primary-200 hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 flex flex-col group"
            >
              <div className={`bg-gradient-to-br ${tool.iconBg} p-6 text-white`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-white/20 text-white">
                    {tool.badge}
                  </span>
                </div>
                <h2 className="text-xl font-bold mb-1">{tool.title}</h2>
                <p className="text-white/70 text-xs font-mono tracking-wide">{tool.subtitle}</p>
              </div>

              <div className="p-6 flex flex-col flex-1">
                <p className="text-slate-600 text-sm leading-relaxed mb-5">{tool.desc}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {tool.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0"></span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${tool.tagColor}`}>
                      {tool.tag}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 font-medium">
                      <Sparkles className="w-3 h-3" />
                      {tool.cost} {t('灵创值/次', 'credits/use')}
                    </span>
                  </div>
                  <Link
                    to={tool.path}
                    className="btn-primary text-sm py-2 px-4 flex items-center justify-center gap-1.5 w-full"
                  >
                    {t('开始使用', 'Start')}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
