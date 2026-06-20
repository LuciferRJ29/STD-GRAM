'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/apiClient';
import { useAuthStore, type CurrentUser } from '@/store/authStore';

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, setUser, setLoading } = useAuthStore();
  const router = useRouter();

  async function refresh() {
    const { ok, data } = await api.get<{ user: CurrentUser }>('/api/users/me');
    setUser(ok ? data.user : null);
    setLoading(false);
  }

  async function logout() {
    await api.post('/api/auth/logout');
    setUser(null);
    router.push('/login');
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
