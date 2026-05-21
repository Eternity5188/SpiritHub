import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Mail, Users, Globe, X } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';

const NAV_LINKS = [
  { path: '/community',     label: '社区' },
  { path: '/colab',         label: 'CoLab' },
  { path: '/tools',         label: '工具箱' },
  { path: '/service',       label: '商家服务' },
  { path: '/colab-science', label: '科学组' },
];

function ContactModal({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">{t('联系我们', 'Contact Us')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Team */}
          <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-100">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-violet-500 font-semibold mb-1 uppercase tracking-wide">{t('开发团队', 'Development Team')}</p>
              <p className="text-sm text-slate-500 mb-0.5">{t('东南大学', 'Southeast University')}</p>
              <p className="font-bold text-slate-900 text-lg leading-snug">{t('"五边形战士"团队', '"Pentagon Warriors" Team')}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wide">{t('联系邮箱', 'Email')}</p>
              <a
                href="mailto:213232400@seu.edu.cn"
                className="text-slate-800 font-medium hover:text-violet-600 transition-colors text-sm"
              >
                213232400@seu.edu.cn
              </a>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wide">{t('所在城市', 'Location')}</p>
              <p className="text-slate-800 font-medium text-sm">{t('江苏 · 南京', 'Nanjing, Jiangsu')}</p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:opacity-90 transition-opacity"
        >
          {t('好的', 'Got It')}
        </button>
      </div>
    </div>
  );
}

export default function Footer() {
  const [showContact, setShowContact] = useState(false);
  const { t } = useLocale();

  const navLinks = [
    { path: '/community', label: t('社区', 'Community') },
    { path: '/colab', label: 'CoLab' },
    { path: '/tools', label: t('工具箱', 'Toolkit') },
    { path: '/service', label: t('商家服务', 'Services') },
    { path: '/colab-science', label: t('科学组', 'Science') },
  ];

  return (
    <>
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}

      <footer className="md:ml-52 bg-gradient-to-r from-slate-50/80 via-white to-violet-50/30">
        {/* 顶部渐变分隔线 */}
        <div className="h-px bg-gradient-to-r from-transparent via-violet-200/60 to-transparent" />

        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between gap-4">
          {/* Left: brand + slogan */}
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/" className="flex items-center gap-1.5 group">
              <img src="/logo.webp" alt="Logo" className="w-5 h-5 opacity-90 group-hover:opacity-100 transition-opacity" />
              <span className="text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">{t('灵创平台', 'SpiritHub')}</span>
            </Link>
            <span className="hidden lg:flex items-center gap-1 text-[11px] text-slate-400/80">
              <Sparkles className="w-3 h-3 text-violet-300" />
              {t('由 AI 赋能，为国潮出海而生', 'AI-powered for global Chinese brands')}
            </span>
          </div>

          {/* Center: nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className="text-[11px] text-slate-400 hover:text-violet-600 hover:bg-violet-50 px-2.5 py-1 rounded-md transition-all duration-150"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right: links + copyright */}
          <div className="flex items-center gap-1 shrink-0">
            <Link to="/terms"   className="text-[11px] text-slate-400 hover:text-violet-600 hover:bg-violet-50 px-2 py-1 rounded-md transition-all duration-150">{t('协议', 'Terms')}</Link>
            <Link to="/privacy" className="text-[11px] text-slate-400 hover:text-violet-600 hover:bg-violet-50 px-2 py-1 rounded-md transition-all duration-150">{t('隐私', 'Privacy')}</Link>
            <button onClick={() => setShowContact(true)} className="text-[11px] text-slate-400 hover:text-violet-600 hover:bg-violet-50 px-2 py-1 rounded-md transition-all duration-150">
              {t('联系我们', 'Contact')}
            </button>
            <span className="ml-1 text-[11px] text-slate-300 select-none">· © 2026 {t('灵创平台', 'SpiritHub')}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
