import { apiClient, apiFormClient } from "@/api/axios.client";
import type {
  News,
  CreateNewsRequest,
  PaginatedNews,
  NewsFilters,
  BackendApiResponse,
} from "@/types";

export const newsService = {
  getAll: async (filters: NewsFilters = {}): Promise<PaginatedNews> => {
    const response = await apiClient.get("/news", { params: filters });
    const body = response.data;

    if (body?.data && Array.isArray(body.data?.data)) {
      return body.data as PaginatedNews;
    }

    if (Array.isArray(body?.data)) {
      return {
        data: body.data,
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

    return body?.data ?? body;
  },

  getById: async (id: string): Promise<News> => {
    const { data } = await apiClient.get<BackendApiResponse<News>>(`/news/${id}`);
    return (data as { data?: News }).data ?? (data as unknown as News);
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
      return data.data;
    }

    const { data } = await apiClient.post<BackendApiResponse<News>>("/news", {
      title: payload.title,
      description: payload.description,
    });
    return data.data;
  },
};
