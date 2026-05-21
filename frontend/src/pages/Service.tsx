import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Sparkles, FileText, Search, Package, BarChart3 } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';

const PACKAGES = [
  {
    name: '快速前测',
    subtitle: 'Quick Diagnostic',
    price: '免费',
    priceNote: '社区用户专属',
    color: 'from-slate-100 to-slate-50',
    border: 'border-slate-200',
    buttonClass: 'bg-slate-800 text-white hover:bg-slate-700',
    ctaText: '免费体验',
    ctaHref: '/register',
    features: [
      '品牌文化适配度自动评分',
      '拉美市场竞争环境速览',
      '关键风险点提示（3项）',
      '工具箱体验资格',
    ],
  },
  {
    name: '标准出海方案',
    subtitle: 'Standard Package',
    price: '299 灵创值',
    priceNote: '约 7 个工作日',
    color: 'from-violet-600 to-indigo-600',
    border: 'border-violet-300',
    buttonClass: 'bg-violet-600 text-white hover:bg-violet-700',
    ctaText: '立即申请',
    ctaHref: '/register',
    highlight: true,
    features: [
      '全量市场文化适配报告',
      '拉美 6 国本地化文案（3 套）',
      '盈亏平衡定价建议',
      '物流方案对比推荐',
      '专属顾问 1 次在线答疑',
    ],
  },
  {
    name: '定制深度服务',
    subtitle: 'Enterprise Custom',
    price: '联系洽谈',
    priceNote: '企业 / 团队专属',
    color: 'from-amber-50 to-orange-50',
    border: 'border-amber-200',
    buttonClass: 'bg-amber-600 text-white hover:bg-amber-700',
    ctaText: '联系我们',
    ctaHref: 'mailto:hello@spirithub.com',
    features: [
      '品牌全链路出海战略规划',
      '多品类 SKU 本地化方案',
      'CoLab 专属协作团队支持',
      '季度复盘与数据看板',
      '优先接入最新 AI 模型能力',
    ],
  },
];

const STEPS = [
  { icon: Search,    label: '01 快速诊断', desc: '填写品牌信息，AI 自动生成文化适配评分与市场风险提示。' },
  { icon: FileText,  label: '02 方案交付', desc: '专业顾问结合工具输出，生成定制化出海策略报告。' },
  { icon: Package,   label: '03 落地支持', desc: '对接本地化文案、定价建议与物流推荐，全链路打通。' },
  { icon: BarChart3, label: '04 持续复盘', desc: '按周期提供数据复盘与策略迭代，确保出海持续优化。' },
];

export default function Service() {
  const { t } = useLocale();

  const packages = [
    {
      ...PACKAGES[0],
      name: t('快速前测', 'Quick Diagnostic'),
      subtitle: 'Quick Diagnostic',
      price: t('免费', 'Free'),
      priceNote: t('社区用户专属', 'For community users'),
      ctaText: t('免费体验', 'Try for Free'),
      features: [
        t('品牌文化适配度自动评分', 'Cultural fit auto score'),
        t('拉美市场竞争环境速览', 'LATAM market snapshot'),
        t('关键风险点提示（3项）', 'Top 3 key risks'),
        t('工具箱体验资格', 'Toolkit trial access'),
      ],
    },
    {
      ...PACKAGES[1],
      name: t('标准出海方案', 'Standard Package'),
      subtitle: 'Standard Package',
      price: t('299 灵创值', '299 credits'),
      priceNote: t('约 7 个工作日', 'About 7 business days'),
      ctaText: t('立即申请', 'Apply Now'),
      features: [
        t('全量市场文化适配报告', 'Full market cultural report'),
        t('拉美 6 国本地化文案（3 套）', 'Localized copy for 6 countries'),
        t('盈亏平衡定价建议', 'Break-even pricing advice'),
        t('物流方案对比推荐', 'Logistics option comparison'),
        t('专属顾问 1 次在线答疑', '1 online consultant session'),
      ],
    },
    {
      ...PACKAGES[2],
      name: t('定制深度服务', 'Enterprise Custom'),
      subtitle: 'Enterprise Custom',
      price: t('联系洽谈', 'Contact Us'),
      priceNote: t('企业 / 团队专属', 'For teams / enterprises'),
      ctaText: t('联系我们', 'Contact Us'),
      features: [
        t('品牌全链路出海战略规划', 'Full-chain go-global strategy'),
        t('多品类 SKU 本地化方案', 'Multi-SKU localization plan'),
        t('CoLab 专属协作团队支持', 'Dedicated CoLab support'),
        t('季度复盘与数据看板', 'Quarterly review dashboard'),
        t('优先接入最新 AI 模型能力', 'Priority access to new AI models'),
      ],
    },
  ];

  const steps = [
    { icon: Search, label: t('01 快速诊断', '01 Quick Scan'), desc: t('填写品牌信息，AI 自动生成文化适配评分与市场风险提示。', 'Fill in brand info and get cultural fit + risk hints.') },
    { icon: FileText, label: t('02 方案交付', '02 Strategy Delivery'), desc: t('专业顾问结合工具输出，生成定制化出海策略报告。', 'Consultants combine tools to deliver a tailored strategy report.') },
    { icon: Package, label: t('03 落地支持', '03 Execution Support'), desc: t('对接本地化文案、定价建议与物流推荐，全链路打通。', 'Connect localization, pricing, and logistics execution.') },
    { icon: BarChart3, label: t('04 持续复盘', '04 Continuous Review'), desc: t('按周期提供数据复盘与策略迭代，确保出海持续优化。', 'Periodic reviews and strategy iteration for ongoing growth.') },
  ];

  useEffect(() => {
    document.title = t('商家服务 - 灵创平台', 'Services - SpiritHub');
    return () => { document.title = t('灵创平台', 'SpiritHub'); };
  }, [t]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-sm font-semibold px-3 py-1 rounded-full mb-4 border border-amber-100">
          <Sparkles className="w-4 h-4" />
          {t('商家出海服务', 'Go-Global Services')}
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">{t('让国潮出海，不止被翻译，更被理解', 'Go global with understanding, not just translation')}</h1>
        <p className="text-slate-500 max-w-2xl mx-auto text-lg">
          {t('从市场诊断到方案落地，灵径智链为出海品牌提供文化转译、利润规划、物流优化的一体化服务。', 'From market diagnosis to execution, we provide integrated culture, profit, and logistics support.')}
        </p>
      </div>

      {/* Service Packages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {packages.map((pkg) => (
          <div
            key={pkg.name}
            className={`rounded-3xl border ${pkg.border} overflow-hidden flex flex-col ${pkg.highlight ? 'ring-2 ring-violet-500 shadow-xl shadow-violet-500/20' : 'shadow-sm'}`}
          >
            <div className={`bg-gradient-to-br ${pkg.color} p-6 ${pkg.highlight ? 'text-white' : 'text-slate-800'}`}>
              {pkg.highlight && (
                <div className="text-xs font-bold bg-white/20 rounded-full px-2.5 py-0.5 inline-block mb-3 text-white">
                  {t('推荐', 'Recommended')}
                </div>
              )}
              <h2 className="text-xl font-bold mb-0.5">{pkg.name}</h2>
              <p className={`text-xs font-mono mb-4 ${pkg.highlight ? 'text-white/70' : 'text-slate-400'}`}>{pkg.subtitle}</p>
              <div className={`text-2xl font-extrabold ${pkg.highlight ? 'text-white' : 'text-slate-900'}`}>{pkg.price}</div>
              <div className={`text-xs mt-1 ${pkg.highlight ? 'text-white/60' : 'text-slate-400'}`}>{pkg.priceNote}</div>
            </div>
            <div className="p-6 flex flex-col flex-1 bg-white">
              <ul className="space-y-3 flex-1 mb-6">
                {pkg.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              {pkg.ctaHref.startsWith('mailto') ? (
                <a
                  href={pkg.ctaHref}
                  className={`w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-colors block ${pkg.buttonClass}`}
                >
                  {pkg.ctaText}
                </a>
              ) : (
                <Link
                  to={pkg.ctaHref}
                  className={`w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-colors block ${pkg.buttonClass}`}
                >
                  {pkg.ctaText}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 4-step Process */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">{t('服务流程', 'Service Flow')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {steps.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-violet-600" />
              </div>
              <div className="font-bold text-slate-800 text-sm mb-1">{label}</div>
              <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
