import { apiClient } from "@/api/axios.client";
import type { BackendApiResponse } from "@/types";

export interface RoleItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
}

interface PaginatedRoles {
  data: RoleItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const rolesService = {
  getAll: async (): Promise<RoleItem[]> => {
    const { data } = await apiClient.get<BackendApiResponse<PaginatedRoles>>(
      "/roles",
      { params: { limit: 100 } }
    );
    return data.data.data;
  },
};
