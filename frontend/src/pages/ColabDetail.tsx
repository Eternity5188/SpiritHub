import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Users, Tag, ArrowLeft, Sparkles, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { colabApi } from '../lib/api';
import { ColabProject, ColabMember } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

const statusMap = {
  recruiting: { zh: '招募中', en: 'Recruiting', cls: 'badge-green' },
  active:     { zh: '进行中', en: 'Active', cls: 'badge-blue' },
  completed:  { zh: '已完成', en: 'Completed', cls: 'badge-purple' }
};

const TEXT_MAP: Record<string, string> = {
  '当阿根廷马黛茶遇到中国茶文化——中国茶商走向拉美': 'When Argentine mate meets Chinese tea culture — Chinese tea merchants going to LATAM',
  '我们的项目旨在探讨将传统中国茶艺和茶文化完成拉美市场本土化畅销的可能性 如何让拉美顾客也接受中国红茶、绿茶？ 希望有uu们能够加入我们的项目，将中国茶文化走向世界！': 'This project explores how to localize traditional Chinese tea craft and culture for the LATAM market. How can we help LATAM customers embrace Chinese black tea and green tea? Join us to bring Chinese tea culture to the world!',
  '暂无描述': 'No description yet',
};

const TAG_MAP: Record<string, string> = {
  '跨境电商': 'Cross-border E-commerce',
  '营销推广': 'Marketing',
  '内容创作': 'Content Creation',
  '设计创意': 'Design & Creativity',
  '技术开发': 'Tech Development',
  '数据分析': 'Data Analysis',
  '其他': 'Other',
};

export default function ColabDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, refreshUser } = useAuth();
  const { t, lang } = useLocale();
  const navigate = useNavigate();
  const [project, setProject] = useState<ColabProject | null>(null);
  const [members, setMembers] = useState<ColabMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const fetchProject = () => {
    if (!id) return;
    colabApi.get(parseInt(id))
      .then(res => {
        setProject(res.data.project);
        setMembers(res.data.members);
      })
      .catch(() => navigate('/colab'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProject(); }, [id]);

  const isMember = user && members.some(m => m.id === user.id);
  const isCreator = user && project?.creator_id === user.id;

  const handleJoin = async () => {
    if (!user) { navigate('/login'); return; }
    setJoining(true);
    try {
      await colabApi.join(parseInt(id!));
      await refreshUser();
      fetchProject();
      toast.success(t('已成功加入项目！', 'Joined project successfully!'));
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('加入失败', 'Join failed'));
    } finally {
      setJoining(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await colabApi.updateStatus(parseInt(id!), status);
      fetchProject();
      if (status === 'completed') await refreshUser();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('操作失败', 'Operation failed'));
    }
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-8 bg-stone-200 rounded w-1/2 mb-4" />
      <div className="h-40 bg-stone-200 rounded" />
    </div>
  );

  if (!project) return null;

  const status = statusMap[project.status];
  const tr = (text: string) => (lang === 'en' ? (TEXT_MAP[text] || text) : text);
  const tagText = (text: string) => (lang === 'en' ? (TAG_MAP[text] || text) : text);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-stone-500 hover:text-stone-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t('返回', 'Back')}
      </button>

      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold text-stone-900 flex-1 mr-3">{project.name}</h1>
          <span className={`badge ${status.cls} flex-shrink-0`}>{lang === 'en' ? status.en : status.zh}</span>
        </div>

        <p className="text-stone-500 leading-relaxed mb-4">{tr(project.description || '暂无描述')}</p>

        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {project.tags.map(tag => (
              <span key={tag} className="badge badge-purple">
                <Tag className="w-3 h-3 mr-1" />
                {tagText(tag)}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-stone-500 mb-5">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {project.current_members}/{project.max_members} {t('成员', 'members')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {new Date(project.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN')}
          </span>
          <span>{t('创建者', 'Creator')}: <Link to={`/profile/${project.creator_name}`} className="text-primary-400 hover:text-primary-600">{project.creator_name}</Link></span>
        </div>

        {/* Progress */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-stone-500 mb-1">
            <span>{t('成员进度', 'Member Progress')}</span>
            <span>{project.current_members}/{project.max_members}</span>
          </div>
          <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all"
              style={{ width: `${(project.current_members / project.max_members) * 100}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {user && !isMember && project.status === 'recruiting' && project.current_members < project.max_members && (
            <button onClick={handleJoin} className="btn-primary flex items-center gap-2" disabled={joining}>
              <Users className="w-4 h-4" />
              {joining ? t('加入中...', 'Joining...') : t('申请加入 (+5 灵创值)', 'Join Project (+5 credits)')}
            </button>
          )}
          {isMember && (
            <span className="flex items-center gap-1.5 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              {t('已加入', 'Joined')}
            </span>
          )}
          {(isCreator || user?.role === 'admin') && project.status !== 'completed' && (
            <div className="flex gap-2">
              {project.status === 'recruiting' && (
                <button onClick={() => handleStatusChange('active')} className="btn-secondary text-sm py-1.5">
                  {t('标记为进行中', 'Mark as Active')}
                </button>
              )}
              <button onClick={() => handleStatusChange('completed')} className="bg-green-900/30 border border-green-800/50 text-green-400 hover:bg-green-900/50 px-3 py-1.5 rounded-lg text-sm transition-all">
                {t('完成项目 (成员各 +50)', 'Complete Project (+50 each member)')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="card">
        <h2 className="font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-400" />
          {t('项目成员', 'Project Members')} ({members.length})
        </h2>
        <div className="space-y-3">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {m.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/profile/${m.username}`} className="text-stone-700 hover:text-primary-600 font-medium text-sm">
                  {m.username}
                </Link>
                <div className="text-xs text-stone-400">
                  {m.role === 'creator' ? t('创建者', 'Creator') : t('成员', 'Member')} · {t('加入于', 'Joined on')} {new Date(m.joined_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN')}
                </div>
              </div>
              <div className="badge-gold">
                <Sparkles className="w-3 h-3 mr-0.5" />
                {m.lingjing_points}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


