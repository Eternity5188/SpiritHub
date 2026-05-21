import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { useLocale } from '../contexts/LocaleContext';

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  is_read: number;
  created_at: string;
  related_type: string | null;
  related_id: number | null;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { t, lang } = useLocale();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications ?? []);
      setUnread(res.data.unread_count ?? 0);
    } catch {}
  }, [user]);

  useEffect(() => {
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, [fetch]);

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnread(0);
    } catch {}
  };

  const markRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  if (!user) return null;

  const typeIcon: Record<string, string> = {
    like: '❤️',
    comment: '💬',
    friend: '👥',
    system: '🔔',
    points: '✨',
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return lang === 'en' ? 'just now' : '刚刚';
    if (mins < 60) return lang === 'en' ? `${mins} min ago` : `${mins}分钟前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return lang === 'en' ? `${hrs} hr ago` : `${hrs}小时前`;
    return lang === 'en' ? `${Math.floor(hrs / 24)} days ago` : `${Math.floor(hrs / 24)}天前`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetch(); }}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
        title={t('通知', 'Notifications')}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-semibold text-slate-800 text-sm">{t('通知', 'Notifications')}</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-violet-600 hover:text-violet-800 font-medium">{t('全部已读', 'Mark all read')}</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">{t('暂无通知', 'No notifications')}</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.is_read) markRead(n.id); }}
                  className={`flex gap-3 px-4 py-3 border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${
                    n.is_read ? 'bg-white' : 'bg-violet-50/60 hover:bg-violet-50'
                  }`}
                >
                  <span className="text-lg mt-0.5 shrink-0">{typeIcon[n.type] ?? '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{n.title}</span>
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                    </div>
                    {n.body && <p className="text-xs text-slate-500 mt-0.5 truncate">{n.body}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
