import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  idUser: number;
  name: string;
  email: string;
  emailVerified: boolean;
  avatarUrl?: string;
  phone?: string;
  createdAt: Date;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isAuthVerified: boolean;
  
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setAuthVerified: (verified: boolean) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isAuthVerified: false,

      setAuth: (user, accessToken) =>
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isAuthVerified: true,
        }),

      setAccessToken: (accessToken) =>
        set({
          accessToken,
        }),

      setUser: (user) =>
        set({
          user,
        }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isAuthVerified: true,
        }),

      setAuthVerified: (verified) =>
        set({
          isAuthVerified: verified,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        // Note: isAuthVerified is NOT persisted — always starts as false on reload
      }),
    }
  )
);
