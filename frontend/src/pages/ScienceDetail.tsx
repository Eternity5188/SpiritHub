import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, FileText, Image, File, Sparkles, MessageSquare,
  FlaskConical, Lightbulb, Trophy, Users, ChevronDown, ChevronUp,
  Download, Trash2, Globe, Send, Plus, X, CheckCircle, XCircle, Clock,
  BookOpen, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { scienceApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import type {
  ScienceGroup, ScienceMember, ScienceFile, ScienceThread,
  ScienceReply, ScienceApplication,
} from '../types';

// ── 常量 ─────────────────────────────────────────────────
const CATEGORIES = [
  { zh: '文化研究', en: 'Cultural Research' },
  { zh: '物流合规', en: 'Logistics Compliance' },
  { zh: '市场分析', en: 'Market Analysis' },
  { zh: '法律政策', en: 'Legal & Policy' },
  { zh: '产品策略', en: 'Product Strategy' },
  { zh: '未分类', en: 'Uncategorized' },
];
const MARKETS = [
  { zh: '墨西哥', en: 'Mexico', flag: '🇲🇽' },
  { zh: '巴西', en: 'Brazil', flag: '🇧🇷' },
  { zh: '智利', en: 'Chile', flag: '🇨🇱' },
  { zh: '阿根廷', en: 'Argentina', flag: '🇦🇷' },
  { zh: '哥伦比亚', en: 'Colombia', flag: '🇨🇴' },
  { zh: '秘鲁', en: 'Peru', flag: '🇵🇪' },
  { zh: '全地区', en: 'All LATAM', flag: '🌎' },
];
const MARKET_FLAG: Record<string, string> = {
  墨西哥: '🇲🇽', 巴西: '🇧🇷', 智利: '🇨🇱', 阿根廷: '🇦🇷', 哥伦比亚: '🇨🇴', 秘鲁: '🇵🇪', 全地区: '🌎', Mexico: '🇲🇽', Brazil: '🇧🇷', Chile: '🇨🇱', Argentina: '🇦🇷', Colombia: '🇨🇴', Peru: '🇵🇪', 'All LATAM': '🌎',
};
const THREAD_TYPES = [
  { value: 'discussion', labelZh: '讨论', labelEn: 'Discussion', icon: MessageSquare, color: 'text-blue-600 bg-blue-50 border-blue-100' },
  { value: 'research', labelZh: '研究', labelEn: 'Research', icon: FlaskConical, color: 'text-violet-600 bg-violet-50 border-violet-100' },
  { value: 'proposal', labelZh: '提案', labelEn: 'Proposal', icon: Lightbulb, color: 'text-amber-600 bg-amber-50 border-amber-100' },
  { value: 'report', labelZh: '成果', labelEn: 'Result', icon: Trophy, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
];
const CAT_COLOR: Record<string, string> = {
  文化研究: 'bg-violet-50 text-violet-700 border-violet-100',
  物流合规: 'bg-blue-50 text-blue-700 border-blue-100',
  市场分析: 'bg-amber-50 text-amber-700 border-amber-100',
  法律政策: 'bg-red-50 text-red-700 border-red-100',
  产品策略: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  未分类: 'bg-slate-50 text-slate-600 border-slate-200',
  'Cultural Research': 'bg-violet-50 text-violet-700 border-violet-100',
  'Logistics Compliance': 'bg-blue-50 text-blue-700 border-blue-100',
  'Market Analysis': 'bg-amber-50 text-amber-700 border-amber-100',
  'Legal & Policy': 'bg-red-50 text-red-700 border-red-100',
  'Product Strategy': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Uncategorized: 'bg-slate-50 text-slate-600 border-slate-200',
};

const CATEGORY_BY_ZH: Record<string, string> = {
  文化研究: 'Cultural Research',
  物流合规: 'Logistics Compliance',
  市场分析: 'Market Analysis',
  法律政策: 'Legal & Policy',
  产品策略: 'Product Strategy',
  未分类: 'Uncategorized',
};

const CATEGORY_BY_EN: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_BY_ZH).map(([zh, en]) => [en, en])
);

function fileIcon(type: string) {
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(type)) return <Image className="w-5 h-5 text-emerald-500" />;
  if (type === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
  if (['doc', 'docx'].includes(type)) return <FileText className="w-5 h-5 text-blue-500" />;
  return <File className="w-5 h-5 text-slate-400" />;
}
function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function threadType(type: string) {
  return THREAD_TYPES.find(t => t.value === type) || THREAD_TYPES[0];
}
function timeAgo(dt: string, lang: 'zh' | 'en') {
  const diff = Date.now() - new Date(dt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return lang === 'en' ? `${m} min ago` : `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === 'en' ? `${h} hr ago` : `${h} 小时前`;
  return lang === 'en' ? `${Math.floor(h / 24)} days ago` : `${Math.floor(h / 24)} 天前`;
}

// ── 子组件：文件卡片 ──────────────────────────────────────
function FileCard({ file, groupId, isMember, currentUserId, isLead, onDelete, onSummarize }: {
  file: ScienceFile; groupId: number; isMember: boolean;
  currentUserId?: number; isLead: boolean;
  onDelete: (id: number) => void; onSummarize: (id: number) => void;
}) {
  const { t, lang } = useLocale();
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSummarize = async () => {
    if (file.ai_summary) { setShowSummary(!showSummary); return; }
    setLoading(true);
    await onSummarize(file.id);
    setLoading(false);
    setShowSummary(true);
  };

  const handleDownload = async () => {
    const resp = await scienceApi.downloadFile(groupId, file.id);
    const url = URL.createObjectURL(new Blob([resp.data]));
    const a = document.createElement('a');
    a.href = url; a.download = file.original_name; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-100">
          {fileIcon(file.file_type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">{file.display_title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{file.original_name} · {fmtSize(file.file_size)}</p>
          {file.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{file.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CAT_COLOR[file.category] || CAT_COLOR['未分类']}`}>
              {lang === 'en' ? (CATEGORY_BY_ZH[file.category] || file.category) : file.category}
            </span>
            {file.market_tags.map(m => (
              <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                {MARKET_FLAG[m] || MARKET_FLAG[(m as keyof typeof MARKET_FLAG)] || ''} {lang === 'en' ? (MARKETS.find(x => x.zh === m)?.en || m) : m}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1.5">{t('by', 'by')} {file.uploader_name} · {timeAgo(file.created_at, lang)}</p>
        </div>
      </div>

      {/* AI 摘要展示 */}
      {showSummary && file.ai_summary && (
        <div className="mt-3 p-3 bg-violet-50 border border-violet-100 rounded-xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
          {file.ai_summary}
        </div>
      )}

      <div className="flex items-center gap-2 mt-3">
        {['doc', 'docx'].includes(file.file_type) && (
        <button
          onClick={handleSummarize}
          disabled={loading}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 transition-colors font-medium"
        >
          <Sparkles className="w-3 h-3" />
          {loading ? t('生成中…', 'Generating...') : file.ai_summary ? (showSummary ? t('收起摘要', 'Hide Summary') : t('查看摘要', 'View Summary')) : t('AI 结构化摘要', 'AI Summary')}
        </button>
        )}
        <button onClick={handleDownload} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
          <Download className="w-3 h-3" /> {t('下载', 'Download')}
        </button>
        {(isLead || file.uploader_id === currentUserId) && (
          <button onClick={() => onDelete(file.id)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors ml-auto">
            <Trash2 className="w-3 h-3" /> {t('删除', 'Delete')}
          </button>
        )}
      </div>
    </div>
  );
}

// ── 子组件：线程卡片 ─────────────────────────────────────
function ThreadCard({ thread, groupId, onClick }: {
  thread: ScienceThread; groupId: number; onClick: () => void;
}) {
  const { lang } = useLocale();
  const tt = threadType(thread.thread_type);
  const Icon = tt.icon;
  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${tt.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tt.color}`}>{lang === 'en' ? tt.labelEn : tt.labelZh}</span>
            {thread.market && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                {MARKET_FLAG[thread.market] || ''} {lang === 'en' ? (MARKETS.find(x => x.zh === thread.market)?.en || thread.market) : thread.market}
              </span>
            )}
            {thread.pinned === 1 && <span className="text-xs text-amber-600 font-semibold">📌 {lang === 'en' ? 'Pinned' : '置顶'}</span>}
          </div>
          <p className="font-semibold text-slate-800 text-sm line-clamp-2">{thread.title}</p>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{thread.content}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span>{thread.creator_name}</span>
            <span>·</span>
            <span><MessageSquare className="w-3 h-3 inline mr-0.5" />{thread.replies_count} {lang === 'en' ? 'replies' : '条回复'}</span>
            <span>·</span>
            <span>{timeAgo(thread.updated_at, lang)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── 主页面 ────────────────────────────────────────────────
export default function ScienceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLocale();
  const groupId = Number(id);

  const [group, setGroup] = useState<ScienceGroup | null>(null);
  const [members, setMembers] = useState<ScienceMember[]>([]);
  const [files, setFiles] = useState<ScienceFile[]>([]);
  const [threads, setThreads] = useState<ScienceThread[]>([]);
  const [applications, setApplications] = useState<ScienceApplication[]>([]);
  const [myApp, setMyApp] = useState<ScienceApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'files' | 'threads' | 'members'>('files');

  // 文件上传 modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ display_title: '', description: '', category: '未分类', market_tags: [] as string[] });
  const [uploadFile, setUploadFileState] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 文件筛选
  const [filterCat, setFilterCat] = useState(lang === 'en' ? 'All' : '全部');
  const [filterMarket, setFilterMarket] = useState(lang === 'en' ? 'All' : '全部');

  // 线程 modal
  const [showNewThread, setShowNewThread] = useState(false);
  const [threadForm, setThreadForm] = useState({ title: '', content: '', thread_type: 'discussion', market: '' });
  const [submittingThread, setSubmittingThread] = useState(false);

  // 线程详情
  const [activeThread, setActiveThread] = useState<ScienceThread | null>(null);
  const [replies, setReplies] = useState<ScienceReply[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const isMemberOfGroup = members.some(m => m.id === user?.id);
  const isLeadOfGroup = members.some(m => m.id === user?.id && m.role === 'lead');
  const isAdmin = user?.role === 'admin';
  const canAccess = isMemberOfGroup || isAdmin;

  useEffect(() => {
    document.title = t('科学组详情 - 灵创平台', 'Science Group Detail - SpiritHub');
    return () => { document.title = t('灵创平台', 'SpiritHub'); };
  }, [t]);

  // 加载基本信息
  useEffect(() => {
    Promise.all([
      scienceApi.get(groupId),
      user ? scienceApi.myApplication(groupId) : Promise.resolve({ data: { application: null } }),
    ]).then(([gRes, appRes]) => {
      setGroup(gRes.data.group);
      setMembers(gRes.data.members);
      setMyApp(appRes.data.application);
    }).catch(() => navigate('/colab-science'))
      .finally(() => setLoading(false));
  }, [groupId, user]);

  // 加载成员可见内容
  useEffect(() => {
    if (!canAccess) return;
    scienceApi.getFiles(groupId).then(r => setFiles(r.data.files)).catch(() => {});
    scienceApi.getThreads(groupId).then(r => setThreads(r.data.threads)).catch(() => {});
    if (isLeadOfGroup || isAdmin) {
      scienceApi.getApplications(groupId).then(r => setApplications(r.data.applications)).catch(() => {});
    }
  }, [canAccess, groupId, isLeadOfGroup, isAdmin]);

  // 打开线程详情
  const openThread = async (thread: ScienceThread) => {
    setActiveThread(thread);
    const r = await scienceApi.getThread(groupId, thread.id);
    setActiveThread(r.data.thread);
    setReplies(r.data.replies);
  };

  // 上传文件
  const handleUpload = async () => {
    if (!uploadFile) { toast.error(t('请选择文件', 'Please select a file')); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', uploadFile);
    fd.append('display_title', uploadForm.display_title || uploadFile.name);
    fd.append('description', uploadForm.description);
    fd.append('category', uploadForm.category);
    fd.append('market_tags', JSON.stringify(uploadForm.market_tags));
    try {
      await scienceApi.uploadFile(groupId, fd);
      const r = await scienceApi.getFiles(groupId);
      setFiles(r.data.files);
      setShowUpload(false);
      setUploadFileState(null);
      setUploadForm({ display_title: '', description: '', category: '未分类', market_tags: [] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('上传失败', 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  // 删除文件
  const handleDeleteFile = async (fileId: number) => {
    toast(t('确定删除此文件？', 'Delete this file?'), {
      action: { label: t('删除', 'Delete'), onClick: async () => {
        await scienceApi.deleteFile(groupId, fileId);
        setFiles(f => f.filter(x => x.id !== fileId));
        toast.success(t('文件已删除', 'File deleted'));
      }},
      cancel: { label: t('取消', 'Cancel'), onClick: () => {} },
    });
  };

  // AI 摘要
  const handleSummarize = async (fileId: number) => {
    const r = await scienceApi.summarizeFile(groupId, fileId);
    setFiles(f => f.map(x => x.id === fileId ? { ...x, ai_summary: r.data.summary } : x));
  };

  // 新建线程
  const handleCreateThread = async () => {
    if (!threadForm.title || !threadForm.content) { toast.error(t('请填写标题和内容', 'Please fill in title and content')); return; }
    setSubmittingThread(true);
    try {
      await scienceApi.createThread(groupId, {
        ...threadForm,
        market: threadForm.market || null,
      });
      const r = await scienceApi.getThreads(groupId);
      setThreads(r.data.threads);
      setShowNewThread(false);
      setThreadForm({ title: '', content: '', thread_type: 'discussion', market: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('发起失败', 'Failed to create thread'));
    } finally {
      setSubmittingThread(false);
    }
  };

  // 回复线程
  const handleReply = async () => {
    if (!replyContent.trim() || !activeThread) return;
    setSendingReply(true);
    try {
      await scienceApi.replyThread(groupId, activeThread.id, replyContent);
      const r = await scienceApi.getThread(groupId, activeThread.id);
      setReplies(r.data.replies);
      setReplyContent('');
      setThreads(t => t.map(x => x.id === activeThread.id ? { ...x, replies_count: x.replies_count + 1 } : x));
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('回复失败', 'Reply failed'));
    } finally {
      setSendingReply(false);
    }
  };

  // 审核申请
  const handleReview = async (appId: number, action: 'approve' | 'reject') => {
    try {
      await scienceApi.reviewApplication(groupId, appId, action);
      const [gRes, appsRes] = await Promise.all([scienceApi.get(groupId), scienceApi.getApplications(groupId)]);
      setGroup(gRes.data.group);
      setMembers(gRes.data.members);
      setApplications(appsRes.data.applications);
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('操作失败', 'Operation failed'));
    }
  };

  // 文件筛选
  const filteredFiles = files.filter(f => {
    const catOk = filterCat === '全部' || f.category === filterCat || CATEGORY_BY_ZH[f.category] === filterCat || CATEGORY_BY_EN[f.category] === filterCat;
    const mktOk = filterMarket === '全部' || f.market_tags.includes(filterMarket) || MARKETS.some(x => x.en === filterMarket);
    return catOk && mktOk;
  });

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-4" />
        <div className="h-48 bg-slate-200 rounded-2xl" />
      </div>
    );
  }
  if (!group) return null;

  const statusMap = { recruiting: { label: '招募中', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }, active: { label: '进行中', cls: 'bg-blue-50 text-blue-700 border border-blue-200' }, closed: { label: '已关闭', cls: 'bg-slate-100 text-slate-500 border border-slate-200' } };
  const st = statusMap[group.status];
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 返回 */}
      <button onClick={() => navigate('/colab-science')} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 mb-6 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> {t('返回科学组', 'Back to Science Groups')}
      </button>

      {/* 头部 */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white mb-6 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-violet-400 rounded-full blur-3xl opacity-30" />
        <div className="absolute -bottom-10 -left-6 w-32 h-32 bg-indigo-400 rounded-full blur-3xl opacity-25" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${st.cls}`}>{st.label}</span>
                <span className="text-xs text-white/60">{group.research_domain}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold">{group.name}</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Users className="w-4 h-4" />
              <span>{group.current_members} / {group.max_members} 成员</span>
            </div>
          </div>
          <p className="text-white/70 text-sm leading-relaxed mb-4 max-w-2xl">{group.description}</p>
          {group.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {group.tags.map(t => (
                <span key={t} className="text-xs bg-white/15 border border-white/25 text-white px-2.5 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-white/60">
            <BookOpen className="w-3.5 h-3.5" />
            <span>组长：{group.lead_name}</span>
          </div>
        </div>
      </div>

      {/* 非成员状态提示 */}
      {!canAccess && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <Layers className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">{t('知识库与研究讨论仅对成员开放', 'The knowledge base and discussions are members only')}</p>
            <p className="text-sm text-amber-700 mt-1">
              {myApp?.status === 'pending' && t('您的申请正在审核中，请耐心等待组长批复。', 'Your application is under review. Please wait for the lead to respond.')}
              {myApp?.status === 'rejected' && t(`申请被拒绝，理由：${myApp.reviewer_note || '暂无说明'}。`, `Application rejected. Reason: ${myApp.reviewer_note || 'No details provided'}.`)}
              {!myApp && t('请在科学组列表页点击"申请加入"提交入组申请。', 'Click "Apply to Join" on the science group list page to submit your application.')}
            </p>
          </div>
        </div>
      )}

      {canAccess && (
        <>
          {/* Tab 切换 */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
            {([['files', 'Knowledge Base', FileText], ['threads', 'Research Threads', FlaskConical], ['members', 'Members', Users]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Icon className="w-4 h-4" /> {label}
                {key === 'members' && isLeadOfGroup && applications.filter(a => a.status === 'pending').length > 0 && (
                  <span className="ml-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {applications.filter(a => a.status === 'pending').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── 知识库 ── */}
          {activeTab === 'files' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="appearance-none text-sm border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400 font-medium">
                      <option value="全部">{t('全部分类', 'All Categories')}</option>
                      {CATEGORIES.map(c => <option key={c.zh} value={c.zh}>{lang === 'en' ? c.en : c.zh}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select value={filterMarket} onChange={e => setFilterMarket(e.target.value)} className="appearance-none text-sm border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400 font-medium">
                      <option value="全部">{t('全部市场', 'All Markets')}</option>
                      {MARKETS.map(m => <option key={m.zh} value={m.zh}>{m.flag} {lang === 'en' ? m.en : m.zh}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 bg-violet-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-violet-700 transition-colors font-medium">
                  <Upload className="w-4 h-4" /> {t('上传文件', 'Upload File')}
                </button>
              </div>

              {filteredFiles.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{t('知识库还是空的，上传第一份研究文件吧！', 'The knowledge base is empty. Upload the first research file!')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredFiles.map(f => (
                    <FileCard key={f.id} file={f} groupId={groupId} isMember={canAccess}
                      currentUserId={user?.id} isLead={isLeadOfGroup || isAdmin}
                      onDelete={handleDeleteFile} onSummarize={handleSummarize} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 研究讨论 ── */}
          {activeTab === 'threads' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap gap-2">
                  {THREAD_TYPES.map(threadTypeItem => {
                    const Icon = threadTypeItem.icon;
                    return (
                      <span key={threadTypeItem.value} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${threadTypeItem.color}`}>
                        <Icon className="w-3 h-3" /> {lang === 'en' ? threadTypeItem.labelEn : threadTypeItem.labelZh}
                      </span>
                    );
                  })}
                </div>
                <button onClick={() => setShowNewThread(true)} className="flex items-center gap-2 bg-violet-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-violet-700 transition-colors font-medium">
                  <Plus className="w-4 h-4" /> {t('发起讨论', 'Start Discussion')}
                </button>
              </div>

              {threads.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{t('还没有讨论，发起第一个研究线程吧！', 'No discussions yet. Start the first research thread!')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {threads.map(t => <ThreadCard key={t.id} thread={t} groupId={groupId} onClick={() => openThread(t)} />)}
                </div>
              )}
            </div>
          )}

          {/* ── 成员 ── */}
          {activeTab === 'members' && (
            <div>
              {/* 待审核申请（组长可见） */}
              {(isLeadOfGroup || isAdmin) && applications.filter(a => a.status === 'pending').length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" /> {t('待审申请', 'Pending Applications')} ({applications.filter(a => a.status === 'pending').length})
                  </h3>
                  <div className="flex flex-col gap-3">
                    {applications.filter(a => a.status === 'pending').map(app => (
                      <div key={app.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-bold text-sm">
                            {app.username?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{app.username}</p>
                            <p className="text-xs text-slate-400">{t('灵创值', 'Credits')} {app.lingjing_points} · {timeAgo(app.created_at, lang)}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 mb-1"><span className="font-medium">{t('申请理由：', 'Statement: ')}</span>{app.statement}</p>
                        {app.research_background && (
                          <p className="text-sm text-slate-600 mb-2"><span className="font-medium">{t('研究背景：', 'Background: ')}</span>{app.research_background}</p>
                        )}
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => handleReview(app.id, 'approve')} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> {t('批准', 'Approve')}
                          </button>
                          <button onClick={() => handleReview(app.id, 'reject')} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium">
                            <XCircle className="w-3.5 h-3.5" /> {t('拒绝', 'Reject')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 成员列表 */}
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-600" /> {t('全部成员', 'All Members')} ({members.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {members.map(m => (
                  <div key={m.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {m.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{m.username}</p>
                      <p className="text-xs text-slate-400">✨ {m.lingjing_points} {t('灵创值', 'credits')}</p>
                    </div>
                    {m.role === 'lead' && (
                      <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">{t('组长', 'Lead')}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 上传文件 Modal ── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) setShowUpload(false); }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800 text-lg">{t('上传研究文件', 'Upload Research File')}</h3>
              <button onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {/* 文件选择 */}
            <div
              className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors mb-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              {uploadFile ? (
                <p className="text-sm font-medium text-violet-700">{uploadFile.name}<br /><span className="text-xs text-slate-400 font-normal">{fmtSize(uploadFile.size)}</span></p>
              ) : (
                <p className="text-sm text-slate-500">{t('点击或拖拽上传 PDF、Word、图片等', 'Click or drag to upload PDF, Word, images, etc.')}<br /><span className="text-xs text-slate-400">{t('Word 文件支持 AI 结构化摘要 · 最大 20MB', 'Word files support AI summaries · Max 20MB')}</span></p>
              )}
              <input
                ref={fileInputRef} type="file" className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.xls,.xlsx,.txt,.csv"
                onChange={e => setUploadFileState(e.target.files?.[0] || null)}
              />
            </div>

            <div className="space-y-3">
              <input
                type="text" placeholder={t('显示标题（默认文件名）', 'Display title (defaults to filename)')}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                value={uploadForm.display_title}
                onChange={e => setUploadForm(f => ({ ...f, display_title: e.target.value }))}
              />
              <textarea
                placeholder={t('研究描述 / 文件摘要（建议填写，AI 摘要效果更准确）', 'Research description / file summary (helps AI summarize better)')}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none h-20"
                value={uploadForm.description}
                onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
              />
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                value={uploadForm.category}
                onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c.zh} value={c.zh}>{lang === 'en' ? c.en : c.zh}</option>)}
              </select>
              <div>
                <p className="text-xs text-slate-500 mb-2">{t('关联市场（可多选）', 'Related markets (multi-select)')}</p>
                <div className="flex flex-wrap gap-2">
                  {MARKETS.map(m => (
                    <button
                      key={m.zh} type="button"
                      onClick={() => setUploadForm(f => ({
                        ...f,
                        market_tags: f.market_tags.includes(m.zh) ? f.market_tags.filter(x => x !== m.zh) : [...f.market_tags, m.zh],
                      }))}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${uploadForm.market_tags.includes(m.zh) ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-violet-400'}`}
                    >
                      {m.flag} {lang === 'en' ? m.en : m.zh}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleUpload} disabled={uploading || !uploadFile}
              className="mt-5 w-full bg-violet-600 text-white py-2.5 rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
            >
              {uploading ? t('上传中…', 'Uploading...') : t('确认上传', 'Confirm Upload')}
            </button>
          </div>
        </div>
      )}

      {/* ── 新建线程 Modal ── */}
      {showNewThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) setShowNewThread(false); }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800 text-lg">{t('发起研究讨论', 'Start Research Discussion')}</h3>
              <button onClick={() => setShowNewThread(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {THREAD_TYPES.map(threadTypeItem => {
                  const Icon = threadTypeItem.icon;
                  return (
                    <button
                      key={threadTypeItem.value} type="button"
                      onClick={() => setThreadForm(f => ({ ...f, thread_type: threadTypeItem.value }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${threadForm.thread_type === threadTypeItem.value ? threadTypeItem.color + ' ring-2 ring-offset-1 ring-violet-400' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      <Icon className="w-4 h-4" /> {lang === 'en' ? threadTypeItem.labelEn : threadTypeItem.labelZh}
                      <span className="text-xs text-slate-400 ml-auto">{threadTypeItem.value === 'research' || threadTypeItem.value === 'report' ? '+15' : '+8'} {t('分', 'pts')}</span>
                    </button>
                  );
                })}
              </div>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                value={threadForm.market}
                onChange={e => setThreadForm(f => ({ ...f, market: e.target.value }))}
              >
                <option value="">{t('不限市场', 'Any market')}</option>
                {MARKETS.map(m => <option key={m.zh} value={m.zh}>{m.flag} {lang === 'en' ? m.en : m.zh}</option>)}
              </select>
              <input
                type="text" placeholder={t('讨论标题', 'Discussion Title')}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                value={threadForm.title}
                onChange={e => setThreadForm(f => ({ ...f, title: e.target.value }))}
              />
              <textarea
                placeholder={t('详细内容（支持 Markdown 格式）', 'Details (Markdown supported)')}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none h-32"
                value={threadForm.content}
                onChange={e => setThreadForm(f => ({ ...f, content: e.target.value }))}
              />
            </div>
            <button
              onClick={handleCreateThread} disabled={submittingThread}
              className="mt-5 w-full bg-violet-600 text-white py-2.5 rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
            >
              {submittingThread ? t('提交中…', 'Submitting...') : t('发起讨论', 'Start Discussion')}
            </button>
          </div>
        </div>
      )}

      {/* ── 线程详情侧栏 ── */}
      {activeThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40" onClick={e => { if (e.target === e.currentTarget) { setActiveThread(null); setReplies([]); } }}>
          <div className="bg-white w-full max-w-xl h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {(() => { const tt = threadType(activeThread.thread_type); const Icon = tt.icon; return <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${tt.color}`}><Icon className="w-3 h-3" />{lang === 'en' ? tt.labelEn : tt.labelZh}</span>; })()}
                {activeThread.market && <span className="text-xs text-slate-500">{MARKET_FLAG[activeThread.market] || ''} {lang === 'en' ? (MARKETS.find(x => x.zh === activeThread.market)?.en || activeThread.market) : activeThread.market}</span>}
              </div>
              <button onClick={() => { setActiveThread(null); setReplies([]); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <h2 className="font-bold text-slate-900 text-lg mb-2">{activeThread.title}</h2>
              <p className="text-xs text-slate-400 mb-4">{activeThread.creator_name} · {timeAgo(activeThread.created_at, lang)}</p>
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed mb-6 p-4 bg-slate-50 rounded-2xl">
                {activeThread.content}
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-3">{t('回复', 'Replies')} ({replies.length})</p>
              <div className="flex flex-col gap-3">
                {replies.map(r => (
                  <div key={r.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {r.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-2xl rounded-tl-sm p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-800 text-xs">{r.username}</span>
                        <span className="text-xs text-slate-400">{timeAgo(r.created_at, lang)}</span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 p-4 flex gap-3">
              <textarea
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder={t('输入回复…', 'Write a reply...')}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none h-16"
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply(); }}
              />
              <button onClick={handleReply} disabled={sendingReply || !replyContent.trim()} className="self-end w-10 h-10 bg-violet-600 text-white rounded-xl flex items-center justify-center hover:bg-violet-700 disabled:opacity-60 transition-colors flex-shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
