import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { postsApi, recommendApi } from '../lib/api';
import { Post, Pagination } from '../types';
import PostCard from '../components/PostCard';
import EmptyState from '../components/EmptyState';
import { PostCardSkeleton } from '../components/skeletons';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

const TAGS = [
  { zh: '文化观察', en: 'Cultural Insight' },
  { zh: '跨境经验', en: 'Cross-border Experience' },
  { zh: '清关履约', en: 'Customs & Fulfillment' },
  { zh: '拉美市场', en: 'LATAM Market' },
  { zh: '商家求助', en: 'Merchant Help' },
  { zh: '利润分析', en: 'Profit Analysis' },
  { zh: '其他', en: 'Other' },
];

export default function Community() {
  const { user } = useAuth();
  const { t, lang } = useLocale();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedTag, setSelectedTag] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', tags: [] as string[] });
  const [submitting, setSubmitting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [recPosts, setRecPosts] = useState<any[]>([]);
  const [showRec, setShowRec] = useState(false);

  const fetchPosts = (p = 1, tag = '', q = '') => {
    setLoading(true);
    postsApi.list({ page: p, limit: 10, tag: tag || undefined, q: q || undefined })
      .then(res => {
        setPosts(res.data.posts);
        setPagination(res.data.pagination);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    document.title = t('社区广场 - 灵创平台', 'Community Square - SpiritHub');
    return () => { document.title = t('灵创平台', 'SpiritHub'); };
  }, [t]);

  useEffect(() => { fetchPosts(page, selectedTag, searchQuery); }, [page, selectedTag, searchQuery]);

  useEffect(() => {
    if (!user) return;
    recommendApi.posts()
      .then(res => {
        const recs = res.data.recommendations || [];
        setRecPosts(recs);
        if (recs.length > 0) setShowRec(true);
      })
      .catch(() => {/* 推荐服务不可用时静默忽略 */});
  }, [user]);

  const handleTagFilter = (tag: string) => {
    setSelectedTag(t => t === tag ? '' : tag);
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
    searchRef.current?.focus();
  };

  const toggleFormTag = (tag: string) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSubmitting(true);
    try {
      await postsApi.create(form);
      setShowCreate(false);
      setForm({ title: '', content: '', tags: [] });
      fetchPosts(1, selectedTag);
      setPage(1);
      toast.success(t('帖子发布成功！', 'Post published successfully!'));
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('发布失败', 'Publish failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-stone-900">{t('社区广场', 'Community Square')}</h1>
        {user ? (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('发帖', 'New Post')}
          </button>
        ) : (
          <Link to="/login" className="btn-secondary flex items-center gap-2 text-sm">
            {t('登录后发帖', 'Log in to post')}
          </Link>
        )}
      </div>

      {/* Search Box */}
      <form onSubmit={handleSearch} className="flex items-center gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
          <input
            ref={searchRef}
            className="input pl-9 pr-9 text-slate-800"
            placeholder={t('搜索帖子标题...', 'Search post titles...')}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button type="submit" className="btn-primary px-4 py-2 text-sm flex-shrink-0">{t('搜索', 'Search')}</button>
      </form>

      {/* Tag Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          className={`badge text-xs px-3 py-1 cursor-pointer transition-all ${!selectedTag ? 'badge-blue' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
          onClick={() => { setSelectedTag(''); setPage(1); }}
        >
          {t('全部', 'All')}
        </button>
        {TAGS.map(tag => (
          <button
            key={tag.zh}
            className={`badge text-xs px-3 py-1 cursor-pointer transition-all ${selectedTag === tag.zh ? 'badge-blue' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
            onClick={() => handleTagFilter(tag.zh)}
          >
            {lang === 'en' ? tag.en : tag.zh}
          </button>
        ))}
      </div>

      {/* Recommendation Section */}
      {showRec && recPosts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-500" /> {t('为您推荐', 'Recommended for you')}</h3>
          <ul className="list-disc list-inside space-y-1">
            {recPosts.map(p => (
              <li key={p.id}>
                <Link to={`/post/${p.id}`} className="text-sm text-blue-700 hover:underline">{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <PostCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`mx-1 px-3 py-1 rounded-md text-sm ${p === page ? 'bg-blue-500 text-white' : 'bg-stone-200'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Create Post Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white/85 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-slate-900">{t('创建新帖子', 'Create New Post')}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                className="input"
                placeholder={t('标题', 'Title')}
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
              <div className="relative">
                <textarea
                  className="input min-h-[150px] pr-16"
                  placeholder={t('内容...', 'Content...')}
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  maxLength={2000}
                  required
                />
                <span className={`absolute bottom-2 right-3 text-xs ${form.content.length > 1800 ? 'text-red-400' : 'text-stone-400'}`}>
                  {form.content.length}/2000
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">{t('标签 (最多3个)', 'Tags (max 3)')}</label>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map(tag => (
                    <button
                      type="button"
                      key={tag.zh}
                      onClick={() => toggleFormTag(tag.zh)}
                      className={`badge text-xs px-3 py-1 cursor-pointer transition-all ${
                        form.tags.includes(tag.zh)
                          ? 'badge-blue'
                          : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      }`}
                      disabled={!form.tags.includes(tag.zh) && form.tags.length >= 3}
                    >
                      {lang === 'en' ? tag.en : tag.zh}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">{t('取消', 'Cancel')}</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? t('发布中...', 'Publishing...') : t('发布', 'Publish')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

