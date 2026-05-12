"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { newsService } from "@/services";
import type { News, PaginatedNews, CreateNewsRequest, NewsFilters } from "@/types";

export function useNews() {
  const [news, setNews] = useState<PaginatedNews | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

  const createNews = async (payload: CreateNewsRequest): Promise<News | null> => {
    setIsSubmitting(true);
    try {
      const data = await newsService.create(payload);
      toast.success("Noticia publicada exitosamente");
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

  return { news, isLoading, isSubmitting, fetchNews, createNews };
}
