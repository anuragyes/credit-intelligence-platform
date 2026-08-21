import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: ({ accessToken, user }) => set({ accessToken, user }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    { name: 'credit-intel-auth' },
  ),
);
