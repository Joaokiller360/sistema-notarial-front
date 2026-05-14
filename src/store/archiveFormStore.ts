import { create } from "zustand";

interface ArchiveFormStore {
  uploadedPdfFile: File | null;
  setUploadedPdfFile: (file: File | null) => void;

  photoFiles: File[];
  setPhotoFiles: (files: File[]) => void;
  reorderPhotos: (from: number, to: number) => void;
  removePhoto: (index: number) => void;

  resetArchiveForm: () => void;
}

export const useArchiveFormStore = create<ArchiveFormStore>((set) => ({
  uploadedPdfFile: null,
  setUploadedPdfFile: (file) => set({ uploadedPdfFile: file }),

  photoFiles: [],
  setPhotoFiles: (files) => set({ photoFiles: files }),
  reorderPhotos: (from, to) =>
    set((state) => {
      const photos = [...state.photoFiles];
      const [moved] = photos.splice(from, 1);
      photos.splice(to, 0, moved);
      return { photoFiles: photos };
    }),
  removePhoto: (index) =>
    set((state) => ({
      photoFiles: state.photoFiles.filter((_, i) => i !== index),
    })),

  resetArchiveForm: () => set({ uploadedPdfFile: null, photoFiles: [] }),
}));
