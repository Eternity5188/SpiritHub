import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Heart, Eye, MessageCircle, Clock } from 'lucide-react';
import { Post } from '../types';
import Avatar from './Avatar';
import { useLocale } from '../contexts/LocaleContext';

interface PostCardProps {
  post: Post;
}

function timeAgo(dateStr: string, lang: 'zh' | 'en'): string {
  const utc = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
  const diff = Date.now() - new Date(utc).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return lang === 'en' ? 'just now' : '刚刚';
  if (m < 60) return lang === 'en' ? `${m}m ago` : `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === 'en' ? `${h}h ago` : `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return lang === 'en' ? `${d}d ago` : `${d} 天前`;
  return new Date(dateStr).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN');
}

export default function PostCard({ post }: PostCardProps) {
  const { lang } = useLocale();

  return (
    <Link to={`/post/${post.id}`}>
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-slate-200/40 hover:-translate-y-0.5 transition-all duration-300 group">
        {/* Author */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar avatar={post.author_avatar} username={post.author_name} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-bold text-slate-800">{post.author_name}</span>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100/50">
                <Sparkles className="w-3 h-3" />
                <span>{post.author_points}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              {timeAgo(post.created_at, lang)}
            </div>
          </div>
        </div>

        {/* Title & Content */}
        <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed font-medium">
          {post.content}
        </p>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-500 text-xs font-semibold border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-5 text-sm font-medium text-slate-400 border-t border-slate-50 pt-3 group-hover:border-slate-100 transition-colors">
          <span className="flex items-center gap-1.5 hover:text-rose-500 transition-colors">
            <Heart className="w-4 h-4" />
            {post.likes_count}
          </span>
          <span className="flex items-center gap-1.5 hover:text-indigo-500 transition-colors">
            <MessageCircle className="w-4 h-4" />
            {post.comments_count}
          </span>
          <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors">
            <Eye className="w-4 h-4" />
            {post.views_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
