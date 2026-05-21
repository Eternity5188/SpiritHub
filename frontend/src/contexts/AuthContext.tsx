import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getStoredUser, saveAuth, clearAuth } from '../lib/auth';
import { authApi } from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      // 静默刷新用户信息
      authApi.me().then(res => {
        setUser(res.data.user);
        saveAuth(localStorage.getItem('lj_token')!, res.data.user);
      }).catch(() => {
        clearAuth();
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await authApi.login({ username, password });
    saveAuth(res.data.token, res.data.user);
    setUser(res.data.user);
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  const refreshUser = async () => {
    const res = await authApi.me();
    setUser(res.data.user);
    saveAuth(localStorage.getItem('lj_token')!, res.data.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
