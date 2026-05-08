import { apiClient, apiFormClient } from "@/api/axios.client";
import type {
  Archive,
  CreateArchiveRequest,
  UpdateArchiveRequest,
  ArchiveFilters,
  PaginatedArchives,
  BackendApiResponse,
} from "@/types";

export const archivesService = {
  getAll: async (filters: ArchiveFilters = {}): Promise<PaginatedArchives> => {
    const response = await apiClient.get("/archives", { params: filters });
    const body = response.data;

    if (body?.data && Array.isArray(body.data?.data)) {
      return body.data as PaginatedArchives;
    }

    if (Array.isArray(body?.data)) {
      return {
        data: body.data,
        total: body.total ?? body.data.length,
        page: body.page ?? filters.page ?? 1,
        limit: body.limit ?? filters.limit ?? 10,
        totalPages:
          body.totalPages ??
          Math.ceil((body.total ?? body.data.length) / (body.limit ?? filters.limit ?? 10)),
      };
    }

    return body?.data ?? body;
  },

  getById: async (id: string): Promise<Archive> => {
    const { data } = await apiClient.get<BackendApiResponse<Archive>>(
      `/archives/${id}`
    );
    return data.data;
  },

  create: async (payload: CreateArchiveRequest): Promise<Archive> => {
    const { data } = await apiClient.post<BackendApiResponse<Archive>>(
      "/archives",
      payload
    );
    return data.data;
  },

  update: async (
    id: string,
    payload: UpdateArchiveRequest
  ): Promise<Archive> => {
    const { data } = await apiClient.patch<BackendApiResponse<Archive>>(
      `/archives/${id}`,
      payload
    );
    return data.data;
  },

  uploadPdf: async (id: string, file: File): Promise<Archive> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiFormClient.post<BackendApiResponse<Archive>>(
      `/archives/${id}/upload-pdf`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/archives/${id}`);
  },
};
