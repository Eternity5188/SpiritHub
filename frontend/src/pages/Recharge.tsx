import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Wallet, Coins, Check, RefreshCw, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { pointsApi } from '../lib/api';
import PaymentModal from '../components/PaymentModal';
import { useLocale } from '../contexts/LocaleContext';

interface Package {
  id: number;
  name: string;
  points: number;
  price: number;
  description: string;
  is_active: number;
  sort_order: number;
}

export default function Recharge() {
  const { user, refreshUser } = useAuth();
  const { t } = useLocale();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [successId, setSuccessId] = useState<number | null>(null);
  const [payingPkg, setPayingPkg] = useState<Package | null>(null); // 当前弹窗套餐

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pointsApi.packages();
      setPackages(res.data.packages as Package[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    document.title = t('充值 - 灵创平台', 'Recharge - SpiritHub');
    return () => { document.title = t('灵创平台', 'SpiritHub'); };
  }, [t]);

  if (!user) return <Navigate to="/login" replace />;

  const handleBuy = (pkg: Package) => {
    setSuccessId(null);
    setPayingPkg(pkg);
  };

  const handlePaySuccess = (newBalance: number) => {
    setPayingPkg(null);
    if (payingPkg) setSuccessId(payingPkg.id);
    setTimeout(() => setSuccessId(null), 4000);
    if (refreshUser) refreshUser();
  };

  // 套餐颜色主题
  const themes = [
    'from-sky-400 to-blue-500',
    'from-violet-400 to-purple-500',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-teal-500',
    'from-rose-400 to-pink-500',
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {payingPkg && (
        <PaymentModal
          pkg={payingPkg}
          onClose={() => setPayingPkg(null)}
          onSuccess={handlePaySuccess}
        />
      )}
      {/* 标题 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-900">灵创值充值</h1>
          <p className="text-xs text-stone-500">{t('选择套餐，灵创值即时到账', 'Choose a package and get credits instantly')}</p>
        </div>
        <Link to="/ledger"
          className="ml-auto flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 transition-colors">
          {t('查看账本', 'View Ledger')} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 当前余额 */}
      <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-5 mb-6 text-white">
        <p className="text-sm opacity-80 mb-1">{t('当前灵创值余额', 'Current Credit Balance')}</p>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold">{user.lingjing_points ?? 0}</span>
          <span className="text-sm opacity-70 mb-1">{t('灵创值', 'credits')}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-3 opacity-70">
          <Coins className="w-4 h-4" />
          <span className="text-xs">{t('灵创值可用于调用文化转译、ProfitLab、Puente 等平台服务', 'Credits can be used for Transcreation, ProfitLab, Puente and other services')}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-stone-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />{t('加载中…', 'Loading...')}
        </div>
      ) : packages.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <Wallet className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">{t('暂无可用套餐，请联系管理员配置', 'No active packages. Please contact admin.')}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {packages.map((pkg, idx) => {
            const theme = themes[idx % themes.length];
            const isSuccess = successId === pkg.id;
            return (
              <div key={pkg.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* 彩色顶部 */}
                <div className={`bg-gradient-to-r ${theme} px-5 pt-5 pb-4 text-white`}>
                  <p className="text-sm font-medium opacity-90">{pkg.name}</p>
                  <div className="flex items-end gap-1.5 mt-1">
                    <span className="text-3xl font-bold">{Number(pkg.points)}</span>
                    <span className="text-sm opacity-70 mb-0.5">{t('灵创值', 'credits')}</span>
                  </div>
                </div>
                {/* 内容 */}
                <div className="px-5 py-4">
                  {pkg.description && (
                    <p className="text-xs text-stone-500 mb-3">{pkg.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-stone-400">{t('价格', 'Price')}</span>
                      <p className="text-xl font-bold text-stone-800">¥{Number(pkg.price).toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => handleBuy(pkg)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        isSuccess
                          ? 'bg-emerald-500 text-white'
                          : `bg-gradient-to-r ${theme} text-white hover:opacity-90`
                      }`}
                    >
                      {isSuccess ? <><Check className="w-4 h-4" />{t('已到账', 'Credited')}</> : t('立即充值', 'Recharge Now')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-stone-400 mt-6">
        {t('灵创值为平台内部积分，不可提现 · 充值即视为同意平台服务协议', 'Credits are internal points and non-withdrawable. Recharging means you agree to the Terms.')}
      </p>
    </div>
  );
}
