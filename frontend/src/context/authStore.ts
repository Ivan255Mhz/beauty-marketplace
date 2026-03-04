import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse, UserRole } from '../types';

interface AuthState {
  token: string | null;
  userId: string | null;
  name: string;
  email: string;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (data: AuthResponse) => void;
  logout: () => void;
  updateName: (name: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      name: '',
      email: '',
      role: null,
      isAuthenticated: false,

      login: (data) => {
        localStorage.setItem('token', data.token);
        set({
          token: data.token,
          userId: data.userId,
          name: data.name,
          email: data.email,
          role: data.role,
          isAuthenticated: true,
        });
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, userId: null, name: '', email: '', role: null, isAuthenticated: false });
      },

      updateName: (name) => set({ name }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        userId: state.userId,
        name: state.name,
        email: state.email,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
