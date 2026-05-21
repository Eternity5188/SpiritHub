import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Tag, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { colabApi } from '../lib/api';
import { ColabProject, Pagination } from '../types';
import ColabCard from '../components/ColabCard';
import EmptyState from '../components/EmptyState';
import { ColabCardSkeleton } from '../components/skeletons';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

const TAGS = ['技术开发', '设计创意', '跨境电商', '内容创作', '数据分析', '营销推广', '其他'];

export default function CoLab() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [projects, setProjects] = useState<ColabProject[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', max_members: 5, tags: [] as string[] });
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = (p = 1, status = '') => {
    setLoading(true);
    colabApi.list({ page: p, limit: 9, status: status || undefined })
      .then(res => {
        setProjects(res.data.projects);
        setPagination(res.data.pagination);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    document.title = t('CoLab 协作空间 - 灵创平台', 'CoLab Workspace - SpiritHub');
    return () => { document.title = t('灵创平台', 'SpiritHub'); };
  }, [t]);

  useEffect(() => { fetchProjects(page, statusFilter); }, [page, statusFilter]);

  const toggleFormTag = (tag: string) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await colabApi.create(form);
      setShowCreate(false);
      setForm({ name: '', description: '', max_members: 5, tags: [] });
      fetchProjects(1, statusFilter);
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('创建失败', 'Creation failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const statusOptions = [
    { value: '', label: t('全部', 'All') },
    { value: 'recruiting', label: t('招募中', 'Recruiting') },
    { value: 'active', label: t('进行中', 'Active') },
    { value: 'completed', label: t('已完成', 'Completed') }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary-400" />
            {t('CoLab 协作空间', 'CoLab Workspace')}
          </h1>
          <p className="text-stone-500 text-sm mt-1">{t('找到志同道合的伙伴，共建创意项目', 'Find like-minded partners and build creative projects together')}</p>
        </div>
        {user ? (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" />
            {t('创建项目', 'Create Project')}
          </button>
        ) : (
          <Link to="/login" className="btn-secondary text-sm">{t('登录后创建', 'Log in to create')}</Link>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {statusOptions.map(({ value, label }) => (
          <button
            key={value}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              statusFilter === value
                ? 'bg-primary-600 text-white'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
            onClick={() => { setStatusFilter(value); setPage(1); }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg card animate-slide-up">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary-400" />
              {t('创建 CoLab 项目', 'Create CoLab Project')}
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-stone-600 mb-1">{t('项目名称 *', 'Project Name *')}</label>
                <input
                  className="input"
                  placeholder={t('简洁、有吸引力的项目名', 'A concise and compelling project name')}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-1">{t('项目描述', 'Project Description')}</label>
                <textarea
                  className="input min-h-[100px] resize-none"
                  placeholder={t('介绍项目目标、需要的技能或分工...', 'Describe goals, required skills, and collaboration plan...')}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-1">{t('最大成员数（2-20）', 'Max Members (2-20)')}</label>
                <input
                  className="input w-32"
                  type="number"
                  min={2}
                  max={20}
                  value={form.max_members}
                  onChange={e => setForm(f => ({ ...f, max_members: parseInt(e.target.value) || 5 }))}
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-2">{t('项目标签', 'Project Tags')}</label>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      className={`badge text-xs px-3 py-1 cursor-pointer ${form.tags.includes(tag) ? 'badge-purple' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                      onClick={() => toggleFormTag(tag)}
                    >
                      {t(tag, ({
                        '技术开发': 'Engineering',
                        '设计创意': 'Design',
                        '跨境电商': 'Cross-border E-commerce',
                        '内容创作': 'Content Creation',
                        '数据分析': 'Data Analysis',
                        '营销推广': 'Marketing',
                        '其他': 'Other',
                      } as Record<string, string>)[tag] || tag)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>{t('取消', 'Cancel')}</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? t('创建中...', 'Creating...') : t('创建 (+20 灵创值)', 'Create (+20 credits)')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <ColabCardSkeleton key={i} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title={t('还没有协作项目', 'No collaboration projects yet')}
            description={t('创建一个项目，招录好友一起协作', 'Create a project and invite partners to collaborate')}
            {... (user ? { actionLabel: t('创建第一个项目', 'Create your first project'), onAction: () => setShowCreate(true) } : {})}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => <ColabCard key={p.id} project={p} />)}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('上一页', 'Previous')}</button>
          <span className="flex items-center px-3 text-sm text-stone-500">{page} / {pagination.totalPages}</span>
          <button className="btn-secondary" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>{t('下一页', 'Next')}</button>
        </div>
      )}
    </div>
  );
}

