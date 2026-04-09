import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  setAuth: (accessToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  accessToken: null,
  setAuth: (token: string) => set({ isAuthenticated: true, accessToken: token }),
  clearAuth: () => set({ isAuthenticated: false, accessToken: null }),
}));
