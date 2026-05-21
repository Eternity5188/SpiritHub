import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Globe, BookOpen, Users, Lightbulb, CheckCircle, FlaskConical, FileText, MessageSquare, Trophy, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { scienceApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import type { ScienceGroup } from '../types';

const TOPICS = [
  {
    icon: Globe,
    title: '文化适配研究',
    titleEn: 'Cultural Adaptation Research',
    headerCls: 'from-violet-500 via-purple-500 to-indigo-600',
    blob1: 'bg-violet-300',
    blob2: 'bg-fuchsia-400',
    tagCls: 'bg-violet-50 text-violet-600 border border-violet-100',
    accentLine: 'from-violet-400 to-indigo-400',
    desc: '深入分析拉美各国消费文化差异，研究国潮品牌的本地化表达策略与文化符号转译方法论。',
    descEn: 'Analyze consumer culture differences across LATAM and study localization strategies for Chinese cultural brands.',
    tags: ['语言适配', '符号研究', '消费心理'],
    tagsEn: ['Language Adaptation', 'Symbol Studies', 'Consumer Psychology'],
  },
  {
    icon: BookOpen,
    title: '出海知识图谱',
    titleEn: 'Go-Global Knowledge Graph',
    headerCls: 'from-emerald-400 via-teal-500 to-cyan-600',
    blob1: 'bg-emerald-300',
    blob2: 'bg-sky-300',
    tagCls: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    accentLine: 'from-emerald-400 to-teal-400',
    desc: '汇聚跨境电商、清关合规、物流履约等领域的实战案例与方法论，形成可复用的知识资产。',
    descEn: 'Collect practical cases and methods in cross-border ecommerce, customs compliance, and logistics fulfillment.',
    tags: ['清关合规', '物流网络', '市场准入'],
    tagsEn: ['Customs Compliance', 'Logistics Network', 'Market Access'],
  },
  {
    icon: Lightbulb,
    title: '前沿洞察研究',
    titleEn: 'Frontier Insight Research',
    headerCls: 'from-amber-400 via-orange-500 to-rose-500',
    blob1: 'bg-amber-300',
    blob2: 'bg-pink-400',
    tagCls: 'bg-amber-50 text-amber-700 border border-amber-100',
    accentLine: 'from-amber-400 to-orange-400',
    desc: '追踪拉美电商市场趋势、新兴消费场景与平台生态演变，定期发布深度市场洞察报告。',
    descEn: 'Track LATAM ecommerce trends, emerging consumption scenarios, and evolving platform ecosystems.',
    tags: ['市场趋势', '平台生态', '新兴场景'],
    tagsEn: ['Market Trends', 'Platform Ecosystem', 'Emerging Scenarios'],
  },
];

const CRITERIA = [
  { zh: '在 CoLab 社区发布至少 1 篇原创研究帖', en: 'Publish at least 1 original research post in CoLab' },
  { zh: '灵创值积分 ≥ 100 分', en: 'Earn at least 100 credits' },
  { zh: '通过社区版主审核，认证出海经验', en: 'Pass moderator review and verify go-global experience' },
  { zh: '承诺每月参与 1 次科学组研讨', en: 'Commit to at least 1 science group discussion per month' },
];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  recruiting: { label: '招募中', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  active: { label: '进行中', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  closed: { label: '已关闭', cls: 'bg-slate-100 text-slate-500 border border-slate-200' },
};
const STATUS_LABEL_EN: Record<string, string> = {
  recruiting: 'Recruiting',
  active: 'Active',
  closed: 'Closed',
};

// 创建科学组 Modal（仅管理员）
function CreateGroupModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { t } = useLocale();
  const [form, setForm] = useState({ name: '', description: '', research_domain: '', max_members: 12, tags: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string | number) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError(t('请填写科学组名称', 'Please enter a group name')); return; }
    if (!form.research_domain.trim()) { setError(t('请填写研究领域', 'Please enter a research field')); return; }
    setSubmitting(true);
    try {
      const tags = form.tags.split('，').concat(form.tags.split(',')).map(t => t.trim()).filter(Boolean);
      const uniqueTags = [...new Set(tags)];
      await scienceApi.create({ ...form, tags: uniqueTags });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || t('创建失败，请稍后重试', 'Creation failed. Please try again later.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">{t('创建新科学组', 'Create a Science Group')}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{t('仅管理员可创建科学组', 'Only admins can create science groups')}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('科学组名称', 'Group Name')} <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('例：国潮出海研究组', 'e.g. LATAM Go-Global Research')} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('研究领域', 'Research Field')} <span className="text-red-500">*</span></label>
            <input value={form.research_domain} onChange={e => set('research_domain', e.target.value)} placeholder={t('例：文化与市场', 'e.g. Culture & Markets')} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('简介', 'Description')}</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder={t('科学组的研究方向和目标…', 'Research focus and goals...')} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('最多成员数', 'Max Members')}</label>
              <input type="number" min={2} max={50} value={form.max_members} onChange={e => set('max_members', Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('标签（逗号分隔）', 'Tags (comma-separated)')}</label>
              <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder={t('国潮,拉美,跨境', 'LATAM, cross-border, culture')} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">{t('取消', 'Cancel')}</button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors">
            {submitting ? t('创建中…', 'Creating...') : t('创建科学组', 'Create Group')}
          </button>
        </div>
      </div>
    </div>
  );
}

// 申请加入 Modal
function ApplyModal({ group, onClose, onSuccess }: {
  group: ScienceGroup; onClose: () => void; onSuccess: () => void;
}) {
  const { t } = useLocale();
  const [statement, setStatement] = useState('');
  const [background, setBackground] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (statement.trim().length < 20) { setError(t('申请理由至少 20 个字', 'Please write at least 20 characters')); return; }
    setSubmitting(true);
    try {
      await scienceApi.apply(group.id, { statement, research_background: background });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || t('申请提交失败', 'Application submission failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">{t('申请加入科学组', 'Apply to Join')}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{group.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('申请理由', 'Application Statement')} <span className="text-red-500">*</span></label>
            <textarea
              value={statement}
              onChange={e => setStatement(e.target.value)}
              placeholder={t('介绍你对本科学组研究方向的理解与热情，以及你希望贡献什么（至少 20 字）', 'Describe your understanding, enthusiasm, and what you can contribute (20+ chars)')}
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <p className="text-xs text-slate-400 mt-1">{statement.length} / {t('建议 50+ 字', 'Recommended 50+ chars')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('研究背景（选填）', 'Research Background (optional)')}</label>
            <textarea
              value={background}
              onChange={e => setBackground(e.target.value)}
              placeholder={t('你在出海领域的研究经历、成果或相关背景…', 'Your go-global research experience, outcomes, or background...')}
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
            {t('取消', 'Cancel')}
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors">
            {submitting ? t('提交中…', 'Submitting...') : t('提交申请', 'Submit Application')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ColabScience() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLocale();
  const [groups, setGroups] = useState<ScienceGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [applyTarget, setApplyTarget] = useState<ScienceGroup | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    scienceApi.list().then(r => setGroups(r.data.groups)).catch(() => {}).finally(() => setLoadingGroups(false));
  }, []);

  const handleApply = (group: ScienceGroup) => {
    if (!user) { navigate('/login'); return; }
    setApplyTarget(group);
  };

  const handleApplySuccess = () => {
    setApplyTarget(null);
    toast.success(t('申请已提交！组长审核通过后您将自动加入，并获得 30 灵创値奖励。', 'Application submitted. You will join automatically after approval and earn 30 credits.'));
  };

  const handleCreateSuccess = () => {
    setShowCreate(false);
    toast.success(t('科学组创建成功！', 'Science group created successfully!'));
    scienceApi.list().then(r => setGroups(r.data.groups)).catch(() => {});
  };

  const handleDelete = async (group: ScienceGroup) => {
    toast(t(`确认删除「${group.name}」？该科学组的所有成员、文件、讨论将一并清除，且不可恢复。`, `Delete "${group.name}"? This will permanently remove its members, files, and discussions.`), {
      action: { label: t('确认删除', 'Delete'), onClick: async () => {
        try {
          await scienceApi.deleteGroup(group.id);
          setGroups(prev => prev.filter(g => g.id !== group.id));
          toast.success(t(`「${group.name}」已删除。`, `"${group.name}" deleted.`));
        } catch (err: any) {
          toast.error(err.response?.data?.error || t('删除失败', 'Delete failed'));
        }
      }},
      cancel: { label: t('取消', 'Cancel'), onClick: () => {} },
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-sm font-semibold px-3 py-1 rounded-full mb-4 border border-violet-100">
          <Sparkles className="w-4 h-4" />
          {t('CoLab · 科学组', 'CoLab · Science Group')}
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">
          {t('开放协作，', 'Open collaboration, ')}<span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">{t('共建出海智识', 'build go-global knowledge')}</span>
        </h1>
        <p className="text-slate-500 max-w-2xl mx-auto text-lg">
          {t('CoLab 科学组是面向深度出海研究者的开放协作社群，汇聚文化学者、跨境实践者与 AI 工具爱好者，共同构建国潮出海的知识底座。', 'CoLab Science is an open collaboration community for serious go-global researchers, bringing together culture scholars, cross-border practitioners, and AI tool enthusiasts.')}
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <button
            onClick={() => document.getElementById('science-list')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 bg-violet-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-violet-700 transition-colors shadow-md shadow-violet-500/30"
          >
            {t('浏览科学组', 'Browse Groups')} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 平台优势 vs 普通IM */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
        {[
          { icon: FileText, label: t('PDF / Word / 图片', 'PDF / Word / Images'), sub: t('多格式知识库', 'Multi-format knowledge base'), color: 'text-blue-600 bg-blue-50' },
          { icon: Sparkles, label: t('AI 结构化摘要', 'AI Structured Summary'), sub: t('出海洞察自动提炼', 'Auto-extracted go-global insights'), color: 'text-violet-600 bg-violet-50' },
          { icon: MessageSquare, label: t('结构化讨论', 'Structured Discussions'), sub: t('研究/提案/成果分类', 'Research / Proposal / Result categories'), color: 'text-emerald-600 bg-emerald-50' },
          { icon: Trophy, label: t('灵创值激励', 'Credit Incentives'), sub: t('贡献即积累权益', 'Contributions earn benefits'), color: 'text-amber-600 bg-amber-50' },
        ].map(({ icon: Icon, label, sub, color }) => (
          <div key={label} className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="font-semibold text-slate-800 text-sm">{label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Three Topic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {TOPICS.map(({ icon: Icon, title, titleEn, headerCls, blob1, blob2, tagCls, accentLine, desc, descEn, tags, tagsEn }) => (
          <div key={title} className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
            <div className={`relative bg-gradient-to-br ${headerCls} px-6 pt-6 pb-7 text-white overflow-hidden`}>
              <div className={`absolute -top-5 -right-5 w-28 h-28 ${blob1} rounded-full blur-2xl opacity-40`} />
              <div className={`absolute -bottom-6 -left-3 w-20 h-20 ${blob2} rounded-full blur-2xl opacity-35`} />
              <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
              <div className="relative w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-3 border border-white/25 shadow-inner">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h2 className="relative text-lg font-bold leading-snug">{lang === 'en' ? titleEn : title}</h2>
            </div>
            <div className={`h-0.5 bg-gradient-to-r ${accentLine} opacity-60`} />
            <div className="p-6 flex flex-col flex-1">
              <p className="text-slate-500 text-sm leading-relaxed mb-4 flex-1">{lang === 'en' ? descEn : desc}</p>
              <div className="flex flex-wrap gap-2">
                {(lang === 'en' ? tagsEn : tags).map((tag) => (
                  <span key={tag} className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${tagCls}`}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 现有科学组列表 */}
      <div id="science-list" className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-violet-600" /> {t('现有科学组', 'Current Groups')}
          </h2>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> {t('创建科学组', 'Create Group')}
            </button>
          )}
        </div>

        {loadingGroups ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => <div key={i} className="h-36 bg-slate-100 rounded-3xl animate-pulse" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-14 bg-slate-50 rounded-3xl border border-slate-100">
            <FlaskConical className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 text-sm">{t('暂无科学组，期待第一个研究团队的加入。', 'No groups yet. Waiting for the first research team to join.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {groups.map(group => {
              const st = STATUS_MAP[group.status];
              return (
                <div key={group.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-lg transition-all flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${st.cls}`}>{lang === 'en' ? STATUS_LABEL_EN[group.status] || st.label : st.label}</span>
                        <span className="text-xs text-slate-500">{group.research_domain}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">{group.name}</h3>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-400">
                      <Users className="w-3.5 h-3.5" /> {group.current_members}/{group.max_members}
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{group.description}</p>
                  {group.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {group.tags.map(t => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400">{t('组长：', 'Lead: ')}{group.lead_name}</span>
                    <div className="flex gap-2">
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDelete(group)}
                          className="text-xs px-3 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-all font-semibold"
                          title={t('删除科学组', 'Delete Group')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/science/${group.id}`)}
                        className="text-xs px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-all font-semibold tracking-wide shadow-sm"
                      >
                        {t('查看详情', 'View Details')}
                      </button>
                      {group.status !== 'closed' && user?.role !== 'admin' && (
                        <button
                          onClick={() => handleApply(group)}
                          className="text-xs px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 transition-all font-semibold tracking-wide shadow-md shadow-violet-500/25 active:scale-95"
                        >
                          {t('申请加入', 'Apply')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admission Criteria */}
      <div className="bg-gradient-to-br from-slate-50 to-violet-50 border border-violet-100 rounded-3xl p-8 mb-16">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-600" /> {t('入组条件参考', 'Entry Criteria')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {CRITERIA.map((c) => (
            <div key={c.zh} className="flex items-start gap-2.5 text-sm text-slate-600">
              <CheckCircle className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" /> {lang === 'en' ? c.en : c.zh}
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-500">{t('在科学组卡片上点击“申请加入”，填写申请理由后等待管理员审核即可。', 'Click Apply on a group card, submit your statement, and wait for admin review.')}</p>
      </div>

      {/* 申请 Modal */}
      {applyTarget && (
        <ApplyModal group={applyTarget} onClose={() => setApplyTarget(null)} onSuccess={handleApplySuccess} />
      )}
      {/* 创建科学组 Modal（仅管理员） */}
      {showCreate && (
        <CreateGroupModal onClose={() => setShowCreate(false)} onSuccess={handleCreateSuccess} />
      )}
    </div>
  );
}

