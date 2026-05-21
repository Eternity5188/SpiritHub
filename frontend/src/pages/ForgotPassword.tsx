import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { authApi } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('请填写邮箱地址'); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || '请求失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
        <Link to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回登录
        </Link>

        {sent ? (
          <div className="card text-center py-10">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-stone-900 mb-2">邮件已发送</h2>
            <p className="text-stone-500 text-sm mb-6">
              我们已向 <strong>{email}</strong> 发送了密码重置链接，请在 1 小时内完成重置。
            </p>
            <p className="text-xs text-stone-400">
              没有收到？请检查垃圾邮件文件夹，或
              <button onClick={() => setSent(false)} className="text-violet-600 underline ml-1">
                重新发送
              </button>
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 border border-violet-200 mb-4">
                <Mail className="w-7 h-7 text-violet-600" />
              </div>
              <h1 className="text-2xl font-bold text-stone-900 mb-1">找回密码</h1>
              <p className="text-stone-500 text-sm">输入注册邮箱，我们将发送密码重置链接</p>
            </div>

            <div className="card">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mb-4 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">注册邮箱</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="example@mail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoFocus
                  />
                </div>
                <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
                  {loading ? '发送中...' : '发送重置链接'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
