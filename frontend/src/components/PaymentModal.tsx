import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Clock, Smartphone, CreditCard, Copy, Check } from 'lucide-react';
import { pointsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

interface Package {
  id: number;
  name: string;
  points: number;
  price: number;
  description: string;
}

interface OrderInfo {
  order_no: string;
  package_name: string;
  points: number;
  price: number;
  expires_at: string;
  pay_method: string;
}

interface Props {
  pkg: Package;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

const PAY_METHODS = [
  { key: 'wechat', labelZh: '微信支付', labelEn: 'WeChat Pay', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100', active: 'bg-emerald-500 text-white border-emerald-500' },
  { key: 'alipay', labelZh: '支付宝', labelEn: 'Alipay',   color: 'text-sky-600',     bg: 'bg-sky-50 border-sky-200 hover:bg-sky-100',             active: 'bg-sky-500 text-white border-sky-500' },
];

const TOTAL_SECS = 5 * 60; // 5 分钟订单有效期

export default function PaymentModal({ pkg, onClose, onSuccess }: Props) {
  const { refreshUser } = useAuth();
  const { lang, t } = useLocale();
  const [payMethod, setPayMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [step, setStep] = useState<'creating' | 'qr' | 'confirming' | 'success' | 'error'>('creating');
  const [errMsg, setErrMsg] = useState('');
  const [remaining, setRemaining] = useState(TOTAL_SECS);
  const [copied, setCopied] = useState(false);

  // 创建订单
  const createOrder = useCallback(async (method: string) => {
    setStep('creating');
    setErrMsg('');
    try {
      const res = await pointsApi.createOrder(pkg.id, method);
      setOrder(res.data as OrderInfo);
      setRemaining(TOTAL_SECS);
      setStep('qr');
    } catch (e: any) {
      setErrMsg(e.response?.data?.error || t('创建订单失败，请重试', 'Failed to create order. Please try again.'));
      setStep('error');
    }
  }, [pkg.id, t]);

  useEffect(() => { createOrder(payMethod); }, []);

  // 倒计时
  useEffect(() => {
    if (step !== 'qr') return;
    if (remaining <= 0) { setStep('error'); setErrMsg(t('订单已过期，请重新发起支付', 'Order expired. Please create a new one.')); return; }
    const timer = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, step]);

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');

  async function confirmPayment() {
    if (!order) return;
    setStep('confirming');
    try {
      const res = await pointsApi.confirmPayment(order.order_no);
      if (refreshUser) await refreshUser();
      onSuccess(res.data.new_balance);
      setStep('success');
    } catch (e: any) {
      setErrMsg(e.response?.data?.error || t('确认失败，请联系客服', 'Confirmation failed. Please contact support.'));
      setStep('error');
    }
  }

  function handleMethodChange(method: 'wechat' | 'alipay') {
    setPayMethod(method);
    createOrder(method);
  }

  async function copyOrderNo() {
    if (!order) return;
    await navigator.clipboard.writeText(order.order_no);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{t('灵创值充值', 'Credit Recharge')}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{pkg.name} · {pkg.points} {t('灵创值', 'credits')}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 成功状态 */}
        {step === 'success' && (
          <div className="px-6 py-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-800">{t('支付成功！', 'Payment successful!')}</p>
              <p className="text-sm text-slate-500 mt-1">{t('已到账', 'Credited')} <span className="font-bold text-amber-600">{pkg.points}</span> {t('灵创值', 'credits')}</p>
            </div>
            <button onClick={onClose} className="mt-2 px-8 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 transition-colors">
              {t('完成', 'Done')}
            </button>
          </div>
        )}

        {/* 错误状态 */}
        {step === 'error' && (
          <div className="px-6 py-8 flex flex-col items-center gap-4">
            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <p className="text-sm text-rose-600 text-center font-medium">{errMsg}</p>
            <div className="flex gap-3">
              <button onClick={() => createOrder(payMethod)} className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                {t('重新生成', 'Regenerate')}
              </button>
              <button onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors">
                {t('关闭', 'Close')}
              </button>
            </div>
          </div>
        )}

        {/* 创建订单中 */}
        {step === 'creating' && (
          <div className="px-6 py-10 flex flex-col items-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
            <p className="text-sm">{t('正在生成订单…', 'Creating order...')}</p>
          </div>
        )}

        {/* 主支付界面 */}
        {(step === 'qr' || step === 'confirming') && order && (
          <div className="px-6 py-5 space-y-4">
            {/* 金额 */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-medium">{t('实付金额', 'Amount to pay')}</p>
                <p className="text-3xl font-bold text-amber-700 mt-0.5">
                  ¥<span>{Number(pkg.price).toFixed(2)}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">{t('到账灵创值', 'Credits received')}</p>
                <p className="text-2xl font-bold text-slate-700">{pkg.points}</p>
              </div>
            </div>

            {/* 支付方式切换 */}
            <div className="flex gap-2">
              {PAY_METHODS.map(m => (
                <button
                  key={m.key}
                  onClick={() => handleMethodChange(m.key as 'wechat' | 'alipay')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-semibold transition-all ${
                    payMethod === m.key ? m.active : `${m.bg} ${m.color}`
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  {lang === 'en' ? m.labelEn : m.labelZh}
                </button>
              ))}
            </div>

            {/* 二维码区域 */}
            <div className="flex flex-col items-center gap-3 bg-slate-50 rounded-2xl p-5">
              <div className="relative">
                <img
                  src="/qr-placeholder.svg"
                  alt={t('支付二维码', 'Payment QR code')}
                  className="w-44 h-44 rounded-lg border-4 border-white shadow-md"
                />
                {/* 支付方式水印 */}
                <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white shadow ${
                  payMethod === 'wechat' ? 'bg-emerald-500' : 'bg-sky-500'
                }`}>
                  {payMethod === 'wechat'
                    ? t('微信支付', 'WeChat Pay')
                    : t('支付宝', 'Alipay')}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                {payMethod === 'wechat'
                  ? t('打开微信 → 扫一扫', 'Open WeChat -> Scan')
                  : t('打开支付宝 → 扫码付款', 'Open Alipay -> Scan to pay')}
              </p>

              {/* 倒计时 */}
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs">
                  {t('订单有效期', 'Order valid for')} <span className={`font-mono font-bold ${remaining < 60 ? 'text-rose-500' : 'text-slate-700'}`}>{mins}:{secs}</span>
                </span>
              </div>
            </div>

            {/* 订单号 */}
            <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
              <div>
                <p className="text-[10px] text-slate-400">{t('订单号', 'Order No.')}</p>
                <p className="text-xs font-mono text-slate-600 tracking-wide">{order.order_no}</p>
              </div>
              <button onClick={copyOrderNo} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('已复制', 'Copied') : t('复制', 'Copy')}
              </button>
            </div>

            {/* 确认按钮 */}
            <button
              onClick={confirmPayment}
              disabled={step === 'confirming'}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 transition-all shadow-lg shadow-violet-500/25 active:scale-[0.98]"
            >
              {step === 'confirming' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {t('确认中…', 'Confirming...')}
                </span>
              ) : t('我已完成付款', 'I have completed payment')}
            </button>

            <p className="text-center text-[10px] text-slate-300">
              {t('灵创值为平台内部积分，不可提现 · 支付即同意服务协议', 'Credits are internal points, non-withdrawable. Payment means agreement to Terms.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
