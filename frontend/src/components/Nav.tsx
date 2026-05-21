import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Users, Layers, Trophy, User, LogOut,
  Menu, X, Sparkles, LogIn, UserCheck, MessageCircle, Shield, Wallet, Wrench, Briefcase, FlaskConical, Languages
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useSocket } from '../contexts/SocketContext';
import Avatar from './Avatar';
import NotificationBell from './NotificationBell';
import HelpButton from './HelpButton';

export default function Nav() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { unreadMessages, pendingRequests } = useSocket();

  const navLinks = [
    { path: '/', label: t('首页', 'Home'), icon: Home },
    { path: '/community', label: t('社区', 'Community'), icon: Users },
    { path: '/colab', label: 'CoLab', icon: Layers },
    { path: '/tools', label: t('工具箱', 'Toolkit'), icon: Wrench },
    { path: '/service', label: t('商家服务', 'Services'), icon: Briefcase },
    { path: '/colab-science', label: t('CoLab 科学组', 'CoLab Science'), icon: FlaskConical },
    { path: '/leaderboard', label: t('排行榜', 'Leaderboard'), icon: Trophy },
  ];

  useEffect(() => {
    const close = () => setMobileOpen(false);
    window.addEventListener('close-menu', close);
    return () => window.removeEventListener('close-menu', close);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const LanguageSwitch = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`inline-flex items-center gap-1 rounded-xl border border-violet-200/70 bg-gradient-to-r from-violet-50 to-indigo-50 p-1 shadow-sm transition-all duration-300 ${scrolled ? 'shadow-[0_0_0_1px_rgba(124,58,237,0.12),0_0_16px_rgba(124,58,237,0.22)] ring-1 ring-violet-300/30' : ''} ${mobile ? 'text-[11px]' : 'text-xs'}`}>
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-violet-500 border border-violet-100">
        <Languages className="h-3.5 w-3.5" />
      </span>
      <button
        onClick={() => setLang('zh')}
        aria-label="切换中文"
        className={`rounded-lg px-3 py-1.5 font-semibold transition-all duration-200 ${lang === 'zh' ? 'bg-violet-600 text-white shadow' : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'}`}
      >
        中文
      </button>
      <button
        onClick={() => setLang('en')}
        aria-label="Switch to English"
        className={`rounded-lg px-3 py-1.5 font-semibold transition-all duration-200 ${lang === 'en' ? 'bg-violet-600 text-white shadow' : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'}`}
      >
        EN
      </button>
    </div>
  );

  return (
    <>
      {/* TOP HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 h-12 md:h-16 bg-white/55 md:bg-white/90 backdrop-blur-2xl border-b border-white/30 md:border-slate-200/50 shadow-[0_1px_16px_rgba(0,0,0,0.05)] flex items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-xl group shrink-0">
          <img src="/logo.webp" alt="Logo" className="w-7 h-7 md:w-8 md:h-8 transition-transform duration-300 group-hover:scale-110" />
          <span className="hidden md:block bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
            {t('灵创平台', 'SpiritHub')}
          </span>
        </Link>

        {/* Desktop: notification bell + login/register */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitch />
          <HelpButton />
          <NotificationBell />
          {!user && (
            <>
              <Link to="/login" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-xl px-4 py-2 hover:bg-slate-50 transition-all">
                <LogIn className="w-4 h-4" /> {t('登录', 'Log In')}
              </Link>
              <Link to="/register" className="bg-violet-600 text-white text-sm font-semibold py-2 px-5 rounded-xl hover:bg-violet-700 transition-colors">
                {t('注册', 'Sign Up')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* DESKTOP LEFT SIDEBAR */}
      <aside className="hidden md:flex fixed top-16 left-0 bottom-0 w-52 z-40 flex-col bg-white border-r border-slate-200/60 py-4 overflow-y-auto">
        <nav className="flex flex-col gap-0.5 px-3 flex-1">
            {navLinks.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive(path)
                  ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-500/10'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive(path) ? 'text-violet-600' : 'text-slate-400'}`} />
              {label}
            </Link>
          ))}
          {user && (
            <>
              <div className="my-2 border-t border-slate-100" />
              <Link to="/friends" className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive('/friends') ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-500/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                <UserCheck className={`w-4 h-4 shrink-0 ${isActive('/friends') ? 'text-violet-600' : 'text-slate-400'}`} />
                {t('好友', 'Friends')}
                {pendingRequests > 0 && <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{pendingRequests > 9 ? '9+' : pendingRequests}</span>}
              </Link>
              <Link to="/chat" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive('/chat') ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-500/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                <MessageCircle className={`w-4 h-4 shrink-0 ${isActive('/chat') ? 'text-violet-600' : 'text-slate-400'}`} />
                {t('聊天室', 'Chat')}
                {unreadMessages > 0 && <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{unreadMessages > 9 ? '9+' : unreadMessages}</span>}
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive('/admin') ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                  <Shield className={`w-4 h-4 shrink-0 ${isActive('/admin') ? 'text-amber-600' : 'text-slate-400'}`} />
                  管理后台
                </Link>
              )}
            </>
          )}
        </nav>
        {user ? (
          <div className="px-3 pt-3 border-t border-slate-100 mt-2 space-y-1">
            {/* Profile row */}
            <Link
              to={`/profile/${user.username}`}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive(`/profile/${user.username}`) ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-500/10' : 'hover:bg-slate-50'
              }`}
            >
              <Avatar avatar={(user as any).avatar} username={user.username} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">{user.username}</div>
                <div className="text-xs text-slate-400">{t('个人主页', 'Profile')}</div>
              </div>
            </Link>
            {/* Ledger */}
            <Link
              to="/ledger"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive('/ledger') ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-500/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Wallet className={`w-4 h-4 shrink-0 ${isActive('/ledger') ? 'text-violet-600' : 'text-slate-400'}`} />
              <span className="flex-1 whitespace-nowrap">{t('我的账本', 'My Ledger')}</span>
            </Link>
            {/* Recharge */}
            <Link to="/recharge" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-50 transition-all">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-400" /> {t('充值灵创值', 'Recharge Credits')}
            </Link>
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
            >
              <LogOut className="w-4 h-4 shrink-0" /> {t('退出登录', 'Log Out')}
            </button>
          </div>
        ) : (
          <div className="px-3 pt-3 border-t border-slate-100 mt-2 flex flex-col gap-2">
            <Link to="/login" className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
              <LogIn className="w-4 h-4" /> {t('登录', 'Log In')}
            </Link>
            <Link to="/register" className="flex items-center justify-center py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
              {t('注册', 'Sign Up')}
            </Link>
          </div>
        )}
      </aside>

      {/* MOBILE RIGHT DRAWER */}
      <div className={`fixed top-0 right-0 bottom-0 w-52 max-w-[70vw] z-[60] bg-white flex flex-col shadow-2xl md:hidden transition-transform duration-300 ease-in-out ${
        mobileOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100/80 shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo.webp" alt="Logo" className="w-7 h-7" />
          </div>
          <div className="flex items-center gap-1">
            <HelpButton />
            {user && <NotificationBell />}
            <button onClick={() => setMobileOpen(false)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Scrollable nav items */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {navLinks.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                isActive(path) ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          ))}

          {user && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <Link to="/friends" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all" onClick={() => setMobileOpen(false)}>
                <UserCheck className="w-5 h-5 shrink-0" />
                <span>{t('好友', 'Friends')}</span>
                {pendingRequests > 0 && <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingRequests}</span>}
              </Link>
              <Link to="/chat" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all" onClick={() => setMobileOpen(false)}>
                <MessageCircle className="w-5 h-5 shrink-0" />
                <span>{t('聊天室', 'Chat')}</span>
                {unreadMessages > 0 && <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadMessages}</span>}
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-50 transition-all" onClick={() => setMobileOpen(false)}>
                  <Shield className="w-5 h-5 shrink-0" />
                  <span className="whitespace-nowrap">管理后台</span>
                </Link>
              )}
            </>
          )}
        </div>

        {/* User card at bottom */}
        {user ? (
          <div className="border-t border-slate-100 px-3 py-3 space-y-0.5 shrink-0">
            <Link to={`/profile/${user.username}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all" onClick={() => setMobileOpen(false)}>
              <Avatar username={user.username} avatar={user.avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">{user.username}</div>
                <div className="flex items-center gap-1 text-amber-600 text-xs font-bold">
                  <Sparkles className="w-3 h-3" /> {user.lingjing_points} {t('灵创值', 'credits')}
                </div>
              </div>
            </Link>
            <Link to="/ledger" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all" onClick={() => setMobileOpen(false)}>
              <Wallet className="w-4 h-4 shrink-0" /> {t('我的账本', 'My Ledger')}
            </Link>
            <Link to="/recharge" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-50 transition-all" onClick={() => setMobileOpen(false)}>
              <Sparkles className="w-4 h-4 shrink-0" /> {t('充值灵创值', 'Recharge Credits')}
            </Link>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all">
              <LogOut className="w-4 h-4 shrink-0" /> {t('退出登录', 'Log Out')}
            </button>
          </div>
        ) : (
          <div className="border-t border-slate-100 px-4 py-4 flex gap-2 shrink-0">
            <Link to="/login" className="flex-1 text-center py-2.5 rounded-xl text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all" onClick={() => setMobileOpen(false)}>{t('登录', 'Log In')}</Link>
            <Link to="/register" className="flex-1 text-center py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-all" onClick={() => setMobileOpen(false)}>{t('注册', 'Sign Up')}</Link>
          </div>
        )}
      </div>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
      />
    </>
  );
}
