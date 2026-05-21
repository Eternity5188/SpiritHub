import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { authApi } from '../lib/api';
import { toast } from 'sonner';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const token     = params.get('token') || '';

  const [form, setForm]     = useState({ password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!token) setError('链接无效，请重新申请密码重置');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6)             { setError('密码至少 6 位'); return; }
    if (form.password !== form.confirm)        { setError('两次密码不一致'); return; }
    setLoading(true);
    try {
      await authApi.resetPassword(token, form.password);
      setDone(true);
      toast.success('密码已重置！正在跳转...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || '重置失败，链接可能已过期');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
        {done ? (
          <div className="card text-center py-10">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-stone-900 mb-2">密码重置成功</h2>
            <p className="text-stone-500 text-sm">正在跳转到登录页…</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 border border-violet-200 mb-4">
                <KeyRound className="w-7 h-7 text-violet-600" />
              </div>
              <h1 className="text-2xl font-bold text-stone-900 mb-1">设置新密码</h1>
              <p className="text-stone-500 text-sm">请输入你的新密码</p>
            </div>

            <div className="card">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mb-4 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                  {!token && (
                    <Link to="/forgot-password" className="ml-auto underline font-medium whitespace-nowrap">重新申请</Link>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">新密码</label>
                  <div className="relative">
                    <input
                      className="input pr-10"
                      type={showPw ? 'text' : 'password'}
                      placeholder="至少 6 位"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      autoComplete="new-password"
                      disabled={!token}
                    />
                    <button type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                      onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">确认新密码</label>
                  <input
                    className={`input ${form.confirm && form.confirm !== form.password ? 'border-red-400' : form.confirm && form.confirm === form.password ? 'border-green-400' : ''}`}
                    type={showPw ? 'text' : 'password'}
                    placeholder="再次输入密码"
                    value={form.confirm}
                    onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                    autoComplete="new-password"
                    disabled={!token}
                  />
                </div>

                <button type="submit" className="btn-primary w-full py-2.5" disabled={loading || !token}>
                  {loading ? '重置中...' : '确认重置密码'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
