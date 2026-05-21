import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

export default function Login() {
  const { login } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.password) {
      setError(t('请填写完整信息', 'Please complete all required fields'));
      return;
    }
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || t('登录失败，请重试', 'Login failed, please try again'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-50 border border-primary-200 mb-4">
            <Sparkles className="w-7 h-7 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-1">{t('欢迎回来', 'Welcome Back')}</h1>
          <p className="text-stone-500">{t('登录你的灵创账号继续创作', 'Sign in to continue')}</p>
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
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('用户名 / 邮箱', 'Username / Email')}</label>
              <input
                className="input"
                type="text"
                placeholder={t('输入用户名或邮箱', 'Enter username or email')}
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t('密码', 'Password')}</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPw ? 'text' : 'password'}
                  placeholder={t('输入密码', 'Enter password')}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? t('登录中...', 'Signing in...') : t('登录', 'Log In')}
            </button>
          </form>

          <div className="flex items-center justify-between mt-4">
            <Link
              to="/forgot-password"
              className="text-sm text-stone-400 hover:text-violet-600 transition-colors"
            >
              {t('忘记密码？', 'Forgot password?')}
            </Link>
            <p className="text-sm text-stone-500">
              {t('还没有账号？', 'No account yet?')}{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">{t('立即注册', 'Sign up now')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
