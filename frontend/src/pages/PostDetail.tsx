import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, Eye, MessageCircle, ArrowLeft, Sparkles, Clock, Send } from 'lucide-react';
import { toast } from 'sonner';
import { postsApi } from '../lib/api';
import { Post, Comment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';

function timeAgo(dateStr: string, lang: 'zh' | 'en'): string {
  const utc = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
  const diff = Date.now() - new Date(utc).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return lang === 'en' ? 'Just now' : '刚刚';
  if (m < 60) return lang === 'en' ? `${m} min ago` : `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === 'en' ? `${h} hr ago` : `${h} 小时前`;
  const d = Math.floor(h / 24);
  return lang === 'en' ? `${d} days ago` : `${d} 天前`;
}

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t, lang } = useLocale();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    postsApi.get(parseInt(id))
      .then(res => {
        setPost(res.data.post);
        setComments(res.data.comments);
        setLiked(res.data.post.user_liked ?? false);
        document.title = `${res.data.post.title} - ${t('灵创平台', 'SpiritHub')}`;
      })
      .catch(() => navigate('/community'))
      .finally(() => setLoading(false));
  }, [id, navigate, t]);

  const handleLike = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await postsApi.like(parseInt(id!));
      setLiked(res.data.liked);
      setPost(p => p ? { ...p, likes_count: p.likes_count + (res.data.liked ? 1 : -1) } : p);
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('操作失败', 'Operation failed'));
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await postsApi.comment(parseInt(id!), commentText);
      setCommentText('');
      // 重新获取评论
      const res = await postsApi.get(parseInt(id!));
      setComments(res.data.comments);
      setPost(p => p ? { ...p, comments_count: p.comments_count + 1 } : p);
      toast.success(t('评论成功！', 'Comment posted!'));
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('评论失败', 'Comment failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-8 bg-stone-200 rounded w-3/4 mb-4" />
      <div className="h-4 bg-stone-200 rounded w-full mb-2" />
      <div className="h-4 bg-stone-200 rounded w-5/6" />
    </div>
  );

  if (!post) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-stone-500 hover:text-stone-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t('返回', 'Back')}
      </button>

      <article className="card mb-6">
        {/* Author */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar avatar={post.author_avatar} username={post.author_name} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <Link to={`/profile/${post.author_name}`} className="font-medium text-stone-700 hover:text-primary-600">
                {post.author_name}
              </Link>
              <div className="badge-gold text-xs">
                <Sparkles className="w-3 h-3 mr-0.5" />
                {post.author_points}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-stone-400">
              <Clock className="w-3 h-3" />
              {timeAgo(post.created_at, lang)}
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-stone-900 mb-4">{post.title}</h1>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {post.tags.map(tag => <span key={tag} className="badge badge-blue">{tag}</span>)}
          </div>
        )}

        <div className="text-stone-600 leading-relaxed whitespace-pre-wrap mb-6">
          {post.content}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-stone-200">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              liked ? 'bg-red-50 text-red-600 border border-red-200' : 'btn-ghost text-stone-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            {post.likes_count} {t('点赞', 'likes')}
          </button>
          <span className="flex items-center gap-1.5 text-stone-500 text-sm">
            <MessageCircle className="w-4 h-4" />
            {post.comments_count} {t('评论', 'comments')}
          </span>
          <span className="flex items-center gap-1.5 text-stone-500 text-sm ml-auto">
            <Eye className="w-4 h-4" />
            {post.views_count} {t('浏览', 'views')}
          </span>
        </div>
      </article>

      {/* Comments */}
      <div className="space-y-4 mb-6">
        <h2 className="text-lg font-semibold text-stone-700">
          {t('评论', 'Comments')} ({comments.length})
        </h2>
        {comments.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={t('还没有评论', 'No comments yet')}
            description={t('来第一个评论吧！', 'Be the first to comment!')}
          />
        ) : (
          comments.map(c => (
            <div key={c.id} className="card">
              <div className="flex items-center gap-2 mb-2">
                <Avatar avatar={c.avatar} username={c.username} size="xs" />
                <span className="text-sm font-medium text-stone-600">{c.username}</span>
                <span className="text-xs text-stone-400 ml-auto">{timeAgo(c.created_at, lang)}</span>
              </div>
              <p className="text-stone-600 text-sm leading-relaxed">{c.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Comment Form */}
      {user ? (
        <form onSubmit={handleComment} className="card">
          <h3 className="text-sm font-medium text-stone-600 mb-3">{t('发表评论 (+3 灵创值)', 'Post a comment (+3 credits)')}</h3>
          <textarea
            className="input min-h-[100px] resize-none mb-3"
            placeholder={t('输入你的评论...', 'Write your comment...')}
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
          />
          <div className="flex justify-end">
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting || !commentText.trim()}>
              <Send className="w-4 h-4" />
              {submitting ? t('提交中...', 'Submitting...') : t('提交评论', 'Submit Comment')}
            </button>
          </div>
        </form>
      ) : (
        <div className="card text-center py-6 text-stone-400">
          <Link to="/login" className="text-primary-400 hover:text-primary-600">{t('登录', 'Log in')}</Link> {t('后发表评论', 'to post a comment')}
        </div>
      )}
    </div>
  );
}


