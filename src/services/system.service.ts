import { apiClient } from "@/api/axios.client";
import type { BackendApiResponse } from "@/types";

export interface SystemConfig {
  maxPdfSizeMb: number;
}

export const systemService = {
  getConfig: async (): Promise<SystemConfig> => {
    const { data } = await apiClient.get<BackendApiResponse<SystemConfig>>("/system/config");
    return data.data;
  },

  updateConfig: async (payload: Partial<SystemConfig>): Promise<SystemConfig> => {
    const { data } = await apiClient.patch<BackendApiResponse<SystemConfig>>("/system/config", payload);
    return data.data;
  },
};
