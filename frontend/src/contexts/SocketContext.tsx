import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';
import { friendsApi } from '../lib/api';
import type { Socket } from 'socket.io-client';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  unreadMessages: number;
  pendingRequests: number;
  refreshUnread: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  unreadMessages: 0,
  pendingRequests: 0,
  refreshUnread: () => {}
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await friendsApi.unread();
      setUnreadMessages(res.data.unread_messages);
      setPendingRequests(res.data.pending_requests);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setConnected(false);
      setUnreadMessages(0);
      setPendingRequests(0);
      return;
    }

    const s = connectSocket();

    s.on('connect', () => { setConnected(true); refreshUnread(); });
    s.on('disconnect', () => setConnected(false));

    // 收到私信时增加未读计数
    s.on('private_message', (msg: any) => {
      if (msg.sender_id !== user.id) {
        setUnreadMessages(prev => prev + 1);
      }
    });

    refreshUnread();

    // 每 30s 轮询一次未读数（以防 WebSocket 丢失事件）
    const timer = setInterval(refreshUnread, 30000);

    return () => {
      s.off('connect');
      s.off('disconnect');
      s.off('private_message');
      clearInterval(timer);
    };
  }, [user, refreshUnread]);

  return (
    <SocketContext.Provider value={{ socket: user ? getSocket() : null, connected, unreadMessages, pendingRequests, refreshUnread }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
