import { apiClient } from "@/api/axios.client";
import type { Log, LogFilters, PaginatedLogs, BackendApiResponse } from "@/types";

export const logsService = {
  getAll: async (filters: LogFilters = {}): Promise<PaginatedLogs> => {
    const response = await apiClient.get("/logs", { params: filters });
    const body = response.data;

    if (body?.data && Array.isArray(body.data?.data)) {
      return body.data as PaginatedLogs;
    }

    if (Array.isArray(body?.data)) {
      return {
        data: body.data,
        total: body.total ?? body.data.length,
        page: body.page ?? filters.page ?? 1,
        limit: body.limit ?? filters.limit ?? 20,
        totalPages:
          body.totalPages ??
          Math.ceil((body.total ?? body.data.length) / (body.limit ?? 20)),
      };
    }

    return body?.data ?? body;
  },

  getById: async (id: string): Promise<Log> => {
    const { data } = await apiClient.get<BackendApiResponse<Log>>(`/logs/${id}`);
    return data.data;
  },
};
