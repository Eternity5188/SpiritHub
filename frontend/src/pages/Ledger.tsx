import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, ChevronLeft, ChevronRight, Coins, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { pointsApi } from '../lib/api';
import { useLocale } from '../contexts/LocaleContext';

interface HistoryItem {
  id: number;
  user_id: number;
  amount: number;
  reason: string;
  related_type: string | null;
  related_id: number | null;
  created_at: string;
}

const REASON_LABELS: Record<string, string> = {
  '上传科学组研究文件': 'Uploaded a science group research file',
  '充值套餐：Pro 套餐（订单号 LJ1779114120454B63AD0）': 'Recharge package: Pro plan (Order No. LJ1779114120454B63AD0)',
  '发起科学组研究讨论': 'Started a science group discussion',
};

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  post:     { label: 'Post', color: 'bg-sky-100 text-sky-700' },
  comment:  { label: 'Comment', color: 'bg-emerald-100 text-emerald-700' },
  colab:    { label: 'CoLab', color: 'bg-violet-100 text-violet-700' },
  recharge: { label: 'Recharge', color: 'bg-amber-100 text-amber-700' },
  invite:   { label: 'Invite', color: 'bg-pink-100 text-pink-700' },
};

function typeBadge(related_type: string | null) {
  if (!related_type) return null;
  const info = TYPE_LABEL[related_type] ?? { label: related_type, color: 'bg-stone-100 text-stone-600' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>
      {info.label}
    </span>
  );
}

export default function Ledger() {
  const { user } = useAuth();
  const { t, lang } = useLocale();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await pointsApi.history({ page: p, limit: LIMIT });
      setHistory(res.data.history as HistoryItem[]);
      setTotal(res.data.pagination.total);
      setTotalEarned(res.data.total_earned);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page); }, [load, page]);

  useEffect(() => {
    document.title = t('我的账本 - 灵创平台', 'My Ledger - SpiritHub');
    return () => { document.title = t('灵创平台', 'SpiritHub'); };
  }, [t]);

  if (!user) return <Navigate to="/login" replace />;

  const totalPages = Math.ceil(total / LIMIT);
  const displayReason = (reason: string) => lang === 'en' ? (REASON_LABELS[reason] || reason) : reason;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 顶部 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center">
          <Coins className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-900">{t('灵创值账本', 'Credits Ledger')}</h1>
          <p className="text-xs text-stone-500">{t('所有收支流水记录', 'All credit income and expense records')}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/recharge"
            className="flex items-center gap-1.5 text-sm py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors">
            <Wallet className="w-4 h-4" />
            {t('充值', 'Recharge')}
          </Link>
          <button onClick={() => load(page)} disabled={loading}
            className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 摘要卡片 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <p className="text-xs text-stone-500 mb-1">{t('当前余额', 'Current Balance')}</p>
          <p className="text-2xl font-bold text-amber-600">{user.lingjing_points ?? 0}</p>
          <p className="text-xs text-stone-400">{t('灵创值', 'credits')}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <p className="text-xs text-stone-500 mb-1">{t('累计获得', 'Total Earned')}</p>
          <p className="text-2xl font-bold text-emerald-600">{totalEarned}</p>
          <p className="text-xs text-stone-400">{t('灵创值', 'credits')}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <p className="text-xs text-stone-500 mb-1">{t('流水笔数', 'Record Count')}</p>
          <p className="text-2xl font-bold text-stone-800">{total}</p>
          <p className="text-xs text-stone-400">{t('条记录', 'records')}</p>
        </div>
      </div>

      {/* 流水列表 */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-stone-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />{t('加载中…', 'Loading...')}
          </div>
        ) : history.length === 0 ? (
          <div className="py-16 text-center text-stone-400 text-sm">{t('暂无流水记录', 'No transaction records yet')}</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {history.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.amount > 0 ? 'bg-emerald-50' : 'bg-rose-50'
                }`}>
                  {item.amount > 0
                    ? <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
                    : <ArrowDownCircle className="w-4 h-4 text-rose-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-800 truncate">{displayReason(item.reason)}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {typeBadge(item.related_type)}
                    <span className="text-xs text-stone-400">
                      {new Date(item.created_at.endsWith('Z') || item.created_at.includes('+') ? item.created_at : item.created_at + 'Z').toLocaleString(lang === 'en' ? 'en-US' : 'zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <span className={`text-base font-bold flex-shrink-0 ${item.amount > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {item.amount > 0 ? '+' : ''}{item.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-stone-600">{t('第', 'Page')} {page} / {totalPages} {t('页', '')}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
