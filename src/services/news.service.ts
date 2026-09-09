import { apiClient, apiFormClient } from "@/api/axios.client";
import { stripHtml } from "@/lib/html";
import type {
  News,
  CreateNewsRequest,
  PaginatedNews,
  NewsFilters,
  BackendApiResponse,
} from "@/types";

function fixImageUrl(url?: string): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname === "localhost") {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      const origin = new URL(apiBase).origin;
      return origin + u.pathname;
    }
  } catch { /* ignore malformed URLs */ }
  return url;
}

function normalizeNews(n: News): News {
  // El título es texto plano por contrato; algunos registros llegan con HTML
  // del editor (`<p><strong>…</strong></p>`). Se limpia aquí, en el único
  // punto de entrada, para que lista/detalle/dashboard/store lo reciban limpio.
  // `description` se mantiene como HTML (se renderiza con `sanitizeRichHtml`).
  return {
    ...n,
    title: stripHtml(n.title),
    imageUrl: fixImageUrl(n.imageUrl),
  };
}

export const newsService = {
  getAll: async (filters: NewsFilters = {}): Promise<PaginatedNews> => {
    const response = await apiClient.get("/news", { params: filters });
    const body = response.data;

    if (body?.data && Array.isArray(body.data?.data)) {
      const p = body.data as PaginatedNews;
      return { ...p, data: p.data.map(normalizeNews) };
    }

    if (Array.isArray(body?.data)) {
      return {
        data: (body.data as News[]).map(normalizeNews),
        total: body.total ?? body.data.length,
        page: body.page ?? filters.page ?? 1,
        limit: body.limit ?? filters.limit ?? 10,
        totalPages:
          body.totalPages ??
          Math.ceil(
            (body.total ?? body.data.length) /
              (body.limit ?? filters.limit ?? 10)
          ),
      };
    }

    // Fallback: forma inesperada. Igual normalizamos lo que se pueda.
    const fallback = (body?.data ?? body) as Partial<PaginatedNews> | undefined;
    if (fallback && Array.isArray(fallback.data)) {
      return { ...(fallback as PaginatedNews), data: fallback.data.map(normalizeNews) };
    }
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  },

  getById: async (id: string): Promise<News> => {
    const { data } = await apiClient.get<BackendApiResponse<News>>(`/news/${id}`);
    const news = (data as { data?: News }).data ?? (data as unknown as News);
    return normalizeNews(news);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/news/${id}`);
  },

  create: async (payload: CreateNewsRequest): Promise<News> => {
    if (payload.image) {
      const form = new FormData();
      form.append("title", payload.title);
      form.append("description", payload.description);
      form.append("image", payload.image);
      const { data } = await apiFormClient.post<BackendApiResponse<News>>(
        "/news",
        form
      );
      return normalizeNews(data.data);
    }

    const { data } = await apiClient.post<BackendApiResponse<News>>("/news", {
      title: payload.title,
      description: payload.description,
    });
    return normalizeNews(data.data);
  },
};
