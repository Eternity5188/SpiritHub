import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';

// 顶层路由：父级均为首页
const TOP_ROUTES: Record<string, string> = {
  '/community':     '社区',
  '/colab':         'CoLab',
  '/tools':         '工具箱',
  '/service':       '商家服务',
  '/colab-science': 'CoLab 科学组',
  '/leaderboard':   '排行榜',
  '/friends':       '好友',
  '/chat':          '聊天室',
  '/ledger':        '我的账本',
  '/recharge':      '充值灵创值',
  '/admin':         '管理后台',
  '/login':         '登录',
  '/register':      '注册',
};

// 子路由：有父级页面
const SUB_ROUTES: Array<{
  pattern: RegExp;
  label: string;
  parentPath: string;
  parentLabel: string;
}> = [
  { pattern: /^\/post\//,             label: '帖子详情', parentPath: '/community', parentLabel: '社区' },
  { pattern: /^\/colab\/\d/,          label: '项目详情', parentPath: '/colab',     parentLabel: 'CoLab' },
  { pattern: /^\/tools\/copywriter/,  label: 'AI 文案',  parentPath: '/tools',     parentLabel: '工具箱' },
  { pattern: /^\/tools\/profit/,      label: '利润分析', parentPath: '/tools',     parentLabel: '工具箱' },
  { pattern: /^\/tools\/logistics/,   label: '物流计算', parentPath: '/tools',     parentLabel: '工具箱' },
  { pattern: /^\/profile\//,          label: '个人主页', parentPath: '/',          parentLabel: '首页' },
];

export default function Breadcrumb() {
  const { pathname } = useLocation();
  const { t, lang } = useLocale();
  if (pathname === '/') return null;

  const sub = SUB_ROUTES.find(r => r.pattern.test(pathname));

  const crumbs: Array<{ label: string; to?: string }> = [{ label: t('首页', 'Home'), to: '/' }];
  let backTo = '/';

  if (sub) {
    if (sub.parentPath !== '/') {
      const parentMap: Record<string, string> = {
        '社区': 'Community',
        'CoLab': 'CoLab',
        '工具箱': 'Toolkit',
        '首页': 'Home',
      };
      crumbs.push({ label: lang === 'en' ? (parentMap[sub.parentLabel] || sub.parentLabel) : sub.parentLabel, to: sub.parentPath });
      backTo = sub.parentPath;
    }
    const subMap: Record<string, string> = {
      '帖子详情': 'Post Detail',
      '项目详情': 'Project Detail',
      'AI 文案': 'AI Copy',
      '利润分析': 'Profit Analysis',
      '物流计算': 'Logistics Tracking',
      '个人主页': 'Profile',
    };
    crumbs.push({ label: t(sub.label, subMap[sub.label] || sub.label) });
  } else {
    const label = TOP_ROUTES[pathname];
    if (!label) return null;
    const topMap: Record<string, string> = {
      '社区': 'Community',
      '工具箱': 'Toolkit',
      '商家服务': 'Services',
      'CoLab 科学组': 'CoLab Science',
      '排行榜': 'Leaderboard',
      '好友': 'Friends',
      '聊天室': 'Chat',
      '我的账本': 'My Ledger',
      '充值灵创值': 'Recharge Credits',
      '登录': 'Log In',
      '注册': 'Sign Up',
      'CoLab': 'CoLab',
      '管理后台': 'Admin',
    };
    crumbs.push({ label: t(label, topMap[label] || label) });
  }

  return (
    <nav className="flex items-center gap-1.5 px-5 py-2 bg-white border-b border-slate-100 text-sm text-slate-500 select-none">
      {/* 返回按钮 */}
      <Link
        to={backTo}
        className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-100 hover:text-slate-800 transition-colors mr-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span className="font-medium">{t('返回', 'Back')}</span>
      </Link>

      <div className="w-px h-3.5 bg-slate-200 mx-1" />

      {/* 面包屑 */}
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
          {c.to ? (
            <Link to={c.to} className="hover:text-slate-800 transition-colors truncate max-w-[120px]">
              {c.label}
            </Link>
          ) : (
            <span className="text-slate-800 font-medium truncate max-w-[160px]">{c.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
