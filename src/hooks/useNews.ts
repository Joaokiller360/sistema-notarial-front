"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { newsService, usersService } from "@/services";
import type { News, PaginatedNews, CreateNewsRequest, NewsFilters } from "@/types";

export function useNews() {
  const [news, setNews] = useState<PaginatedNews | null>(null);
  const [currentNews, setCurrentNews] = useState<News | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOne, setIsLoadingOne] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNews = useCallback(async (filters: NewsFilters = {}) => {
    setIsLoading(true);
    try {
      const data = await newsService.getAll(filters);
      setNews(data);
    } catch {
      setNews({ data: [], total: 0, page: 1, limit: 50, totalPages: 0 });
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

            const result = await fetch("/api/emails/news", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                emails: allEmails,
                news: { id: data.id, title: data.title, description: data.description },
              }),
            }).then((r) => r.json());

            console.log("[email/news]", result);
          } catch (e) {
            console.error("[email/news] error:", e);
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
      setNews((prev) =>
        prev ? { ...prev, data: prev.data.filter((n) => n.id !== id), total: prev.total - 1 } : prev
      );
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
