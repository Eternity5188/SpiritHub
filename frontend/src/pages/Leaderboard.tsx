import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Trophy, Medal, Crown } from 'lucide-react';
import { pointsApi } from '../lib/api';
import { useLocale } from '../contexts/LocaleContext';

export default function Leaderboard() {
  const { t, lang } = useLocale();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = t('排行榜 - 灵创平台', 'Leaderboard - SpiritHub');
    return () => { document.title = t('灵创平台', 'SpiritHub'); };
  }, [t]);

  useEffect(() => {
    pointsApi.leaderboard(50)
      .then(res => setLeaders(res.data.leaderboard))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const rankIcon = (idx: number) => {
    if (idx === 0) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (idx === 1) return <Medal className="w-5 h-5 text-stone-400" />;
    if (idx === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 text-center text-stone-400 font-bold text-sm">{idx + 1}</span>;
  };

  const rankBg = (idx: number) => {
    if (idx === 0) return 'border-amber-300 bg-amber-50';
    if (idx === 1) return 'border-stone-300 bg-stone-50';
    if (idx === 2) return 'border-amber-200 bg-amber-50/50';
    return '';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-slide-up">
      <div className="text-center mb-8">
        <Trophy className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-stone-900 mb-1">{t('灵创值排行榜', 'Credits Leaderboard')}</h1>
        <p className="text-stone-500 text-sm">{t('积极参与社区，累积更多灵创值', 'Engage in the community to earn more credits')}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(10).fill(0).map((_, i) => (
            <div key={i} className="card animate-pulse flex items-center gap-4 h-16" />
          ))}
        </div>
      ) : leaders.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">{t('暂无数据', 'No data yet')}</div>
      ) : (
        <div className="space-y-2">
          {leaders.map((u, idx) => (
            <Link key={u.id} to={`/profile/${u.username}`}>
              <div className={`card flex items-center gap-4 hover:border-primary-600/40 transition-all ${rankBg(idx)}`}>
                <div className="w-8 flex items-center justify-center flex-shrink-0">
                  {rankIcon(idx)}
                </div>
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold flex-shrink-0">
                  {u.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-800">{u.username}</div>
                  <div className="text-xs text-stone-400">
                    {t('Joined on', 'Joined on')} {new Date(u.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN')}
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 font-bold text-lg flex-shrink-0 ${
                  idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-stone-400' : idx === 2 ? 'text-amber-600' : 'text-stone-500'
                }`}>
                  <Sparkles className="w-4 h-4" />
                  {u.lingjing_points}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
