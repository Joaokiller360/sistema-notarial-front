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

  updateMe: async (payload: {
    firstName: string;
    lastName: string;
  }): Promise<User> => {
    const { data } = await apiClient.patch<BackendApiResponse<User>>(
      "/auth/me",
      payload
    );
    return data.data;
  },

  changePassword: async (payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> => {
    await apiClient.post("/auth/change-password", payload);
  },

  /**
   * Desbloquea una cuenta bloqueada por intentos de login fallidos.
   * Solo SUPER_ADMIN / NOTARIO. Backend: POST /auth/unlock-account.
   */
  unlockAccount: async (userId: string): Promise<void> => {
    await apiClient.post("/auth/unlock-account", { userId });
  },

  /**
   * Cierra la sesión activa de otro usuario (sesión única: la primera sesión
   * gana; esto la libera para que pueda volver a entrar).
   * Solo SUPER_ADMIN / NOTARIO. Backend: POST /auth/force-logout.
   */
  forceLogout: async (userId: string): Promise<void> => {
    await apiClient.post("/auth/force-logout", { userId });
  },
};
