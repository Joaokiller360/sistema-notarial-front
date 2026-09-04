import { apiClient, apiFormClient } from "@/api/axios.client";
import type { UafeFormData } from "@/lib/uafe-forms";
import type { BackendApiResponse } from "@/types";

export interface UafeComprobante {
  id: string;
  /** URL firmada, válida ~1h. */
  url: string;
}

export interface UafeForm {
  id: string;
  filledById: string | null;
  filledByName: string;
  filledByEmail: string;
  filledByRole: string;
  templateId: string;
  templateName: string;
  data: UafeFormData;
  nacionalidad: string | null;
  nivelRiesgo: string | null;
  comparecienteNombre: string | null;
  comparecienteId: string | null;
  createdAt: string;
  updatedAt: string;
  comprobantes: UafeComprobante[];
}

export interface UafeFormFilters {
  page?: number;
  limit?: number;
  /** Nombre/id del compareciente o de quien llenó el formulario. */
  search?: string;
  nacionalidad?: string;
  nivelRiesgo?: "bajo" | "medio" | "alto" | "critico" | "";
}

export interface PaginatedUafeForms {
  data: UafeForm[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUafeFormPayload {
  templateId: string;
  templateName: string;
  data: UafeFormData;
}

const DEFAULT_LIMIT = 15;

export const uafeFormsService = {
  getAll: async (filters: UafeFormFilters = {}): Promise<PaginatedUafeForms> => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const response = await apiClient.get("/uafe-forms", { params });
    const body = response.data;

    // { success, data: { data: [...], total, page, limit, pages } }
    const inner = body?.data && Array.isArray(body.data?.data) ? body.data : body;
    const data = Array.isArray(inner?.data) ? inner.data : [];
    const limit = inner?.limit ?? filters.limit ?? DEFAULT_LIMIT;
    const total = inner?.total ?? data.length;
    return {
      data,
      total,
      page: inner?.page ?? filters.page ?? 1,
      limit,
      totalPages: inner?.pages ?? inner?.totalPages ?? Math.ceil(total / limit),
    };
  },

  getById: async (id: string): Promise<UafeForm> => {
    const { data } = await apiClient.get<BackendApiResponse<UafeForm>>(`/uafe-forms/${id}`);
    return data.data;
  },

  create: async (payload: CreateUafeFormPayload): Promise<UafeForm> => {
    // `UafeFormData` ya no incluye comprobantes (van por su propio endpoint multipart).
    const { data } = await apiClient.post<BackendApiResponse<UafeForm>>("/uafe-forms", payload);
    return data.data;
  },

  update: async (id: string, formData: UafeFormData): Promise<UafeForm> => {
    const { data } = await apiClient.patch<BackendApiResponse<UafeForm>>(`/uafe-forms/${id}`, {
      data: formData,
    });
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/uafe-forms/${id}`);
  },

  uploadComprobantes: async (id: string, files: File[]): Promise<UafeComprobante[]> => {
    const formData = new FormData();
    files.forEach((f) => formData.append("images", f));
    const { data } = await apiFormClient.post<BackendApiResponse<UafeComprobante[]>>(
      `/uafe-forms/${id}/comprobantes`,
      formData
    );
    return data.data;
  },

  deleteComprobante: async (id: string, comprobanteId: string): Promise<void> => {
    await apiClient.delete(`/uafe-forms/${id}/comprobantes/${comprobanteId}`);
  },
};
