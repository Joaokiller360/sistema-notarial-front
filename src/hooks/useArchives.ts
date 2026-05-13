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
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfUploadProgress, setPdfUploadProgress] = useState(0);

  const fetchArchives = useCallback(async (filters: ArchiveFilters = {}) => {
    setIsLoading(true);
    setIsError(false);
    setArchives(null);
    try {
      const data = await archivesService.getAll(filters);
      setArchives(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; statusCode?: number }; status?: number } };
      const status = axiosErr?.response?.status;
      const msg = axiosErr?.response?.data?.message;
      console.error("[fetchArchives] error", status, msg, err);
      setIsError(true);
      toast.error(
        msg
          ? `Error ${status ?? ""}: ${Array.isArray(msg) ? msg.join(" · ") : msg}`
          : "Error al cargar los archivos"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetches ALL pages (batch: 50/page, max 500) without sending `type` to backend.
  // Needed because the backend DTO forbids `type` as a query param.
  const fetchAllArchives = useCallback(
    async (filters: Omit<ArchiveFilters, "type"> = {}) => {
      setIsLoading(true);
      setIsError(false);
      setArchives(null);
      try {
        const BATCH = 50;
        const first = await archivesService.getAll({ ...filters, page: 1, limit: BATCH });
        let all: Archive[] = [...first.data];

        if (first.totalPages > 1) {
          const remaining = Array.from(
            { length: Math.min(first.totalPages - 1, 9) },
            (_, i) => i + 2
          );
          const results = await Promise.all(
            remaining.map((p) =>
              archivesService.getAll({ ...filters, page: p, limit: BATCH })
            )
          );
          for (const r of results) all = all.concat(r.data);
        }

        setArchives({
          data: all,
          total: all.length,
          page: 1,
          limit: all.length || BATCH,
          totalPages: 1,
        });
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { message?: string }; status?: number };
        };
        const status = axiosErr?.response?.status;
        const msg = axiosErr?.response?.data?.message;
        console.error("[fetchAllArchives] error", status, msg);
        setIsError(true);
        toast.error(
          msg
            ? `Error ${status ?? ""}: ${Array.isArray(msg) ? msg.join(" · ") : msg}`
            : "Error al cargar los archivos"
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

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
    setPdfUploadProgress(0);
    try {
      const { pdf, grantors, beneficiaries, ...rest } = payload;
      const created = await archivesService.create({
        ...rest,
        grantors: grantors ?? [],
        beneficiaries: beneficiaries ?? [],
      });

      if (pdf) {
        try {
          await archivesService.uploadPdf(created.id, pdf, setPdfUploadProgress);
        } catch (uploadError: unknown) {
          const raw = (uploadError as { response?: { data?: unknown } })?.response?.data;
          const msg = extractErrorMessage(raw) || "El PDF no se pudo subir a S3.";
          toast.warning(`Archivo creado, pero ${msg}`);
          return created;
        } finally {
          setPdfUploadProgress(0);
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
    setPdfUploadProgress(0);
    try {
      const { pdf, grantors, beneficiaries, ...rest } = payload;
      const updated = await archivesService.update(id, {
        ...rest,
        grantors: grantors ?? [],
        beneficiaries: beneficiaries ?? [],
      });

      if (pdf) {
        try {
          await archivesService.uploadPdf(id, pdf, setPdfUploadProgress);
        } catch (uploadError: unknown) {
          const raw = (uploadError as { response?: { data?: unknown } })?.response?.data;
          const msg = extractErrorMessage(raw) || "El PDF no se pudo subir a S3.";
          toast.warning(`Archivo actualizado, pero ${msg}`);
          return updated;
        } finally {
          setPdfUploadProgress(0);
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
      toast.success("Archivo eliminado exitosamente");
      setArchives((prev) =>
        prev ? { ...prev, data: prev.data.filter((a) => a.id !== id) } : prev
      );
    } catch (error: unknown) {
      const raw = (error as { response?: { data?: unknown } })?.response?.data;
      const msg = extractErrorMessage(raw) || "Error al eliminar el archivo";
      toast.error(msg);
      throw error;
    }
  };

  const clearArchives = useCallback(() => { setArchives(null); setIsError(false); }, []);

  return {
    archives,
    archive,
    isLoading,
    isError,
    isSubmitting,
    pdfUploadProgress,
    fetchArchives,
    fetchAllArchives,
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
