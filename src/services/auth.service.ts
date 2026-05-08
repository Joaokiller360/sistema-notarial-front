import { apiClient } from "@/api/axios.client";
import type {
  LoginRequest,
  LoginResponse,
  User,
  BackendApiResponse,
} from "@/types";

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { data } = await apiClient.post<BackendApiResponse<LoginResponse>>(
      "/auth/login",
      credentials
    );
    return data.data;
  },

  logout: async (refreshToken?: string): Promise<void> => {
    await apiClient.post("/auth/logout", { refreshToken: refreshToken || "" });
  },

  refreshToken: async (
    userId: string,
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    const { data } = await apiClient.post<
      BackendApiResponse<{ accessToken: string; refreshToken: string }>
    >("/auth/refresh", { userId, refreshToken });
    return data.data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<BackendApiResponse<User>>("/auth/me");
    return data.data;
  },

  changePassword: async (payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> => {
    await apiClient.post("/auth/change-password", payload);
  },
};
