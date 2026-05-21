import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Users, FileText, MessageSquare, Layers, MessageCircle,
  TrendingUp, Shield, Trash2, Crown, RefreshCw, AlertCircle, Download, X,
  Gift, Package, Plus, Edit2, ToggleLeft, ToggleRight, Coins, Check,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';
import api from '../lib/api';

interface AdminPost {
  id: number; title: string; content: string;
  likes_count: number; comments_count: number; created_at: string;
  author_id: number; author_name: string; author_avatar?: string;
}

interface RechargePackage {
  id: number; name: string; points: number; price: number;
  description: string; is_active: number; sort_order: number;
}

interface Stats {
  overview: {
    totalUsers: number;
    newUsersToday: number;
    newUsersWeek: number;
    totalPosts: number;
    newPostsWeek: number;
    totalComments: number;
    totalColab: number;
    activeColab: number;
    totalRooms: number;
    totalMessages: number;
  };
  topUsers: Array<{ id: number; username: string; avatar?: string; lingjing_points: number; role: string; created_at: string }>;
  userGrowth: Array<{ day: string; cnt: number }>;
  recentUsers: Array<{ id: number; username: string; email: string; role: string; lingjing_points: number; created_at: string }>;
}

function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }: {
  icon: React.ElementType; label: string; value: number | string; sub?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
    sky: 'bg-sky-50 text-sky-600',
  };
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color] ?? colorMap.indigo}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-stone-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-stone-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// 简易条形图
function GrowthLine({ data }: { data: Array<{ day: string; cnt: number }> }) {
  if (!data.length) return <p className="text-sm text-stone-400 py-4 text-center">暂无数据</p>;

  const W = 480, H = 110, PX = 24, PY = 16;
  const innerW = W - PX * 2;
  const innerH = H - PY * 2;
  const max = Math.max(...data.map(d => d.cnt), 1);
  const n = data.length;

  const px = (i: number) => PX + (i / (n - 1 || 1)) * innerW;
  const py = (v: number) => PY + innerH - (v / max) * innerH;

  const points = data.map((d, i) => `${px(i)},${py(d.cnt)}`).join(' ');
  // 填充路径
  const fillPath = `M ${px(0)},${py(data[0].cnt)} ` +
    data.map((d, i) => `L ${px(i)},${py(d.cnt)}`).join(' ') +
    ` L ${px(n - 1)},${PY + innerH} L ${px(0)},${PY + innerH} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 240 }}>
        {/* 横向参考线 */}
        {[0, 0.5, 1].map((t) => (
          <line key={t}
            x1={PX} y1={PY + innerH * (1 - t)}
            x2={W - PX} y2={PY + innerH * (1 - t)}
            stroke="#e7e5e4" strokeWidth={1} strokeDasharray={t === 0 ? '0' : '4 3'} />
        ))}
        {/* 填充区域 */}
        <defs>
          <linearGradient id="lgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill="url(#lgrad)" />
        {/* 折线 */}
        <polyline points={points} fill="none" stroke="#6366f1" strokeWidth={2.2}
          strokeLinejoin="round" strokeLinecap="round" />
        {/* 数据点 + 标签 */}
        {data.map((d, i) => (
          <g key={d.day}>
            <circle cx={px(i)} cy={py(d.cnt)} r={4} fill="#6366f1" stroke="white" strokeWidth={2} />
            {d.cnt > 0 && (
              <text x={px(i)} y={py(d.cnt) - 8} textAnchor="middle"
                fontSize={10} fill="#4f46e5" fontWeight={600}>
                {d.cnt}
              </text>
            )}
            {/* X 轴日期 */}
            <text x={px(i)} y={H - 2} textAnchor="middle" fontSize={10} fill="#a8a29e">
              {d.day.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [delConfirm, setDelConfirm] = useState<number | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // 帖子奖励
  const [adminPosts, setAdminPosts] = useState<AdminPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [rewardTarget, setRewardTarget] = useState<AdminPost | null>(null);
  const [rewardAmount, setRewardAmount] = useState('20');
  const [rewardReason, setRewardReason] = useState('优质内容奖励');
  const [rewardSuccess, setRewardSuccess] = useState<number | null>(null);

  // 充值套餐
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [pkgsLoading, setPkgsLoading] = useState(false);
  const [pkgForm, setPkgForm] = useState({ name: '', points: '', price: '', description: '', sort_order: '0' });
  const [editPkg, setEditPkg] = useState<RechargePackage | null>(null);
  const [pkgMsg, setPkgMsg] = useState('');

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await api.get('/admin/export-dataset', { responseType: 'blob' });
      const cd = res.headers['content-disposition'] || '';
      const match = cd.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : 'lingjing_dataset.db';
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setActionMsg('数据集已导出，开始下载！');
      setTimeout(() => setActionMsg(''), 4000);
    } catch (e: any) {
      setActionMsg('导出失败：' + (e.response?.data?.error || e.message));
      setTimeout(() => setActionMsg(''), 4000);
    } finally {
      setExportLoading(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (e: any) {
      setError(e.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const res = await api.get('/admin/posts');
      setAdminPosts(res.data.posts as AdminPost[]);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const loadPackages = useCallback(async () => {
    setPkgsLoading(true);
    try {
      const res = await api.get('/admin/packages');
      setPackages(res.data.packages as RechargePackage[]);
    } finally {
      setPkgsLoading(false);
    }
  }, []);

  useEffect(() => { load(); loadPosts(); loadPackages(); }, [load, loadPosts, loadPackages]);

  useEffect(() => {
    document.title = '管理后台 - 灵创平台';
    return () => { document.title = '灵创平台'; };
  }, []);

  const handleReward = async () => {
    if (!rewardTarget) return;
    try {
      await api.post(`/admin/posts/${rewardTarget.id}/reward`, { amount: Number(rewardAmount), reason: rewardReason });
      setRewardSuccess(rewardTarget.id);
      setRewardTarget(null);
      setActionMsg(`已为帖子「${rewardTarget.title.slice(0, 20)}」发放 ${rewardAmount} 灵创值奖励`);
      setTimeout(() => { setRewardSuccess(null); setActionMsg(''); }, 4000);
    } catch (e: any) {
      setActionMsg(e.response?.data?.error || '发放奖励失败');
      setTimeout(() => setActionMsg(''), 3000);
    }
  };

  const handleSavePkg = async () => {
    const payload = {
      name: editPkg ? editPkg.name : pkgForm.name,
      points: editPkg ? editPkg.points : Number(pkgForm.points),
      price: editPkg ? editPkg.price : Number(pkgForm.price),
      description: editPkg ? editPkg.description : pkgForm.description,
      sort_order: editPkg ? editPkg.sort_order : Number(pkgForm.sort_order),
      is_active: editPkg ? editPkg.is_active : 1,
    };
    try {
      if (editPkg) {
        await api.put(`/admin/packages/${editPkg.id}`, payload);
        setPkgMsg('套餐已更新');
      } else {
        await api.post('/admin/packages', payload);
        setPkgMsg('套餐已创建');
        setPkgForm({ name: '', points: '', price: '', description: '', sort_order: '0' });
      }
      setEditPkg(null);
      loadPackages();
      setTimeout(() => setPkgMsg(''), 3000);
    } catch (e: any) {
      setPkgMsg(e.response?.data?.error || '操作失败');
    }
  };

  const handleDeletePkg = async (id: number) => {
    try {
      await api.delete(`/admin/packages/${id}`);
      loadPackages();
      setPkgMsg('套餐已删除');
      setTimeout(() => setPkgMsg(''), 3000);
    } catch (e: any) {
      setPkgMsg(e.response?.data?.error || '删除失败，请重试');
      setTimeout(() => setPkgMsg(''), 4000);
    }
  };

  const handleTogglePkg = async (pkg: RechargePackage) => {
    try {
      await api.put(`/admin/packages/${pkg.id}`, { ...pkg, is_active: pkg.is_active ? 0 : 1 });
      loadPackages();
    } catch { /* ignore */ }
  };

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/admin/users/${id}`);
      setActionMsg('用户已删除');
      setDelConfirm(null);
      load();
    } catch (e: any) {
      setActionMsg(e.response?.data?.error || '删除失败');
    }
    setTimeout(() => setActionMsg(''), 3000);
  };

  const handleRoleToggle = async (id: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await api.patch(`/admin/users/${id}/role`, { role: newRole });
      setActionMsg(`已将用户设为 ${newRole === 'admin' ? '管理员' : '普通用户'}`);
      load();
    } catch (e: any) {
      setActionMsg(e.response?.data?.error || '操作失败');
    }
    setTimeout(() => setActionMsg(''), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 顶部标题 */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-stone-900 whitespace-nowrap leading-tight">管理后台</h1>
            <p className="text-xs text-stone-500 whitespace-nowrap">平台数据统计与用户管理</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={handleExport} disabled={exportLoading}
            className="flex items-center gap-1.5 text-sm py-1.5 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors disabled:opacity-60 whitespace-nowrap">
            <Download className={`w-4 h-4 ${exportLoading ? 'animate-bounce' : ''}`} />
            {exportLoading ? '导出中…' : '一键导出用户数据'}
          </button>
          <button onClick={load} disabled={loading}
            className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 whitespace-nowrap">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {/* 消息条 */}
      {actionMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-2 text-sm">
          {actionMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}



      {loading && !stats ? (
        <div className="flex items-center justify-center py-24 text-stone-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />加载中…
        </div>
      ) : stats && (
        <div className="space-y-6">
          {/* 概览卡片 */}
          <section>
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">数据概览</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard icon={Users}         label="总用户数"   value={stats.overview.totalUsers}
                sub={`今日 +${stats.overview.newUsersToday} · 本周 +${stats.overview.newUsersWeek}`} color="indigo" />
              <StatCard icon={FileText}      label="总帖子数"   value={stats.overview.totalPosts}
                sub={`本周新增 ${stats.overview.newPostsWeek}`} color="sky" />
              <StatCard icon={MessageSquare} label="总评论数"   value={stats.overview.totalComments} color="emerald" />
              <StatCard icon={Layers}        label="CoLab 项目" value={stats.overview.totalColab}
                sub={`进行中 ${stats.overview.activeColab}`} color="violet" />
              <StatCard icon={MessageCircle} label="聊天室消息" value={stats.overview.totalMessages}
                sub={`聊天室 ${stats.overview.totalRooms} 个`} color="amber" />
            </div>
          </section>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 用户注册趋势 */}
            <section className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary-600" />
                <h2 className="font-semibold text-stone-800">近 7 天用户注册</h2>
              </div>
              <GrowthLine data={stats.userGrowth.map(d => ({ day: String(d.day), cnt: Number(d.cnt) }))} />
            </section>

            {/* 积分榜 TOP 10 */}
            <section className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-4 h-4 text-amber-500" />
                <h2 className="font-semibold text-stone-800">积分 TOP 10</h2>
              </div>
              <div className="space-y-2">
                {stats.topUsers.map((u, i) => (
                  <div key={u.id} className="flex items-center gap-2">
                    <span className={`w-5 text-center text-xs font-bold ${i < 3 ? 'text-amber-500' : 'text-stone-400'}`}>
                      {i + 1}
                    </span>
                    <Avatar avatar={u.avatar} username={String(u.username)} size="xs" />
                    <span className="flex-1 text-sm text-stone-700 truncate">{String(u.username)}</span>
                    {u.role === 'admin' && (
                      <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">管理员</span>
                    )}
                    <span className="text-sm font-semibold text-amber-600">{Number(u.lingjing_points)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 最近注册用户 & 管理操作 */}
          <section className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-600" />
              <h2 className="font-semibold text-stone-800">最近注册用户（最多 20 条）</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">用户</th>
                    <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">邮箱</th>
                    <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">角色</th>
                    <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">积分</th>
                    <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">注册时间</th>
                    <th className="px-4 py-2.5 text-center font-medium whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {stats.recentUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-stone-800 whitespace-nowrap">{String(u.username)}</td>
                      <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">{String(u.email)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          u.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-100 text-stone-500'
                        }`}>
                          {u.role === 'admin' ? '管理员' : '普通用户'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600 font-semibold whitespace-nowrap">{Number(u.lingjing_points)}</td>
                      <td className="px-4 py-3 text-stone-400 text-xs whitespace-nowrap">
                        {new Date(String(u.created_at)).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {/* 不能操作自己 */}
                          {u.id !== user.id ? (
                            <>
                              <button
                                onClick={() => handleRoleToggle(Number(u.id), String(u.role))}
                                title={u.role === 'admin' ? '降为普通用户' : '设为管理员'}
                                className="p-1.5 rounded-lg hover:bg-indigo-50 text-stone-400 hover:text-indigo-600 transition-colors"
                              >
                                <Shield className="w-3.5 h-3.5" />
                              </button>
                              {delConfirm === u.id ? (
                                <div className="flex gap-1">
                                  <button onClick={() => handleDelete(Number(u.id))}
                                    className="text-xs bg-rose-500 text-white px-2 py-1 rounded-md">确认</button>
                                  <button onClick={() => setDelConfirm(null)}
                                    className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-md">取消</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDelConfirm(Number(u.id))}
                                  title="删除用户"
                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-500 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-stone-300">（当前账号）</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ── 帖子审核与奖励 ── */}
      <section className="mt-6 bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-emerald-500" />
            <h2 className="font-semibold text-stone-800">帖子内容奖励</h2>
            <span className="text-xs text-stone-400">（最近 100 条帖子）</span>
          </div>
          <button onClick={loadPosts} disabled={postsLoading}
            className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${postsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {postsLoading ? (
          <div className="flex items-center justify-center py-8 text-stone-400">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />加载中…
          </div>
        ) : adminPosts.length === 0 ? (
          <div className="py-8 text-center text-sm text-stone-400">暂无帖子</div>
        ) : (
          <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
            {adminPosts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar avatar={p.author_avatar} username={p.author_name} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{p.title}</p>
                  <p className="text-xs text-stone-400">
                    {p.author_name} · 赞 {p.likes_count} · 评 {p.comments_count} · {new Date(p.created_at).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                {rewardSuccess === p.id ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <Check className="w-3.5 h-3.5" />已奖励
                  </span>
                ) : (
                  <button onClick={() => { setRewardTarget(p); setRewardAmount('20'); setRewardReason('优质内容奖励'); }}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors font-medium">
                    <Gift className="w-3 h-3" />发奖励
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 奖励弹窗 */}
      {rewardTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setRewardTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-stone-800">发放灵创值奖励</h3>
            </div>
            <p className="text-xs text-stone-500 mb-4 bg-stone-50 rounded-lg p-2 truncate">
              帖子：{rewardTarget.title}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">奖励数量（灵创值）</label>
                <input type="number" min="1" max="10000" value={rewardAmount}
                  onChange={e => setRewardAmount(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">奖励原因</label>
                <input type="text" maxLength={100} value={rewardReason}
                  onChange={e => setRewardReason(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setRewardTarget(null)}
                className="flex-1 py-2 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-50">取消</button>
              <button onClick={handleReward}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600">确认发放</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 充值套餐管理 ── */}
      <section className="mt-6 bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-stone-800">充值套餐管理</h2>
          </div>
          <button onClick={loadPackages} disabled={pkgsLoading}
            className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${pkgsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {pkgMsg && (
          <div className="mx-5 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2 text-xs">{pkgMsg}</div>
        )}

        {/* 新建/编辑表单 */}
        <div className="px-5 py-4 bg-stone-50 border-b border-stone-100">
          <p className="text-xs font-semibold text-stone-600 mb-3">{editPkg ? '编辑套餐' : '新建套餐'}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <input placeholder="套餐名称 *" value={editPkg ? editPkg.name : pkgForm.name}
              onChange={e => editPkg ? setEditPkg({...editPkg, name: e.target.value}) : setPkgForm({...pkgForm, name: e.target.value})}
              className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 col-span-2 md:col-span-1" />
            <input placeholder="灵创值数量 *" type="number" min="1" value={editPkg ? editPkg.points : pkgForm.points}
              onChange={e => editPkg ? setEditPkg({...editPkg, points: Number(e.target.value)}) : setPkgForm({...pkgForm, points: e.target.value})}
              className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            <input placeholder="价格（元）*" type="number" min="0.01" step="0.01" value={editPkg ? editPkg.price : pkgForm.price}
              onChange={e => editPkg ? setEditPkg({...editPkg, price: Number(e.target.value)}) : setPkgForm({...pkgForm, price: e.target.value})}
              className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            <input placeholder="排序序号" type="number" value={editPkg ? editPkg.sort_order : pkgForm.sort_order}
              onChange={e => editPkg ? setEditPkg({...editPkg, sort_order: Number(e.target.value)}) : setPkgForm({...pkgForm, sort_order: e.target.value})}
              className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>
          <div className="flex gap-2">
            <input placeholder="套餐描述（可选）" value={editPkg ? editPkg.description : pkgForm.description}
              onChange={e => editPkg ? setEditPkg({...editPkg, description: e.target.value}) : setPkgForm({...pkgForm, description: e.target.value})}
              className="flex-1 border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            {editPkg && (
              <button onClick={() => setEditPkg(null)}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-sm text-stone-600 hover:bg-stone-100">取消</button>
            )}
            <button onClick={handleSavePkg}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors">
              <Plus className="w-3.5 h-3.5" />{editPkg ? '保存' : '创建'}
            </button>
          </div>
        </div>

        {/* 套餐列表 */}
        {pkgsLoading ? (
          <div className="flex items-center justify-center py-6 text-stone-400">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />加载中…
          </div>
        ) : packages.length === 0 ? (
          <div className="py-8 text-center text-sm text-stone-400">尚未创建任何套餐</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {packages.map((pkg) => (
              <div key={pkg.id} className={`flex items-center gap-3 px-5 py-3 ${!pkg.is_active ? 'opacity-50' : ''}`}>
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Coins className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800">{pkg.name}</p>
                  <p className="text-xs text-stone-400">{pkg.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-amber-600">{pkg.points} 灵创值</p>
                  <p className="text-xs text-stone-500">¥{Number(pkg.price).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleTogglePkg(pkg)}
                    title={pkg.is_active ? '下架' : '上架'}
                    className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors text-stone-400">
                    {pkg.is_active
                      ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                      : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setEditPkg(pkg)}
                    className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors text-stone-400">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeletePkg(pkg.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 transition-colors text-stone-400 hover:text-rose-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
