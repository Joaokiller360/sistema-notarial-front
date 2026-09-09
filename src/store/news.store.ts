"use client";

import { create } from "zustand";
import type { News } from "@/types";

/**
 * Store compartido de la lista de noticias.
 *
 * Antes `useNews` guardaba la lista en un `useState` local por componente, así
 * que un alta/baja solo se veía en la pestaña que la hizo. Con el store la
 * capa realtime (`useRealtimeConnection`) puede insertar/quitar noticias y
 * todos los consumidores se actualizan a la vez.
 */
interface NewsState {
  items: News[];
  total: number;
  loaded: boolean;
  setAll: (items: News[], total: number) => void;
  prepend: (n: News) => void;
  remove: (id: string) => void;
}

export const useNewsStore = create<NewsState>()((set) => ({
  items: [],
  total: 0,
  loaded: false,

  setAll: (items, total) => set({ items, total, loaded: true }),

  prepend: (n) =>
    set((s) =>
      s.items.some((x) => x.id === n.id)
        ? s
        : { items: [n, ...s.items], total: s.total + 1 },
    ),

  remove: (id) =>
    set((s) =>
      s.items.some((x) => x.id === id)
        ? {
            items: s.items.filter((x) => x.id !== id),
            total: Math.max(0, s.total - 1),
          }
        : s,
    ),
}));
