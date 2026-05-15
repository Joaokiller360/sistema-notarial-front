"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, AuthTokens } from "@/types";
import { tokenUtils } from "@/utils/token";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setUser: (user: User) => void;
  setAuth: (user: User, tokens: AuthTokens) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (permissionName: string) => boolean;
  hasRole: (roles: string | string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setUser: (user) => set({ user }),

      setAuth: (user, tokens) => {
        tokenUtils.setTokens(tokens.accessToken, tokens.refreshToken);
        set({ user, isAuthenticated: true });
      },

      clearAuth: () => {
        tokenUtils.clearTokens();
        set({ user: null, isAuthenticated: false });
      },

      setLoading: (isLoading) => set({ isLoading }),

      hasPermission: (permissionName) => {
        const { user } = get();
        if (!user) return false;
        if ((user.roles ?? []).includes("SUPER_ADMIN")) return true;
        return (user.permissions ?? []).includes(permissionName);
      },

      hasRole: (roles) => {
        const { user } = get();
        if (!user) return false;
        const roleArray = Array.isArray(roles) ? roles : [roles];
        return (user.roles ?? []).some((r) => roleArray.includes(r));
      },
    }),
    {
      name: "notaria-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
