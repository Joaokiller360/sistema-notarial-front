import { apiClient } from "@/api/axios.client";
import type {
  Client,
  ClientDetail,
  ClientFilters,
  PaginatedClients,
  BackendApiResponse,
} from "@/types";

export const clientsService = {
  getAll: async (filters: ClientFilters = {}): Promise<PaginatedClients> => {
    const response = await apiClient.get("/clients", { params: filters });
    const body = response.data;

    if (body?.data && Array.isArray(body.data?.data)) {
      return body.data as PaginatedClients;
    }
    if (Array.isArray(body?.data)) {
      return {
        data: body.data,
        total: body.total ?? body.data.length,
        page: body.page ?? filters.page ?? 1,
        limit: body.limit ?? filters.limit ?? 15,
        totalPages:
          body.totalPages ??
          Math.ceil((body.total ?? body.data.length) / (body.limit ?? 15)),
      };
    }
    return body?.data ?? body;
  },

  getById: async (id: string): Promise<ClientDetail> => {
    const { data } = await apiClient.get<BackendApiResponse<ClientDetail>>(
      `/clients/${id}`
    );
    return data.data;
  },

  getArchives: async (id: string): Promise<ClientDetail["archivesAsGrantor"]> => {
    const { data } = await apiClient.get<BackendApiResponse<ClientDetail["archivesAsGrantor"]>>(
      `/clients/${id}/archives`
    );
    return data.data;
  },
};
