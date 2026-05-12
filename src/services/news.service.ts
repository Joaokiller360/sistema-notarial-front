import { apiClient } from "@/api/axios.client";
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

  create: async (payload: CreateNewsRequest): Promise<News> => {
    const { data } = await apiClient.post<BackendApiResponse<News>>(
      "/news",
      payload
    );
    return data.data;
  },
};
