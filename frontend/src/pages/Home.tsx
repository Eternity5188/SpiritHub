import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Users, Layers, TrendingUp, ArrowRight, Zap, BarChart3, Target, BrainCircuit, Briefcase } from 'lucide-react';

import { postsApi, colabApi, pointsApi } from '../lib/api';
import { Post, ColabProject } from '../types';
import PostCard from '../components/PostCard';
import ColabCard from '../components/ColabCard';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import Avatar from '../components/Avatar';
import OnboardingModal from '../components/OnboardingModal';

const STATS = [
  { value: 6,   suffixZh: ' 个', suffixEn: '', labelZh: '拉美市场覆盖', labelEn: 'LATAM Markets', icon: TrendingUp,   gradient: 'from-violet-600 to-purple-400',  bg: 'bg-violet-100',  iconColor: 'text-violet-600' },
  { value: 3,   suffixZh: ' 大', suffixEn: '', labelZh: '核心 AI 工具', labelEn: 'Core AI Tools', icon: BrainCircuit, gradient: 'from-indigo-600 to-violet-500',  bg: 'bg-indigo-100',  iconColor: 'text-indigo-600' },
  { value: 200, suffixZh: '+',  suffixEn: '+', labelZh: '出海从业者', labelEn: 'Global Builders', icon: Users,        gradient: 'from-fuchsia-500 to-indigo-500', bg: 'bg-fuchsia-100', iconColor: 'text-fuchsia-500' },
  { value: 50,  suffixZh: '+',  suffixEn: '+', labelZh: '协作研究项目', labelEn: 'CoLab Projects', icon: Layers,       gradient: 'from-violet-500 to-indigo-600',  bg: 'bg-violet-100',  iconColor: 'text-violet-500' },
];

function AnimatedCounter({ value, suffix, label, icon: Icon, gradient, bg, iconColor }: {
  value: number; suffix: string; label: string;
  icon: React.ElementType; gradient: string; bg: string; iconColor: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let startTime: number | null = null;
        const duration = 1400;
        const animate = (time: number) => {
          if (!startTime) startTime = time;
          const progress = Math.min((time - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * value));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 group">
      <div className={`w-10 h-10 rounded-2xl ${bg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className={`text-4xl sm:text-5xl font-extrabold tabular-nums leading-none bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
        {count}<span className="text-2xl">{suffix}</span>
      </div>
      <span className="text-xs text-slate-500 font-medium tracking-wide">{label}</span>
    </div>
  );
}

export default function Home() {
  const { t, lang } = useLocale();
  const { user } = useAuth();
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);
  const [latestColab, setLatestColab] = useState<ColabProject[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = t('灵创平台 - 创作者社区', 'SpiritHub - Creator Community');
    return () => { document.title = t('灵创平台', 'SpiritHub'); };
  }, [t]);

  useEffect(() => {
    Promise.all([
      postsApi.list({ limit: 4 }),
      colabApi.list({ limit: 3, status: 'recruiting' }),
      pointsApi.leaderboard(5),
    ]).then(([postsRes, colabRes, lbRes]) => {
      setLatestPosts(postsRes.data.posts);
      setLatestColab(colabRes.data.projects);
      setLeaderboard(lbRes.data.leaderboard);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="overflow-x-hidden">
      <OnboardingModal />
      {/* Hero Section */}
      <div className="relative overflow-hidden" style={{ height: '520px' }}>
        {/* background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-50/50" />
          <div className="absolute top-0 left-1/2 w-[800px] h-[400px] bg-violet-500/10 blur-[100px] rounded-full mix-blend-multiply animate-float" />
          <div className="absolute top-1/2 left-1/2 w-[600px] h-[300px] bg-indigo-500/10 blur-[80px] rounded-full mix-blend-multiply animate-float-delayed" />
          <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
        </div>



        {/* Bottom fade: hero → page background */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-stone-50 via-stone-50/60 to-transparent pointer-events-none z-20" />

        {/* Left: text + CTA */}
        <div className="relative z-10 h-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center" style={{ height: '520px' }}>
          <div className="w-full lg:w-[52%] text-center lg:text-left">
            <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full bg-white text-violet-700 text-sm font-medium border border-violet-100 shadow-sm transition-transform hover:scale-105 duration-300 animate-fade-in-up opacity-0" style={{ animationDelay: '100ms' }}>
              <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-violet-600 animate-pulse" />
              </div>
              <span>{t('灵径智链 × CoLab 出海生态', 'SpiritHub × CoLab Global Ecosystem')}</span>
            </div>

            <h1 className="text-5xl sm:text-5xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 drop-shadow-sm animate-fade-in-up opacity-0" style={{ animationDelay: '200ms' }}>
              <span className="block sm:hidden">
                <span className="block text-center -translate-x-6">{t('共创价值', 'Co-create Value')}</span>
                <span className="block text-center translate-x-6 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 bg-clip-text text-transparent animate-shine">{t('智启未来', 'Future Enabled')}</span>
              </span>
              <span className="hidden sm:inline">
                {t('共创价值，', 'Co-create value, ')}<span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 bg-clip-text text-transparent animate-shine">{t('智启未来', 'Enable the Future')}</span>
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-500 mb-10 max-w-xl leading-relaxed font-medium animate-fade-in-up opacity-0 mx-auto lg:mx-0" style={{ animationDelay: '300ms' }}>
              {t('出海品牌的文化智能平台——洞察、量化、追踪，一站式赋能跨境全链路。', 'A cultural intelligence platform for global brands: insight, quantification, and tracking in one flow.')}
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-5 relative z-10 animate-fade-in-up opacity-0" style={{ animationDelay: '400ms' }}>
              {!user ? (
                <>
                  <Link to="/register" className="group relative flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 text-slate-800 text-base font-bold transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-200/20 to-indigo-200/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Zap className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                    <span className="relative z-10">{t('免费注册', 'Free Sign Up')}</span>
                  </Link>
                  <Link to="/community" className="group flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white/60 backdrop-blur-sm text-slate-800 text-base font-bold border border-slate-200/50 hover:bg-white/80 hover:text-slate-900 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                    {t('浏览社区', 'Explore Community')}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/community" className="group relative flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 text-slate-800 text-base font-bold transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-200/20 to-indigo-200/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Users className="w-5 h-5 text-violet-500 group-hover:scale-110 transition-transform" />
                    <span className="relative z-10">{t('进入社区', 'Enter Community')}</span>
                  </Link>
                  <Link to="/colab" className="group flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white/60 backdrop-blur-sm text-slate-800 text-base font-bold border border-slate-200/50 hover:bg-white/80 hover:text-slate-900 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                    <Layers className="w-5 h-5 group-hover:text-indigo-500 transition-colors" />
                    {t('探索 CoLab', 'Explore CoLab')}
                  </Link>
                  <Link to="/service" className="group flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-50 text-amber-800 text-base font-bold border border-amber-200 hover:bg-amber-100 transition-all duration-300 shadow-sm hover:-translate-y-0.5">
                    <Briefcase className="w-5 h-5" />
                    {t('申请出海前测', 'Apply for Go-Global Precheck')}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right: floating logo */}
          <div className="hidden lg:flex absolute right-0 top-0 h-full w-[48%] items-center justify-end pr-4 pointer-events-none">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-violet-400/20 blur-3xl scale-125" />
              <img
                src="/background_logo.webp"
                alt=""
                className="relative w-[520px] h-[520px] object-contain animate-float-y drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Counter */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="relative overflow-hidden rounded-3xl border border-violet-100/80 bg-gradient-to-r from-violet-50/90 via-white/95 to-indigo-50/90 backdrop-blur-md shadow-lg shadow-violet-100/40 px-10 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-violet-200/20 via-transparent to-indigo-200/20 pointer-events-none" />
          {STATS.map(stat => (
            <AnimatedCounter
              key={stat.labelZh}
              value={stat.value}
              suffix={lang === 'en' ? stat.suffixEn : stat.suffixZh}
              label={lang === 'en' ? stat.labelEn : stat.labelZh}
              icon={stat.icon}
              gradient={stat.gradient}
              bg={stat.bg}
              iconColor={stat.iconColor}
            />
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-violet-400/5 blur-3xl rounded-full transform -translate-y-1/2 -z-10 pointer-events-none" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {[
            {
              icon: Users,
              titleZh: 'CoLab 开放共创',
              titleEn: 'CoLab Open Collaboration',
              descZh: '围绕国潮拉美出海的社区讨论与协作任务，优质经验沉淀为可调用的知识资产。',
              descEn: 'Community discussions and collaboration tasks for LATAM expansion, turning experience into reusable knowledge assets.',
              delay: '100ms',
              link: '/community',
              image: '/Colab.webp',
            },
            {
              icon: BrainCircuit,
              titleZh: '专业工具箱',
              titleEn: 'Professional Toolkit',
              descZh: '文化转译 · ProfitLab 利润测算 · Puente 物流追踪，覆盖出海全链路决策场景。',
              descEn: 'Transcreation, ProfitLab profit modeling, and Puente logistics tracking for full-chain decisions.',
              delay: '200ms',
              link: '/tools',
              image: '/AI_kits.webp',
            },
            {
              icon: Briefcase,
              titleZh: '商家出海服务',
              titleEn: 'Go-Global Services',
              descZh: '快速诊断 · 标准前测 · 定制方案，从报告生成到专业交付，让出海决策有依据。',
              descEn: 'Quick diagnosis, standard precheck, and custom plans with delivery-ready reports to support go-global decisions.',
              delay: '300ms',
              link: '/service',
              image: '/abroad.webp',
            },
          ].map(({ icon: Icon, titleZh, titleEn, descZh, descEn, delay, link, image }) => (
            <Link to={link} key={titleZh} className="animate-fade-in-up opacity-0 group bg-white/60 backdrop-blur-md rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden flex flex-col" style={{ animationDelay: delay }}>
              {/* Illustration */}
              <div className="w-full h-40 overflow-hidden flex-shrink-0 bg-violet-50/40 relative">
                <img src={image} alt={titleZh} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/70 via-white/30 to-transparent pointer-events-none" />
              </div>
              {/* Content */}
              <div className="p-6 flex flex-col flex-1 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-100/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white text-slate-700 mb-4 group-hover:bg-violet-50 group-hover:text-violet-600 border border-slate-100 group-hover:border-violet-100 shadow-sm group-hover:scale-110 transition-all duration-300 relative z-10">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2 relative z-10 group-hover:text-violet-700 transition-colors">{t(titleZh, titleEn)}</h3>
                <p className="text-slate-500 leading-relaxed relative z-10 group-hover:text-slate-600 transition-colors text-sm">{t(descZh, descEn)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-10 pb-20">
        {/* Latest Posts */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2.5">
              <TrendingUp className="w-6 h-6 text-slate-400" />
              {t('社区热议', 'Trending in Community')}
            </h2>
            <Link to="/community" className="group text-slate-500 text-sm font-medium hover:text-slate-900 transition-colors flex items-center gap-1">
              {t('查看全部', 'View all')} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
                  <div className="h-5 bg-slate-100 rounded-lg w-3/4 mb-4" />
                  <div className="h-4 bg-slate-100 rounded-lg w-full mb-3" />
                  <div className="h-4 bg-slate-100 rounded-lg w-2/3" />
                </div>
              ))}
            </div>
          ) : latestPosts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 text-center text-slate-400 py-12">
              {t('暂无帖子，', 'No posts yet, ')}<Link to="/community" className="text-violet-600 font-medium hover:text-violet-700">{t('来发第一帖', 'be the first to post')}</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {latestPosts.map(post => (
                <div key={post.id} className="transition-transform duration-300 hover:-translate-y-0.5">
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          )}

          {/* Latest CoLab */}
          <div className="flex items-center justify-between mb-6 mt-12">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-slate-400" />
              {t('招募中的项目', 'Projects Recruiting')}
            </h2>
            <Link to="/colab" className="group text-slate-500 text-sm font-medium hover:text-slate-900 transition-colors flex items-center gap-1">
              {t('查看全部', 'View all')} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-4">
              {[1,2].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse h-32" />
              ))}
            </div>
          ) : latestColab.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 text-center text-slate-400 py-10">
              {t('暂无项目，', 'No projects yet, ')}<Link to="/colab" className="text-violet-600 font-medium hover:text-violet-700">{t('创建第一个', 'create the first one')}</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {latestColab.map(p => (
                <div key={p.id} className="transition-transform duration-300 hover:-translate-y-0.5">
                  <ColabCard project={p} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Leaderboard */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                {t('灵创值榜单', 'Credits Leaderboard')}
              </h2>
              <Link to="/leaderboard" className="text-slate-500 text-sm hover:text-slate-900 transition-colors">
                {t('完整榜单', 'Full ranking')}
              </Link>
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-6 h-6 bg-slate-100 rounded-md" />
                    <div className="flex-1 h-5 bg-slate-100 rounded-md" />
                    <div className="w-16 h-6 bg-slate-100 rounded-full" />
                  </div>
                ))
              ) : leaderboard.map((u, idx) => (
                <div key={u.id} className="group flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50 transition-colors">
                  <span className={`w-6 text-center font-extrabold text-base ${
                    idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-slate-300'
                  }`}>
                    {idx + 1}
                  </span>
                  <Link
                    to={`/profile/${u.username}`}
                    className="flex items-center gap-2.5 flex-1 min-w-0"
                  >
                    <Avatar avatar={u.avatar} username={u.username} size="xs" />
                    <span className="text-sm font-medium text-slate-700 truncate group-hover:text-slate-900 transition-colors">{u.username}</span>
                  </Link>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-bold text-amber-700">{u.lingjing_points}</span>
                  </div>
                </div>
              ))}
              {!loading && leaderboard.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-6">{t('暂无数据', 'No data')}</p>
              )}
            </div>
          </div>

          {/* Points Guide */}
          <div className="bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 rounded-3xl p-6 border border-amber-100/60 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 blur-2xl rounded-full translate-x-10 -translate-y-10" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-400/10 blur-xl rounded-full -translate-x-8 translate-y-8" />
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2 relative z-10">
              <Zap className="w-5 h-5 text-amber-500" />
              {t('探索灵创值', 'Earn Credits')}
            </h3>
            <div className="space-y-3 text-sm font-medium text-slate-600 relative z-10">
              {[
                ['注册加入', '+100'],
                ['发布创作', '+10'],
                ['参与讨论', '+3'],
                ['内容获赞', '+2'],
                ['发起招募', '+20'],
              ].map(([action, pts]) => (
                <div key={action} className="flex justify-between items-center py-1.5 border-b border-amber-100/50 last:border-0">
                  <span className="text-slate-500">{t(action, ({
                    '注册加入': 'Sign up',
                    '发布创作': 'Publish content',
                    '参与讨论': 'Join discussion',
                    '内容获赞': 'Receive likes',
                    '发起招募': 'Start recruitment',
                  } as Record<string, string>)[action] || action)}</span>
                  <span className="text-amber-600 bg-amber-100/50 border border-amber-200/50 px-2 py-0.5 rounded-md flex items-center font-bold">
                    {pts}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
