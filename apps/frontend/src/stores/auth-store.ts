import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { api, authApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  rememberMe: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// Custom storage that switches between localStorage and sessionStorage based on rememberMe
const createDynamicStorage = (): StateStorage => ({
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    // Try localStorage first, then sessionStorage
    return localStorage.getItem(name) || sessionStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      const parsed = JSON.parse(value);
      const rememberMe = parsed?.state?.rememberMe ?? true;
      if (rememberMe) {
        localStorage.setItem(name, value);
        sessionStorage.removeItem(name);
      } else {
        sessionStorage.setItem(name, value);
        localStorage.removeItem(name);
      }
    } catch {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      rememberMe: true,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string, rememberMe: boolean = true) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ email, password, rememberMe });
          api.setToken(response.accessToken);
          set({
            user: { id: response.user.id, email: response.user.email, name: response.user.fullName },
            token: response.accessToken,
            rememberMe,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register({ email, password, name });
          api.setToken(response.accessToken);
          set({
            user: { id: response.user.id, email: response.user.email, name: response.user.fullName },
            token: response.accessToken,
            rememberMe: true,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        api.setToken(null);
        set({
          user: null,
          token: null,
          rememberMe: true,
          isAuthenticated: false,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => createDynamicStorage()),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.setToken(state.token);
        }
      },
    }
  )
);
