import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Send, Users, MessageSquare, Plus, Settings, Smile,
  X, Crown, UserMinus, Edit2, Hash, ArrowLeft, ChevronDown,
} from 'lucide-react';
import { friendsApi, roomsApi } from '../lib/api';
import { connectSocket } from '../lib/socket';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useLocale } from '../contexts/LocaleContext';
import AvatarComp from '../components/Avatar';

// ─── Types ────────────────────────────────────────────────────
interface ChatMsg {
  id: number;
  content: string;
  created_at: string;
  room_id?: number;
  user_id?: number;
  username?: string;
  avatar?: string;
  sender_id?: number;
  receiver_id?: number;
  sender_name?: string;
  sender_avatar?: string;
}
interface Room {
  id: number; name: string; description: string; community: string;
  owner_id: number; owner_name: string; member_count: number; is_joined: number;
}
interface RoomMember { id: number; username: string; avatar?: string; lingjing_points: number; }
interface Friend { id: number; username: string; avatar?: string; lingjing_points: number; }
interface LastMsg { text: string; time: string; }
interface MsgGroup {
  msgs: ChatMsg[]; senderId: number; senderName: string;
  senderAvatar?: string; isMine: boolean;
}

// ─── Constants ────────────────────────────────────────────────
const EMOJIS = ['😀','😂','😍','🥰','😎','🤔','😅','😭','🙏','👍','👎','❤️',
  '🎉','🔥','💯','✅','😊','🤣','😇','💪','🌟','✨','😱','🤦','🙄','💬','🎊','💰','🚀','👀'];
const COMMUNITIES = [
  { value: 'general', label: '综合' }, { value: 'creative', label: '创意设计' },
  { value: 'tech', label: '技术开发' }, { value: 'marketing', label: '营销出海' },
  { value: 'art', label: '艺术文化' }, { value: 'business', label: '商业运营' },
];
const COMMUNITY_EN_LABELS: Record<string, string> = {
  general: 'General',
  creative: 'Creative Design',
  tech: 'Tech Development',
  marketing: 'Global Marketing',
  art: 'Arts & Culture',
  business: 'Business Ops',
};

// ─── Helpers ──────────────────────────────────────────────────

function dedup(msgs: ChatMsg[]): ChatMsg[] {
  const seen = new Set<number>();
  return msgs.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
}
function sortByTime(msgs: ChatMsg[]): ChatMsg[] {
  return [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}
function getDateLabel(dateStr: string, lang: 'zh' | 'en'): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (msgDate.getTime() === today.getTime()) return lang === 'en' ? 'Today' : '今天';
  if (msgDate.getTime() === yesterday.getTime()) return lang === 'en' ? 'Yesterday' : '昨天';
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { month: 'long', day: 'numeric' });
}
function formatTime(dateStr: string, lang: 'zh' | 'en'): string {
  return new Date(dateStr).toLocaleTimeString(lang === 'en' ? 'en-US' : 'zh-CN', { hour: '2-digit', minute: '2-digit' });
}
function groupMessages(msgs: ChatMsg[], viewType: 'room_chat' | 'private', myId: number): MsgGroup[] {
  const groups: MsgGroup[] = [];
  for (const msg of msgs) {
    const senderId = viewType === 'room_chat' ? (msg.user_id ?? 0) : (msg.sender_id ?? 0);
    const senderName = viewType === 'room_chat' ? (msg.username ?? '') : (msg.sender_name ?? '');
    const senderAvatar = viewType === 'room_chat' ? msg.avatar : msg.sender_avatar;
    const isMine = Number(senderId) === Number(myId);
    const last = groups[groups.length - 1];
    const prevTime = last?.msgs[last.msgs.length - 1]?.created_at;
    const withinTime = prevTime &&
      Math.abs(new Date(msg.created_at).getTime() - new Date(prevTime).getTime()) < 5 * 60 * 1000;
    if (last && last.senderId === senderId && withinTime) {
      last.msgs.push(msg);
    } else {
      groups.push({ msgs: [msg], senderId, senderName, senderAvatar: senderAvatar ?? undefined, isMine });
    }
  }
  return groups;
}

// ─── TypingDots ───────────────────────────────────────────────
function TypingDots({ names }: { names: string[] }) {
  const { t } = useLocale();
  if (!names.length) return null;
  const label = names.length === 1
    ? `${names[0]} ${t('正在输入', 'is typing')}`
    : `${names.slice(0, 2).join('、')} ${t('正在输入', 'are typing')}`;
  return (
    <div className="flex items-center gap-1.5 px-5 py-2 text-xs text-gray-400 bg-white border-t border-gray-50 flex-shrink-0">
      <span className="flex gap-0.5 items-center">
        {[0, 1, 2].map(i => (
          <span key={i} className="inline-block w-1.5 h-1.5 bg-gray-300 rounded-full"
            style={{ animation: 'typingBounce 1.2s infinite', animationDelay: `${i * 0.2}s` }} />
        ))}
      </span>
      <span>{label}...</span>
      <style>{`@keyframes typingBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}`}</style>
    </div>
  );
}

// ─── EmojiPicker ──────────────────────────────────────────────
function EmojiPicker({ onSelect }: { onSelect: (e: string) => void }) {
  return (
    <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-2xl shadow-2xl p-3 z-50 w-52"
      onClick={e => e.stopPropagation()}>
      <div className="grid grid-cols-6 gap-1">
        {EMOJIS.map(e => (
          <button key={e} onMouseDown={ev => { ev.preventDefault(); onSelect(e); }}
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded-lg transition-colors">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── CreateRoomModal ──────────────────────────────────────────
function CreateRoomModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [community, setCommunity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setError(t('请输入聊天室名称', 'Please enter a room name')); return; }
    if (!community) { setError(t('请选择所属社区', 'Please select a community')); return; }
    setLoading(true);
    try {
      await roomsApi.create({ name, description, community });
      onCreate(); onClose();
    } catch (err: any) { setError(err.response?.data?.error || t('创建失败', 'Failed to create room')); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-lg">{t('创建聊天室', 'Create Room')}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('聊天室名称', 'Room Name')} <span className="text-red-500">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={30}
              placeholder={t('例如：灵感碰撞角', 'e.g. Idea Exchange')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 focus:bg-white transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('所属社区', 'Community')} <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {COMMUNITIES.map(c => (
                <button key={c.value} onClick={() => setCommunity(c.value)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${community === c.value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {t(c.label, COMMUNITY_EN_LABELS[c.value] || c.value)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('简介（可选）', 'Description (optional)')}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={100}
              placeholder={t('简单介绍一下这个聊天室...', 'A short intro for this room...')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 focus:bg-white transition-colors resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">{t('取消', 'Cancel')}</button>
            <button onClick={handleCreate} disabled={loading}
              className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50">
              {loading ? t('创建中...', 'Creating...') : t('创建', 'Create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RoomSettingsModal ────────────────────────────────────────
function RoomSettingsModal({ room, members, onClose, onUpdated, onLeft, currentUserId }: {
  room: Room; members: RoomMember[]; onClose: () => void;
  onUpdated: () => void; onLeft: () => void; currentUserId: number;
}) {
  const { t } = useLocale();
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description || '');
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isOwner = room.owner_id === currentUserId;

  const handleUpdate = async () => {
    setLoading(true);
    try { await roomsApi.update(room.id, { name, description }); onUpdated(); setEditMode(false); }
    catch (err: any) { setError(err.response?.data?.error || t('更新失败', 'Update failed')); }
    finally { setLoading(false); }
  };
  const handleKick = async (member: RoomMember) => {
    if (!confirm(t(`确定踢出 ${member.username}？`, `Remove ${member.username}?`))) return;
    try { await roomsApi.kick(room.id, member.id); onUpdated(); }
    catch (err: any) { setError(err.response?.data?.error || t('操作失败', 'Operation failed')); }
  };
  const handleLeave = async () => {
    if (!confirm(isOwner ? t('确定解散聊天室？所有消息将清除。', 'Dissolve this room? All messages will be removed.') : t('确定离开聊天室？', 'Leave this room?'))) return;
    try {
      if (isOwner) { await roomsApi.delete(room.id); } else { await roomsApi.leave(room.id); }
      onLeft(); onClose();
    } catch (err: any) { setError(err.response?.data?.error || t('操作失败', 'Operation failed')); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-900 text-lg">{t('聊天室设置', 'Room Settings')}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">{t('基本信息', 'Basic Info')}</h3>
              {isOwner && !editMode && (
                <button onClick={() => setEditMode(true)} className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700">
                  <Edit2 className="w-3.5 h-3.5" /> {t('编辑', 'Edit')}
                </button>
              )}
            </div>
            {editMode ? (
              <div className="space-y-3">
                <input value={name} onChange={e => setName(e.target.value)} maxLength={30}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50" />
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={100}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-gray-50 resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => setEditMode(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">{t('取消', 'Cancel')}</button>
                  <button onClick={handleUpdate} disabled={loading} className="flex-1 py-2 bg-violet-600 text-white rounded-xl text-sm disabled:opacity-50">{t('保存', 'Save')}</button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="font-medium text-gray-900">{room.name}</p>
                {room.description && <p className="text-sm text-gray-500 mt-1">{room.description}</p>}
                <p className="text-xs text-gray-400 mt-2">{t('所属社区：', 'Community: ')}{t(COMMUNITIES.find(c => c.value === room.community)?.label || room.community, COMMUNITY_EN_LABELS[room.community] || room.community)}</p>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('成员', 'Members')} ({members.length})</h3>
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-2">
                  <AvatarComp avatar={m.avatar ?? undefined} username={m.username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-900 truncate">{m.username}</span>
                      {m.id === room.owner_id && <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                    </div>
                  </div>
                  {isOwner && m.id !== currentUserId && (
                    <button onClick={() => handleKick(m)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {isOwner && room.id === 1 ? (
            <p className="text-center text-xs text-stone-400 py-1">{t('灵创大厅是官方聊天室，不可解散', 'SpiritHub Lobby is the official room and cannot be dissolved')}</p>
          ) : (
            <button onClick={handleLeave}
              className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${isOwner ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
              {isOwner ? t('解散聊天室', 'Dissolve Room') : t('离开聊天室', 'Leave Room')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Chat ────────────────────────────────────────────────
export default function Chat() {
  const { user } = useAuth();
  const { refreshUnread } = useSocket();
  const { t, lang } = useLocale();
  const [searchParams] = useSearchParams();
  const initialUser = searchParams.get('user');

  // View & list state
  const [view, setView] = useState<'rooms' | 'room_chat' | 'private'>('rooms');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  // Messages
  const [displayMsgs, setDisplayMsgs] = useState<ChatMsg[]>([]);
  const msgCacheRef = useRef<Map<string, ChatMsg[]>>(new Map());

  // Input
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Scroll & new-msg notification
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // Sidebar: unread + last message
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, LastMsg>>({});

  // Typing indicator
  const [typingMap, setTypingMap] = useState<Record<string, string[]>>({});
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const stopTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Stable refs for callbacks
  const socketRef = useRef(connectSocket());
  const activeRoomIdRef = useRef<number | null>(null);
  const activeConvKeyRef = useRef<string | null>(null);
  const viewRef = useRef(view);
  const selectedRoomRef = useRef(selectedRoom);
  const selectedFriendRef = useRef(selectedFriend);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { selectedRoomRef.current = selectedRoom; }, [selectedRoom]);
  useEffect(() => { selectedFriendRef.current = selectedFriend; }, [selectedFriend]);
  useEffect(() => {
    document.title = t('聊天室 - 灵创平台', 'Chat - SpiritHub');
    return () => { document.title = t('灵创平台', 'SpiritHub'); };
  }, [t]);

  // ── Helpers ──────────────────────────────────────────────
  const convKey = useCallback((type: 'room' | 'private', id: number) => `${type}:${id}`, []);

  const updateLastMsg = useCallback((key: string, msg: ChatMsg) => {
    setLastMessages(prev => ({ ...prev, [key]: { text: msg.content.slice(0, 40), time: msg.created_at } }));
  }, []);

  const addMsgToCache = useCallback((key: string, msg: ChatMsg) => {
    const existing = msgCacheRef.current.get(key) || [];
    if (existing.find(m => m.id === msg.id)) return false;
    msgCacheRef.current.set(key, [...existing, msg]);
    return true;
  }, []);

  // ── Scroll ───────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    const c = messagesContainerRef.current;
    if (!c) return;
    if (smooth) { c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' }); }
    else { c.scrollTop = c.scrollHeight; }
    setNewMsgCount(0);
  }, []);

  const handleScroll = useCallback(() => {
    const c = messagesContainerRef.current;
    if (!c) return;
    isNearBottomRef.current = c.scrollHeight - c.scrollTop - c.clientHeight < 120;
    if (isNearBottomRef.current) setNewMsgCount(0);
  }, []);

  // ── Typing emit ──────────────────────────────────────────
  const emitStopTyping = useCallback(() => {
    if (!isTypingRef.current) return;
    isTypingRef.current = false;
    if (viewRef.current === 'room_chat' && selectedRoomRef.current)
      socketRef.current.emit('stop_typing', { room_id: selectedRoomRef.current.id });
    else if (viewRef.current === 'private' && selectedFriendRef.current)
      socketRef.current.emit('stop_typing', { to_user_id: selectedFriendRef.current.id });
  }, []);

  const emitTypingStart = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      if (viewRef.current === 'room_chat' && selectedRoomRef.current)
        socketRef.current.emit('typing', { room_id: selectedRoomRef.current.id });
      else if (viewRef.current === 'private' && selectedFriendRef.current)
        socketRef.current.emit('typing', { to_user_id: selectedFriendRef.current.id });
    }
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    stopTypingTimerRef.current = setTimeout(emitStopTyping, 2000);
  }, [emitStopTyping]);

  // ── Socket events ────────────────────────────────────────
  useEffect(() => {
    const s = socketRef.current;

    s.on('room_history', (msgs: ChatMsg[]) => {
      if (!activeRoomIdRef.current) return;
      const key = convKey('room', activeRoomIdRef.current);
      const cached = msgCacheRef.current.get(key) || [];
      const merged = sortByTime(dedup([...msgs, ...cached]));
      msgCacheRef.current.set(key, merged);
      setDisplayMsgs(merged);
      setNewMsgCount(0);
      setHistoryLoaded(true);
      if (merged.length) updateLastMsg(key, merged[merged.length - 1]);
      setTimeout(() => scrollToBottom(false), 60);
    });

    s.on('room_message', (msg: ChatMsg) => {
      const key = convKey('room', msg.room_id!);
      if (!addMsgToCache(key, msg)) return;
      updateLastMsg(key, msg);
      if (activeConvKeyRef.current === key) {
        setDisplayMsgs(prev => dedup([...prev, msg]));
        if (isNearBottomRef.current) setTimeout(() => scrollToBottom(true), 30);
        else setNewMsgCount(n => n + 1);
      } else {
        setUnreadCounts(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
      }
    });

    s.on('private_message', (msg: ChatMsg) => {
      const otherId = msg.sender_id === user?.id ? msg.receiver_id! : msg.sender_id!;
      const key = convKey('private', otherId);
      if (!addMsgToCache(key, msg)) return;
      updateLastMsg(key, msg);
      if (activeConvKeyRef.current === key) {
        setDisplayMsgs(prev => dedup([...prev, msg]));
        if (isNearBottomRef.current) setTimeout(() => scrollToBottom(true), 30);
        else setNewMsgCount(n => n + 1);
      } else {
        setUnreadCounts(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
      }
      refreshUnread();
    });

    s.on('user_typing', (data: { user_id: number; username: string; room_id?: number }) => {
      if (data.user_id === user?.id) return;
      const key = data.room_id ? convKey('room', data.room_id) : convKey('private', data.user_id);
      setTypingMap(prev => {
        const names = prev[key] || [];
        if (names.includes(data.username)) return prev;
        return { ...prev, [key]: [...names, data.username] };
      });
      const tKey = `${key}:${data.user_id}`;
      const existing = typingTimeoutsRef.current.get(tKey);
      if (existing) clearTimeout(existing);
      typingTimeoutsRef.current.set(tKey, setTimeout(() => {
        setTypingMap(prev => ({ ...prev, [key]: (prev[key] || []).filter(n => n !== data.username) }));
        typingTimeoutsRef.current.delete(tKey);
      }, 3000));
    });

    s.on('user_stop_typing', (data: { user_id: number; username: string; room_id?: number }) => {
      const key = data.room_id ? convKey('room', data.room_id) : convKey('private', data.user_id);
      setTypingMap(prev => ({ ...prev, [key]: (prev[key] || []).filter(n => n !== data.username) }));
      const tKey = `${key}:${data.user_id}`;
      const ex = typingTimeoutsRef.current.get(tKey);
      if (ex) { clearTimeout(ex); typingTimeoutsRef.current.delete(tKey); }
    });

    s.on('room_kicked', (data: { room_id: number }) => {
      if (data.room_id === activeRoomIdRef.current) {
        setView('rooms'); setSelectedRoom(null);
        activeRoomIdRef.current = null; activeConvKeyRef.current = null;
      }
      loadRooms();
    });
    s.on('room_dissolved', (data: { room_id: number }) => {
      if (data.room_id === activeRoomIdRef.current) {
        setView('rooms'); setSelectedRoom(null);
        activeRoomIdRef.current = null; activeConvKeyRef.current = null;
      }
      loadRooms();
    });

    s.on('connect', () => {
      if (activeRoomIdRef.current) s.emit('join_room', activeRoomIdRef.current);
    });

    return () => {
      s.off('room_history'); s.off('room_message'); s.off('private_message');
      s.off('user_typing'); s.off('user_stop_typing');
      s.off('room_kicked'); s.off('room_dissolved'); s.off('connect');
    };
  }, [user, refreshUnread, convKey, addMsgToCache, updateLastMsg, scrollToBottom]);

  // ── Data load ────────────────────────────────────────────
  const loadRooms = useCallback(async () => {
    try { const res = await roomsApi.list(); setRooms(res.data.rooms || []); } catch {}
  }, []);

  const openPrivateChat = useCallback(async (friend: Friend) => {
    const key = convKey('private', friend.id);
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    emitStopTyping();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    activeConvKeyRef.current = key;
    activeRoomIdRef.current = null;
    setSelectedFriend(friend); setView('private');
    setUnreadCounts(prev => ({ ...prev, [key]: 0 }));
    setNewMsgCount(0);

    const cached = msgCacheRef.current.get(key) || [];
    setDisplayMsgs(cached);
    try {
      const res = await friendsApi.messages(friend.username);
      const msgs = res.data.messages || [];
      const merged = sortByTime(dedup([...msgs, ...cached]));
      msgCacheRef.current.set(key, merged);
      setDisplayMsgs(merged);
      if (merged.length) updateLastMsg(key, merged[merged.length - 1]);
      setTimeout(() => scrollToBottom(false), 60);
    } catch {}
    refreshUnread();
  }, [convKey, emitStopTyping, updateLastMsg, scrollToBottom, refreshUnread]);

  useEffect(() => {
    loadRooms();
    friendsApi.list().then(res => {
      const list = res.data.friends || [];
      setFriends(list);
      if (initialUser) {
        const f = list.find((x: Friend) => x.username === initialUser);
        if (f) openPrivateChat(f);
      }
    }).catch(() => {});
  }, [initialUser, loadRooms, openPrivateChat]);

  // ── Enter room ───────────────────────────────────────────
  const enterRoom = async (room: Room) => {
    if (!room.is_joined) {
      try { await roomsApi.join(room.id); await loadRooms(); } catch { return; }
    }
    if (activeRoomIdRef.current && activeRoomIdRef.current !== room.id)
      socketRef.current.emit('leave_room', activeRoomIdRef.current);

    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    emitStopTyping();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const key = convKey('room', room.id);
    activeRoomIdRef.current = room.id;
    activeConvKeyRef.current = key;
    setUnreadCounts(prev => ({ ...prev, [key]: 0 }));
    setNewMsgCount(0);

    const cached = msgCacheRef.current.get(key) || [];
    setDisplayMsgs(cached);
    setHistoryLoaded(cached.length > 0); // 有缓存则视为已加载
    setSelectedRoom(room); setView('room_chat');

    try {
      const res = await roomsApi.get(room.id);
      setRoomMembers(res.data.members || []);
      setSelectedRoom(res.data.room);
    } catch {}
    socketRef.current.emit('join_room', room.id);
  };

  // ── Send ─────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content) return;
    if (view === 'room_chat' && selectedRoom)
      socketRef.current.emit('room_message', { room_id: selectedRoom.id, content });
    else if (view === 'private' && selectedFriend)
      socketRef.current.emit('private_message', { to_user_id: selectedFriend.id, content });
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    emitStopTyping();
    isNearBottomRef.current = true;
  }, [input, view, selectedRoom, selectedFriend, emitStopTyping]);

  const handleInputChange = useCallback((val: string) => {
    setInput(val);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
    if (val.trim()) { emitTypingStart(); }
    else { if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current); emitStopTyping(); }
  }, [emitTypingStart, emitStopTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  // ── Go back ──────────────────────────────────────────────
  const goBack = useCallback(() => {
    if (activeRoomIdRef.current) {
      socketRef.current.emit('leave_room', activeRoomIdRef.current);
      activeRoomIdRef.current = null;
    }
    activeConvKeyRef.current = null;
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    emitStopTyping();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setView('rooms'); setSelectedRoom(null); setSelectedFriend(null);
    loadRooms();
  }, [emitStopTyping, loadRooms]);

  // ── Computed ─────────────────────────────────────────────
  const currentTypingNames = activeConvKeyRef.current ? (typingMap[activeConvKeyRef.current] || []) : [];

  const msgGroups = (view === 'room_chat' || view === 'private')
    ? groupMessages(displayMsgs, view, user?.id ?? 0)
    : [];

  const groupsWithDates: Array<{ group: MsgGroup; showDate: boolean; dateLabel: string }> = [];
  let lastDate = '';
  for (const group of msgGroups) {
    const dateLabel = getDateLabel(group.msgs[0].created_at, lang);
    groupsWithDates.push({ group, showDate: dateLabel !== lastDate, dateLabel });
    lastDate = dateLabel;
  }

  // ── JSX ──────────────────────────────────────────────────
  const inChat = view === 'room_chat' || view === 'private';

  return (
    <div className="max-w-6xl mx-auto md:px-4 md:py-6" onClick={() => setShowEmojiPicker(false)}>
      <div className="flex md:gap-4 h-[calc(100vh-3.5rem)] md:h-[calc(100vh-7rem)]">

        {/* ── Left Sidebar ── */}
        <div className={`flex-shrink-0 bg-white md:rounded-2xl border-r md:border border-gray-200 flex flex-col overflow-hidden ${inChat ? 'hidden md:flex md:w-60' : 'w-full md:w-60'}`}>
          <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <h2 className="font-semibold text-gray-900 text-sm">{t('消息', 'Messages')}</h2>
            <button onClick={e => { e.stopPropagation(); setShowCreateModal(true); }}
              className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors" title={t('创建聊天室', 'Create Room')}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 pt-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-1.5">{t('聊天室', 'Rooms')}</p>
              {rooms.length === 0
                ? <p className="text-xs text-gray-400 px-1 py-2">{t('暂无聊天室', 'No rooms yet')}</p>
                : rooms.map(room => {
                  const key = convKey('room', room.id);
                  const unread = unreadCounts[key] || 0;
                  const last = lastMessages[key];
                  const isActive = view === 'room_chat' && selectedRoom?.id === room.id;
                  return (
                    <button key={room.id} onClick={() => enterRoom(room)}
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl transition-colors mb-0.5 text-left ${isActive ? 'bg-violet-50' : 'hover:bg-gray-50'}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-violet-100' : 'bg-gray-100'}`}>
                        <Hash className={`w-4 h-4 ${isActive ? 'text-violet-600' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs font-semibold truncate ${isActive ? 'text-violet-700' : 'text-gray-800'}`}>{room.name}</span>
                          {last && <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(last.time, lang)}</span>}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{last ? last.text : `${room.member_count} ${t('人', 'members')}`}</p>
                      </div>
                      {unread > 0 && (
                        <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1 font-bold flex-shrink-0">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                      {!room.is_joined && !unread && (
                        <span className="text-[10px] text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-full flex-shrink-0">{t('加入', 'Join')}</span>
                      )}
                    </button>
                  );
                })}
            </div>
            {friends.length > 0 && (
              <div className="px-3 pt-3 pb-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-1.5">{t('私信', 'DMs')}</p>
                {friends.map(f => {
                  const key = convKey('private', f.id);
                  const unread = unreadCounts[key] || 0;
                  const last = lastMessages[key];
                  const isActive = view === 'private' && selectedFriend?.id === f.id;
                  return (
                    <button key={f.id} onClick={() => openPrivateChat(f)}
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl transition-colors mb-0.5 text-left ${isActive ? 'bg-violet-50' : 'hover:bg-gray-50'}`}>
                      <AvatarComp avatar={f.avatar ?? undefined} username={f.username} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs font-semibold truncate ${isActive ? 'text-violet-700' : 'text-gray-800'}`}>{f.username}</span>
                          {last && <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(last.time, lang)}</span>}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{last ? last.text : t('暂无消息', 'No messages yet')}</p>
                      </div>
                      {unread > 0 && (
                        <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1 font-bold flex-shrink-0">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Chat Area ── */}
        <div className={`flex-1 bg-white md:rounded-2xl md:border border-gray-200 flex flex-col overflow-hidden min-w-0 ${!inChat ? 'hidden md:flex' : 'flex'}`}>

          {/* Rooms discovery */}
          {view === 'rooms' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{t('聊天室', 'Chat Rooms')}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{t('加入感兴趣的聊天室，与大家实时交流', 'Join rooms you care about and chat in real time')}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setShowCreateModal(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors">
                  <Plus className="w-4 h-4" /> {t('创建聊天室', 'Create Room')}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rooms.map(room => (
                  <div key={room.id} onClick={() => enterRoom(room)}
                    className="p-4 border border-gray-200 rounded-xl hover:border-violet-300 hover:shadow-sm cursor-pointer transition-all group">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center flex-shrink-0 transition-colors">
                        <Hash className="w-5 h-5 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 truncate">{room.name}</p>
                          {!room.is_joined && (
                            <span className="text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full flex-shrink-0">{t('加入', 'Join')}</span>
                          )}
                        </div>
                        {room.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{room.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{room.member_count} {t('人', 'members')}</span>
                          <span>{t(COMMUNITIES.find(c => c.value === room.community)?.label || room.community, COMMUNITY_EN_LABELS[room.community] || room.community)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {rooms.length === 0 && (
                  <div className="col-span-2 text-center py-16 text-gray-400">
                    <Hash className="w-14 h-14 mx-auto opacity-20 mb-3" />
                    <p className="font-medium">{t('还没有聊天室', 'No rooms yet')}</p>
                    <p className="text-sm mt-1">{t('创建第一个聊天室吧！', 'Create your first room!')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active chat */}
          {(view === 'room_chat' || view === 'private') && (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
                <button onClick={goBack}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {view === 'room_chat' && selectedRoom ? (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Hash className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{selectedRoom.name}</h3>
                      <p className="text-xs text-gray-400">{roomMembers.length} {t('位成员', 'members')}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setShowSettingsModal(true); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700">
                      <Settings className="w-4 h-4" />
                    </button>
                  </>
                ) : selectedFriend ? (
                  <>
                    <AvatarComp avatar={selectedFriend.avatar ?? undefined} username={selectedFriend.username} size="sm" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm">{selectedFriend.username}</h3>
                      <p className="text-xs text-gray-400">{t('好友私信', 'Direct Message')}</p>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Messages wrapper (relative for float button) */}
              <div className="flex-1 relative overflow-hidden">
                <div
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  className="absolute inset-0 overflow-y-auto px-4 py-4 bg-gray-50"
                >
                  {displayMsgs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <MessageSquare className="w-12 h-12 opacity-20 mb-3" />
                      <p className="font-medium text-sm">{view === 'room_chat' && !historyLoaded ? t('正在加载消息...', 'Loading messages...') : t('暂无消息，快来发第一条吧 👋', 'No messages yet, send the first one 👋')}</p>
                    </div>
                  ) : (
                    groupsWithDates.map(({ group, showDate, dateLabel }, gi) => (
                      <div key={`g${gi}`}>
                        {showDate && (
                          <div className="flex items-center gap-3 py-3">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-[11px] text-gray-400 px-2">{dateLabel}</span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                        )}
                        <div className={`mt-1.5 ${group.isMine ? 'flex flex-col items-end' : ''}`}>
                          {view === 'room_chat' && (
                            <span className="text-xs text-gray-500 px-1 mb-1 block">
                              {group.isMine ? (user?.username ?? group.senderName) : group.senderName}
                            </span>
                          )}
                          <div className={`flex gap-2.5 ${group.isMine ? 'flex-row-reverse' : ''}`}>
                          <div className="w-8 flex-shrink-0 flex items-start pt-1">
                            <AvatarComp
                              avatar={group.isMine ? (user?.avatar ?? undefined) : (group.senderAvatar ?? undefined)}
                              username={group.isMine ? (user?.username ?? group.senderName) : group.senderName}
                              size="sm" />
                          </div>
                          <div className={`flex flex-col gap-0.5 max-w-[62%] ${group.isMine ? 'items-end' : 'items-start'}`}>
                            {group.msgs.map((msg, mi) => {
                              const n = group.msgs.length;
                              let extra = '';
                              if (group.isMine) {
                                extra = n === 1 ? 'rounded-br-[4px]'
                                  : mi === 0 ? 'rounded-br-[4px] rounded-tr-xl'
                                  : mi === n - 1 ? 'rounded-br-[4px] rounded-tr-[4px]'
                                  : 'rounded-r-[4px]';
                              } else {
                                extra = n === 1 ? 'rounded-bl-[4px]'
                                  : mi === 0 ? 'rounded-bl-[4px] rounded-tl-xl'
                                  : mi === n - 1 ? 'rounded-bl-[4px] rounded-tl-[4px]'
                                  : 'rounded-l-[4px]';
                              }
                              return (
                                <div key={msg.id}
                                  className={`px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap rounded-2xl ${extra} ${
                                    group.isMine
                                      ? 'bg-violet-600 text-white'
                                      : 'bg-white text-gray-800 shadow-sm border border-gray-100'
                                  }`}>
                                  {msg.content}
                                </div>
                              );
                            })}
                            <span className="text-[10px] text-gray-400 px-1 mt-0.5">
                              {formatTime(group.msgs[group.msgs.length - 1].created_at, lang)}
                            </span>
                          </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {newMsgCount > 0 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                    <button onClick={() => scrollToBottom(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-full shadow-lg hover:bg-violet-700 transition-colors">
                      <ChevronDown className="w-3.5 h-3.5" />
                      {newMsgCount} {t('条新消息', 'new messages')}
                    </button>
                  </div>
                )}
              </div>

              <TypingDots names={currentTypingNames} />

              {/* Input bar */}
              <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-end gap-2 relative">
                  <div className="relative flex-shrink-0 self-end mb-0.5">
                    <button
                      onMouseDown={e => e.preventDefault()}
                      onClick={e => { e.stopPropagation(); setShowEmojiPicker(p => !p); }}
                      className="p-2 rounded-xl text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">
                      <Smile className="w-5 h-5" />
                    </button>
                    {showEmojiPicker && (
                      <EmojiPicker onSelect={e => {
                        setInput(prev => prev + e);
                        setShowEmojiPicker(false);
                        textareaRef.current?.focus();
                      }} />
                    )}
                  </div>
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={e => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      view === 'room_chat'
                        ? `${t('在', 'Message in')} ${selectedRoom?.name || ''}...`
                        : `${t('发消息给', 'Message')} ${selectedFriend?.username || ''}...`
                    }
                    className="flex-1 px-4 py-2.5 bg-gray-100 border border-transparent rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-violet-300 transition-all resize-none overflow-hidden"
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                    maxLength={500}
                  />
                  <button onClick={handleSend} disabled={!input.trim()}
                    className="px-4 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors flex items-center gap-1.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 self-end">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 pl-1 select-none">{t('Enter 发送 · Shift+Enter 换行', 'Enter to send · Shift+Enter for new line')}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateRoomModal onClose={() => setShowCreateModal(false)} onCreate={loadRooms} />
      )}
      {showSettingsModal && selectedRoom && (
        <RoomSettingsModal
          room={selectedRoom}
          members={roomMembers}
          currentUserId={user!.id}
          onClose={() => setShowSettingsModal(false)}
          onUpdated={async () => {
            const res = await roomsApi.get(selectedRoom.id);
            setSelectedRoom(res.data.room);
            setRoomMembers(res.data.members || []);
            loadRooms();
          }}
          onLeft={() => {
            setView('rooms'); setSelectedRoom(null);
            activeRoomIdRef.current = null; activeConvKeyRef.current = null;
            loadRooms();
          }}
        />
      )}
    </div>
  );
}
