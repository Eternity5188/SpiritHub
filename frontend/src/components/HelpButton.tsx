import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X, Zap, BookOpen, Mail, ChevronRight } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';

const sections = [
  {
    icon: BookOpen,
    titleZh: '新手入门',
    titleEn: 'Getting Started',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    items: [
      ['注册账号后完善个人资料，让其他人更容易认识你', 'Complete your profile after signing up so others can recognize you'],
      ['在社区发布第一篇帖子，获得 +5 灵创值', 'Publish your first post to earn +5 credits'],
      ['加入或发起 CoLab 协作项目，与志同道合的人合作', 'Join or start a CoLab project and work with like-minded people'],
    ],
  },
  {
    icon: Zap,
    titleZh: '功能速查',
    titleEn: 'Quick Tips',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    items: [
      ['灵创值：发帖 +5、被点赞 +2、完成CoLab +20，可用于平台特权', 'Credits: +5 for posting, +2 for likes, +20 for CoLab completion; used for platform perks'],
      ['CoLab：短期协作项目，招募成员共同完成目标', 'CoLab: short-term collaboration projects with shared goals'],
      ['科学组：长期研究团队，支持文件共享与AI智能总结', 'Science groups: long-term research teams with file sharing and AI summaries'],
      ['GNN推荐：系统根据你的行为智能推荐好友和内容', 'GNN recommendations: personalized friend and content suggestions'],
    ],
  },
  {
    icon: Mail,
    titleZh: '联系与反馈',
    titleEn: 'Contact & Feedback',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    items: [
      ['遇到问题或有建议？欢迎随时反馈给我们', 'Questions or suggestions? Send us feedback anytime'],
      ['邮件：support@spirithub.com', 'Email: support@spirithub.com'],
    ],
  },
];

export default function HelpButton() {
  const { t, lang } = useLocale();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all duration-200 border border-slate-200 hover:border-violet-200"
        aria-label={t('帮助', 'Help')}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {open && !isMobile && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-violet-600" />
              <span className="font-semibold text-sm text-slate-800">{t('帮助中心', 'Help Center')}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-white/60 transition-colors text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sections */}
          <div className="p-3 space-y-2 max-h-[70vh] overflow-y-auto">
            {sections.map(({ icon: Icon, titleZh, titleEn, color, bg, items }) => (
              <div key={titleZh} className={`rounded-xl p-3 ${bg}`}>
                <div className={`flex items-center gap-1.5 font-semibold text-sm mb-2 ${color}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {lang === 'en' ? titleEn : titleZh}
                </div>
                <ul className="space-y-1.5">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600 leading-relaxed">
                      <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
                      {lang === 'en' ? item[1] : item[0]}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
            <p className="text-[11px] text-slate-400 text-center">{t('灵创平台 · 让创意连接世界', 'SpiritHub · Connecting ideas to the world')}</p>
          </div>
        </div>
      )}

      {open && isMobile && createPortal(
        <div className="fixed inset-0 z-[220] bg-black/40 backdrop-blur-sm px-3 py-4" onClick={() => setOpen(false)}>
          <div
            className="mx-auto h-full max-h-[92vh] w-full max-w-[560px] rounded-2xl bg-white border border-slate-100 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-violet-600" />
                <span className="font-semibold text-sm text-slate-800">{t('帮助中心', 'Help Center')}</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-white/60 transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-2 h-[calc(92vh-104px)] overflow-y-auto">
              {sections.map(({ icon: Icon, titleZh, titleEn, color, bg, items }) => (
                <div key={titleZh} className={`rounded-xl p-3 ${bg}`}>
                  <div className={`flex items-center gap-1.5 font-semibold text-sm mb-2 ${color}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {lang === 'en' ? titleEn : titleZh}
                  </div>
                  <ul className="space-y-1.5">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600 leading-relaxed">
                        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
                        {lang === 'en' ? item[1] : item[0]}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
              <p className="text-[11px] text-slate-400 text-center">{t('灵创平台 · 让创意连接世界', 'SpiritHub · Connecting ideas to the world')}</p>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
