"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { newsService, usersService } from "@/services";
import { useNewsStore } from "@/store/news.store";
import type { News, PaginatedNews, CreateNewsRequest, NewsFilters } from "@/types";

export function useNews() {
  // Lista en store compartido → altas/bajas (locales o por WebSocket) se ven
  // en todos los consumidores a la vez.
  const items = useNewsStore((s) => s.items);
  const total = useNewsStore((s) => s.total);
  const loaded = useNewsStore((s) => s.loaded);
  const [meta, setMeta] = useState({ page: 1, limit: 50, totalPages: 0 });

  const news: PaginatedNews | null = loaded
    ? { data: items, total, page: meta.page, limit: meta.limit, totalPages: meta.totalPages }
    : null;

  const [currentNews, setCurrentNews] = useState<News | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOne, setIsLoadingOne] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNews = useCallback(async (filters: NewsFilters = {}) => {
    setIsLoading(true);
    try {
      const data = await newsService.getAll(filters);
      useNewsStore.getState().setAll(data.data, data.total);
      setMeta({ page: data.page, limit: data.limit, totalPages: data.totalPages });
    } catch {
      useNewsStore.getState().setAll([], 0);
      setMeta({ page: 1, limit: 50, totalPages: 0 });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchNewsById = useCallback(async (id: string): Promise<News | null> => {
    setIsLoadingOne(true);
    try {
      const data = await newsService.getById(id);
      setCurrentNews(data);
      return data;
    } catch {
      return null;
    } finally {
      setIsLoadingOne(false);
    }
  }, []);

  const createNews = async (payload: CreateNewsRequest): Promise<News | null> => {
    setIsSubmitting(true);
    try {
      const data = await newsService.create(payload);
      if (data?.id) useNewsStore.getState().prepend(data);
      toast.success("Noticia publicada exitosamente");

      if (data?.id) {
        (async () => {
          try {
            // Paginate users with safe page size
            const allEmails: string[] = [];
            let page = 1;
            const limit = 50;

            while (true) {
              const res = await usersService.getAll({ page, limit });
              const emails = res.data.map((u) => u.email).filter(Boolean);
              allEmails.push(...emails);
              if (res.data.length < limit) break;
              page++;
            }

            if (allEmails.length === 0) return;

            await fetch("/api/emails/news", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                emails: allEmails,
                news: { id: data.id, title: data.title, description: data.description },
              }),
            });
          } catch {
            // background email dispatch — errors are non-fatal
          }
        })();
      }

      return data;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: unknown } } })
        ?.response?.data?.message;
      const text =
        Array.isArray(msg)
          ? msg.join(" · ")
          : typeof msg === "string"
          ? msg
          : null;
      toast.error(text || "Error al crear la noticia");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteNews = async (id: string): Promise<boolean> => {
    try {
      await newsService.delete(id);
      useNewsStore.getState().remove(id);
      toast.success("Noticia eliminada");
      return true;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: unknown } } })
        ?.response?.data?.message;
      const text = typeof msg === "string" ? msg : "Error al eliminar la noticia";
      toast.error(text);
      return false;
    }
  };

  return {
    news,
    currentNews,
    isLoading,
    isLoadingOne,
    isSubmitting,
    fetchNews,
    fetchNewsById,
    createNews,
    deleteNews,
  };
}
