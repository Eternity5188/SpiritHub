import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Tag, Clock } from 'lucide-react';
import { ColabProject } from '../types';

interface ColabCardProps {
  project: ColabProject;
}

const schemeMap = {
  recruiting: {
    label: '招募中',
    labelCls: 'bg-white/20 text-white border border-white/30',
    headerCls: 'bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600',
    blob1Cls: 'bg-violet-300',
    blob2Cls: 'bg-emerald-400',
    progressCls: 'from-violet-500 to-indigo-500',
    tagCls: 'bg-violet-50 text-violet-600 border-violet-100',
  },
  active: {
    label: '进行中',
    labelCls: 'bg-white/20 text-white border border-white/30',
    headerCls: 'bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600',
    blob1Cls: 'bg-blue-300',
    blob2Cls: 'bg-sky-200',
    progressCls: 'from-blue-500 to-indigo-500',
    tagCls: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  completed: {
    label: '已完成',
    labelCls: 'bg-white/20 text-white border border-white/25',
    headerCls: 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-700',
    blob1Cls: 'bg-slate-300',
    blob2Cls: 'bg-gray-200',
    progressCls: 'from-slate-400 to-slate-500',
    tagCls: 'bg-slate-50 text-slate-500 border-slate-200',
  },
};

function timeAgo(dateStr: string): string {
  const utc = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
  const diff = Date.now() - new Date(utc).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return '今天';
  if (d < 30) return `${d} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export default function ColabCard({ project }: ColabCardProps) {
  const scheme = schemeMap[project.status];
  const fillPct = project.max_members > 0
    ? Math.round((project.current_members / project.max_members) * 100)
    : 0;

  return (
    <Link to={`/colab/${project.id}`}>
      <div className="rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 group overflow-hidden">

        {/* Gradient header */}
        <div className={`relative px-5 py-5 ${scheme.headerCls} overflow-hidden`}>
          {/* Two-color decorative blobs */}
          <div className={`absolute -top-6 -right-6 w-32 h-32 ${scheme.blob1Cls} rounded-full blur-2xl opacity-40`} />
          <div className={`absolute -bottom-8 -left-4 w-24 h-24 ${scheme.blob2Cls} rounded-full blur-2xl opacity-35`} />
          {/* Dot grid texture */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
          />

          <div className="relative z-10 flex items-center justify-between mb-2.5">
            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${scheme.labelCls}`}>
              {scheme.label}
            </span>
            <span className="flex items-center gap-1 text-white/60 text-xs">
              <Clock className="w-3 h-3" />
              {timeAgo(project.created_at)}
            </span>
          </div>
          <h3 className="relative z-10 text-base font-bold text-white line-clamp-2 leading-snug drop-shadow-sm">
            {project.name}
          </h3>
        </div>

        {/* White content area */}
        <div className="bg-white px-5 py-4">
          <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">
            {project.description || '暂无描述'}
          </p>

          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {project.tags.slice(0, 3).map(tag => (
                <span key={tag} className={`flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${scheme.tagCls}`}>
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span className="text-slate-600">
                <span className="font-bold text-slate-800">{project.current_members}</span>
                <span className="mx-0.5">/</span>
                <span>{project.max_members}</span>
              </span>
              成员
            </span>
            <span className="font-semibold text-slate-500">{fillPct}%</span>
          </div>

          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full bg-gradient-to-r ${scheme.progressCls} rounded-full transition-all duration-500`}
              style={{ width: `${fillPct}%` }}
            />
          </div>

          <div className="flex items-center pt-3 border-t border-slate-50">
            <p className="text-xs text-slate-400">
              发起人: <span className="text-slate-600 font-semibold">{project.creator_name}</span>
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
