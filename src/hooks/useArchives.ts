"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { archivesService } from "@/services";
import type {
  Archive,
  ArchiveFilters,
  ArchiveType,
  PaginatedArchives,
  CreateArchiveRequest,
  UpdateArchiveRequest,
} from "@/types";

export interface ArchiveFormPayload extends CreateArchiveRequest {
  pdf?: File | null;
}

export interface UpdateArchiveFormPayload extends UpdateArchiveRequest {
  pdf?: File | null;
}

const TYPE_PREFIXES: Record<ArchiveType, string> = {
  A: "ARQ",
  C: "CERT",
  D: "DIL",
  P: "PROT",
  O: "OTR",
};

function generateCode(type?: ArchiveType): string {
  const prefix = type ? TYPE_PREFIXES[type] : "NOT";
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, "0");
  return `${prefix}-${year}-${random}`;
}

export function useArchives() {
  const [archives, setArchives] = useState<PaginatedArchives | null>(null);
  const [archive, setArchive] = useState<Archive | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchArchives = useCallback(async (filters: ArchiveFilters = {}) => {
    setIsLoading(true);
    setArchives(null);
    try {
      const data = await archivesService.getAll(filters);
      setArchives(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; statusCode?: number }; status?: number } };
      const status = axiosErr?.response?.status;
      const msg = axiosErr?.response?.data?.message;
      console.error("[fetchArchives] error", status, msg, err);
      toast.error(
        msg
          ? `Error ${status ?? ""}: ${Array.isArray(msg) ? msg.join(" · ") : msg}`
          : "Error al cargar los archivos"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchArchive = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const data = await archivesService.getById(id);
      setArchive(data);
      return data;
    } catch {
      toast.error("Archivo no encontrado");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createArchive = async (payload: ArchiveFormPayload) => {
    setIsSubmitting(true);
    try {
      const { pdf, ...rest } = payload;
      const created = await archivesService.create(rest);

      if (pdf) {
        try {
          await archivesService.uploadPdf(created.id, pdf);
        } catch {
          toast.warning("Archivo creado, pero el PDF no se pudo adjuntar.");
          return created;
        }
      }

      toast.success("Archivo creado exitosamente");
      return created;
    } catch (error: unknown) {
      const raw = (error as { response?: { data?: unknown } })?.response?.data;
      const message = extractErrorMessage(raw) || "Error al crear el archivo";
      toast.error(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateArchive = async (
    id: string,
    payload: UpdateArchiveFormPayload
  ) => {
    setIsSubmitting(true);
    try {
      const { pdf, ...rest } = payload;
      const updated = await archivesService.update(id, rest);

      if (pdf) {
        try {
          await archivesService.uploadPdf(id, pdf);
        } catch {
          toast.warning("Archivo actualizado, pero el PDF no se pudo subir.");
          return updated;
        }
      }

      toast.success("Archivo actualizado exitosamente");
      return updated;
    } catch (error: unknown) {
      const raw = (error as { response?: { data?: unknown } })?.response?.data;
      const message = extractErrorMessage(raw) || "Error al actualizar el archivo";
      toast.error(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteArchive = async (id: string) => {
    try {
      await archivesService.delete(id);
      toast.success("Archivo eliminado");
      setArchives((prev) =>
        prev ? { ...prev, data: prev.data.filter((a) => a.id !== id) } : prev
      );
    } catch {
      toast.error("Error al eliminar el archivo");
    }
  };

  const clearArchives = useCallback(() => setArchives(null), []);

  return {
    archives,
    archive,
    isLoading,
    isSubmitting,
    fetchArchives,
    fetchArchive,
    createArchive,
    updateArchive,
    deleteArchive,
    generateCode,
    clearArchives,
  };
}

function extractErrorMessage(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  const r = raw as Record<string, unknown>;
  if (typeof r.message === "string") return r.message;
  if (Array.isArray(r.message)) return (r.message as string[]).join(" · ");
  return "";
}
