import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Search, Check, X, MessageSquare, Trash2, Bell, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { friendsApi, recommendApi } from '../lib/api';
import { useSocket } from '../contexts/SocketContext';
import { useLocale } from '../contexts/LocaleContext';
import EmptyState from '../components/EmptyState';
import Avatar from '../components/Avatar';

interface FriendUser {
  id: number;
  username: string;
  avatar?: string;
  lingjing_points: number;
  friend_code?: string;
  bio?: string;
  friendship_id?: number;
  friend_since?: string;
  friendship_status?: string | null;
  my_role?: string | null;
  user_id?: number;
  created_at?: string;
}

type Tab = 'list' | 'requests' | 'search' | 'recommend';

export default function Friends() {
  const navigate = useNavigate();
  const { refreshUnread } = useSocket();
  const { t } = useLocale();
  const [tab, setTab] = useState<Tab>('list');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [received, setReceived] = useState<FriendUser[]>([]);
  const [sent, setSent] = useState<FriendUser[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);
  const [recFriends, setRecFriends] = useState<FriendUser[]>([]);
  const [recReady, setRecReady] = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [acceptingIds, setAcceptingIds] = useState<Set<number>>(new Set());

  const loadFriends = useCallback(async () => {
    const res = await friendsApi.list();
    setFriends(res.data.friends || []);
  }, []);

  const loadRequests = useCallback(async () => {
    const res = await friendsApi.requests();
    setReceived(res.data.received || []);
    setSent(res.data.sent || []);
  }, []);

  useEffect(() => {
    document.title = t('好友 - 灵创平台', 'Friends - SpiritHub');
    return () => { document.title = t('灵创平台', 'SpiritHub'); };
  }, [t]);

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, [loadFriends, loadRequests]);

  const loadRecommendations = useCallback(async () => {
    setRecLoading(true);
    try {
      const res = await recommendApi.friends();
      setRecFriends(res.data.recommendations || []);
      setRecReady(res.data.ready ?? true);
    } catch { /* ignore */ } finally { setRecLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'recommend' && recFriends.length === 0) loadRecommendations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    setLoading(true);
    try {
      const res = await friendsApi.search(searchQ.trim());
      setSearchResults(res.data.users || []);
    } catch { toast.error(t('搜索失败', 'Search failed')); } finally { setLoading(false); }
  };

  const handleSendRequest = async (username: string) => {
    try {
      await friendsApi.sendRequest(username);
      toast.success(t(`已向 ${username} 发送好友申请`, `Friend request sent to ${username}`));
      handleSearch();
    } catch (err: any) { toast.error(err.response?.data?.error || t('发送失败', 'Failed to send request')); }
  };

  const handleAccept = async (id: number) => {
    if (acceptingIds.has(id)) return;
    setAcceptingIds(prev => new Set(prev).add(id));
    try {
      await friendsApi.accept(id);
      toast.success(t('已接受好友申请', 'Friend request accepted'));
      loadFriends();
      loadRequests();
      refreshUnread();
    } catch { toast.error(t('操作失败', 'Operation failed')); }
    finally { setAcceptingIds(prev => { const s = new Set(prev); s.delete(id); return s; }); }
  };

  const handleReject = async (id: number) => {
    try {
      await friendsApi.reject(id);
      toast.success(t('已拒绝好友申请', 'Friend request rejected'));
      loadRequests();
      refreshUnread();
    } catch { toast.error(t('操作失败', 'Operation failed')); }
  };

  const handleRemove = (friendId: number) => {
    setPendingRemoveId(friendId);
  };

  const confirmRemove = async (friendId: number, username: string) => {
    try {
      await friendsApi.remove(friendId);
      toast.success(t(`已删除好友 ${username}`, `Removed friend ${username}`));
      loadFriends();
    } catch { toast.error(t('删除失败', 'Failed to remove friend')); }
    finally { setPendingRemoveId(null); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Users className="w-6 h-6 text-violet-600" /> {t('好友管理', 'Friends')}
      </h1>

      {/* 标签页 */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto scrollbar-none">
        {([['list', t('好友列表', 'Friends List')], ['requests', `${t('好友申请', 'Requests')}${received.length ? ` (${received.length})` : ''}`], ['search', t('搜索用户', 'Search Users')], ['recommend', `✨ ${t('为你推荐', 'Recommended for You')}`]] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${tab === key ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* 好友列表 */}
      {tab === 'list' && (
        <div className="space-y-3">
          {friends.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('还没有好友', 'No friends yet')}
              description={t('通过搜索用户名或好友码添加好友', 'Add friends by username or friend code')}
              actionLabel={t('搜索添加', 'Search to add')}
              onAction={() => setTab('search')}
            />
          ) : friends.map(f => (
            <div key={f.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <Avatar avatar={f.avatar} username={f.username} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{f.username}</p>
                <p className="text-xs text-slate-400">{t('灵创值', 'Credits')} {f.lingjing_points}</p>
              </div>
              {pendingRemoveId === f.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">{t('确定删除？', 'Remove this friend?')}</span>
                  <button onClick={() => confirmRemove(f.id, f.username)}
                    className="px-2.5 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-medium">
                    {t('确定', 'Confirm')}
                  </button>
                  <button onClick={() => setPendingRemoveId(null)}
                    className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-xs font-medium">
                    {t('取消', 'Cancel')}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/chat?user=${f.username}`)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" /> {t('发消息', 'Message')}
                  </button>
                  <button onClick={() => handleRemove(f.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 好友申请 */}
      {tab === 'requests' && (
        <div className="space-y-4">
          {received.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-1">
                <Bell className="w-4 h-4" /> {t('收到的申请', 'Received Requests')}
              </h3>
              <div className="space-y-2">
                {received.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <Avatar avatar={r.avatar} username={r.username} size="md" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{r.username}</p>
                      <p className="text-xs text-slate-400">{t('灵创值', 'Credits')} {r.lingjing_points}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(r.id as number)}
                        disabled={acceptingIds.has(r.id as number)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <Check className="w-3.5 h-3.5" /> {acceptingIds.has(r.id as number) ? t('处理中...', 'Processing...') : t('接受', 'Accept')}
                      </button>
                      <button onClick={() => handleReject(r.id as number)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                        <X className="w-3.5 h-3.5" /> {t('拒绝', 'Reject')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {sent.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-2">{t('已发出的申请', 'Sent Requests')}</h3>
              <div className="space-y-2">
                {sent.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <Avatar avatar={s.avatar} username={s.username} size="sm" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{s.username}</p>
                    </div>
                    <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">{t('等待回应', 'Waiting for reply')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {received.length === 0 && sent.length === 0 && (
            <EmptyState
              icon={Bell}
              title={t('暂无好友申请', 'No friend requests yet')}
              description={t('还没有收到或发出的好友申请', 'You have not received or sent any requests yet')}
            />
          )}
        </div>
      )}

      {/* GNN 好友推荐 */}
      {tab === 'recommend' && (
        <div>
          {recLoading ? (
            <div className="space-y-3">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm animate-pulse">
                  <div className="w-11 h-11 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : !recReady ? (
            <div className="text-center py-12 text-slate-400">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t('推荐功能准备中', 'Recommendations are being prepared')}</p>
              <p className="text-sm mt-1">{t('AI 推荐系统正在初始化，与更多用户互动后即可获得智能推荐', 'The AI recommendation engine is warming up. Interact with more users to unlock smarter suggestions.')}</p>
            </div>
          ) : recFriends.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t('暂无推荐数据，请先与平台更多用户互动', 'No recommendations yet. Interact with more users first.')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-4 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                {t('基于社交图谱分析，为你推荐可能认识的用户', 'Based on your social graph, here are people you may know')}
              </p>
              {recFriends.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <Avatar avatar={u.avatar} username={u.username} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{u.username}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {u.friend_code && (
                        <span className="text-xs text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded">#{u.friend_code}</span>
                      )}
                      {u.bio && <span className="text-xs text-slate-400 truncate">{u.bio}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => { handleSendRequest(u.username); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors flex-shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> {t('加好友', 'Add Friend')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 搜索用户 */}
      {tab === 'search' && (
        <div>
          <div className="flex gap-2 mb-4">
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={t('输入用户名或好友码（如：AB12CD34）...', 'Enter username or friend code (e.g. AB12CD34)...')}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm" />
            <button onClick={handleSearch} disabled={loading}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-1 text-sm disabled:opacity-50">
              <Search className="w-4 h-4" /> {t('搜索', 'Search')}
            </button>
          </div>
          <div className="space-y-2">
            {searchResults.map(u => {
              const isFriend = u.friendship_status === 'accepted';
              const isPending = u.friendship_status === 'pending';
              return (
                <div key={u.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <Avatar avatar={u.avatar} username={u.username} size="sm" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{u.username}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {u.friend_code && (
                        <span className="text-xs text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded">#{u.friend_code}</span>
                      )}
                      <span className="text-xs text-slate-400">{t('灵创值', 'Credits')} {u.lingjing_points}</span>
                    </div>
                  </div>
                  {isFriend ? (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">{t('已是好友', 'Already friends')}</span>
                  ) : isPending ? (
                    <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                      {u.my_role === 'sent' ? t('已发申请', 'Request sent') : t('等你接受', 'Waiting for your approval')}
                    </span>
                  ) : (
                    <button onClick={() => handleSendRequest(u.username)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors">
                      <UserPlus className="w-3.5 h-3.5" /> {t('添加好友', 'Add Friend')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
