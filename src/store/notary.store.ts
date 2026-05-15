"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { NotaryFormValues } from "@/types";

interface NotaryStore {
  notaryData: NotaryFormValues | null;
  notaryId: number | null;
  setNotaryData: (data: NotaryFormValues) => void;
  setNotaryId: (id: number) => void;
  clearNotaryData: () => void;
}

export const useNotaryStore = create<NotaryStore>()(
  persist(
    (set) => ({
      notaryData: null,
      notaryId: null,
      setNotaryData: (data) => set({ notaryData: data }),
      setNotaryId: (id) => set({ notaryId: id }),
      clearNotaryData: () => set({ notaryData: null, notaryId: null }),
    }),
    {
      name: "notaria-notary",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
