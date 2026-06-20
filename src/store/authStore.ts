import { create } from 'zustand';

export interface CurrentUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarFileId?: string;
  isPremium: boolean;
  isVerified: boolean;
  isAdmin: boolean;
}

interface AuthState {
  user: CurrentUser | null;
  isLoading: boolean;
  setUser: (user: CurrentUser | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
