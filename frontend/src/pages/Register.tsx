import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { authApi } from '../lib/api';
import { saveAuth } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

export default function Register() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { t } = useLocale();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.email || !form.password) {
      setError(t('请填写所有必填项', 'Please fill all required fields'));
      return;
    }
    if (form.password !== form.confirm) {
      setError(t('两次输入的密码不一致', 'Passwords do not match'));
      return;
    }
    if (form.password.length < 6) {
      setError(t('密码至少需要 6 位', 'Password must be at least 6 characters'));
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register({ username: form.username, email: form.email, password: form.password });
      saveAuth(res.data.token, res.data.user);
      await refreshUser();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || t('注册失败，请重试', 'Sign-up failed, please try again'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 mb-4">
            <Sparkles className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-1">{t('创建账号', 'Create Account')}</h1>
          <p className="text-stone-500">{t('加入灵创社区，与创作者共同成长', 'Join the community and grow globally')}</p>
        </div>
        <div className="card">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('用户名', 'Username')} <span className="text-red-400">*</span></label>
              <input
                className={`input ${form.username && (form.username.length < 2 || form.username.length > 20) ? 'border-red-400' : form.username.length >= 2 ? 'border-green-400' : ''}`}
                type="text" placeholder={t('2-20 个字符', '2-20 characters')} value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))} autoComplete="username"
              />
              {form.username && (form.username.length < 2 || form.username.length > 20) && (
                <p className="text-xs text-red-500 mt-1">{t(`用户名需在 2-20 个字符之间（当前 ${form.username.length} 个）`, `Username must be 2-20 characters (${form.username.length})`)}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('邮箱', 'Email')} <span className="text-red-400">*</span></label>
              <input className="input" type="email" placeholder="user@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('密码', 'Password')} <span className="text-red-400">*</span></label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'} placeholder={t('至少 6 位', 'At least 6 characters')} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} autoComplete="new-password" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-1.5 flex gap-1">
                  {[1,2,3].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                      form.password.length >= i * 4
                        ? i === 1 ? 'bg-red-400' : i === 2 ? 'bg-yellow-400' : 'bg-green-400'
                        : 'bg-stone-200'
                    }`} />
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('确认密码', 'Confirm Password')} <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  className={`input pr-10 ${form.confirm && form.confirm !== form.password ? 'border-red-400' : form.confirm && form.confirm === form.password ? 'border-green-400' : ''}`}
                  type={showPw ? 'text' : 'password'} placeholder={t('再次输入密码', 'Repeat password')}
                  value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} autoComplete="new-password"
                />
                {form.confirm && form.confirm === form.password && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? t('注册中...', 'Creating...') : t('创建账号', 'Create Account')}
            </button>
          </form>
          <p className="text-center text-sm text-stone-500 mt-4">
            {t('已有账号？', 'Already have an account?')}{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">{t('立即登录', 'Log In')}</Link>
          </p>
          <p className="text-center text-xs text-stone-400 mt-3">
            {t('注册即表示你同意', 'By signing up, you agree to')}{' '}
            <Link to="/terms" className="text-violet-600 hover:underline">{t('用户协议', 'Terms')}</Link>
            {' '}{t('和', 'and')}{' '}
            <Link to="/privacy" className="text-violet-600 hover:underline">{t('隐私政策', 'Privacy Policy')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
