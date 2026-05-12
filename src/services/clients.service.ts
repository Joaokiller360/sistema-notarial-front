import { apiClient } from "@/api/axios.client";
import type {
  Client,
  ClientDetail,
  ClientFilters,
  PaginatedClients,
  BackendApiResponse,
} from "@/types";

export interface ClientPayload {
  nombresCompletos: string;
  cedulaORuc?: string;
  pasaporte?: string;
  nacionalidad: string;
}

export const clientsService = {
  getAll: async (filters: ClientFilters = {}): Promise<PaginatedClients> => {
    const response = await apiClient.get("/clients", { params: filters });
    const body = response.data;

    //console.log("[clients.getAll] raw response:", JSON.stringify(body).slice(0, 500));

    // { data: { data: [...], total, page, totalPages, limit } }
    if (body?.data && Array.isArray(body.data?.data)) {
      return body.data as PaginatedClients;
    }
    // { data: { items: [...], total, ... } }
    if (body?.data && Array.isArray(body.data?.items)) {
      const inner = body.data;
      return {
        data: inner.items,
        total: inner.total ?? inner.items.length,
        page: inner.page ?? filters.page ?? 1,
        limit: inner.limit ?? filters.limit ?? 15,
        totalPages: inner.totalPages ?? Math.ceil((inner.total ?? inner.items.length) / (inner.limit ?? 15)),
      };
    }
    // { data: [...], total, page, totalPages }
    if (Array.isArray(body?.data)) {
      return {
        data: body.data,
        total: body.total ?? body.data.length,
        page: body.page ?? filters.page ?? 1,
        limit: body.limit ?? filters.limit ?? 15,
        totalPages: body.totalPages ?? Math.ceil((body.total ?? body.data.length) / (body.limit ?? 15)),
      };
    }
    // { items: [...], total, ... }
    if (Array.isArray(body?.items)) {
      return {
        data: body.items,
        total: body.total ?? body.items.length,
        page: body.page ?? filters.page ?? 1,
        limit: body.limit ?? filters.limit ?? 15,
        totalPages: body.totalPages ?? Math.ceil((body.total ?? body.items.length) / (body.limit ?? 15)),
      };
    }
    //console.warn("[clients.getAll] unrecognized response shape, full body:", body);
    return { data: [], total: 0, page: 1, limit: 15, totalPages: 0 };
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

  create: async (payload: ClientPayload): Promise<Client> => {
    const { data } = await apiClient.post<BackendApiResponse<Client>>("/clients", payload);
    return data.data;
  },

  bulkCreate: async (
    clients: ClientPayload[]
  ): Promise<{ created: number; errors: number }> => {
    const { data } = await apiClient.post<
      BackendApiResponse<{ created: number; errors: number }>
    >("/clients/bulk", { clients });
    return data.data;
  },
};
