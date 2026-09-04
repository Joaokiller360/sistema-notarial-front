import { create } from "zustand";

/**
 * Códigos de archivos que se están creando en segundo plano (la subida del PDF
 * aún no termina). Mientras un código esté aquí, la lista `/archives` deshabilita
 * el botón "Ver PDF" de esa fila.
 *
 * No se persiste: si se recarga la página, la subida en curso también se aborta.
 */
interface CreatingArchivesStore {
  codes: string[];
  add: (code: string) => void;
  remove: (code: string) => void;
}

export const useCreatingArchivesStore = create<CreatingArchivesStore>((set) => ({
  codes: [],
  add: (code) =>
    set((s) => (s.codes.includes(code) ? s : { codes: [...s.codes, code] })),
  remove: (code) => set((s) => ({ codes: s.codes.filter((c) => c !== code) })),
}));
