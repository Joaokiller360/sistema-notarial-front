"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UiState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  isGeneratingPdf: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
  setIsGeneratingPdf: (val: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      isGeneratingPdf: false,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      toggleMobileSidebar: () =>
        set((state) => ({ sidebarMobileOpen: !state.sidebarMobileOpen })),

      closeMobileSidebar: () => set({ sidebarMobileOpen: false }),

      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),

      setIsGeneratingPdf: (val) => set({ isGeneratingPdf: val }),
    }),
    {
      name: "notaria-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);
