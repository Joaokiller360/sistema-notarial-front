import { apiClient } from "@/api/axios.client";
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilters,
  PaginatedUsers,
  BackendApiResponse,
} from "@/types";

export const usersService = {
  getAll: async (filters: UserFilters = {}): Promise<PaginatedUsers> => {
    const response = await apiClient.get("/users", { params: filters });
    const body = response.data;

    // { success, data: { data: [...], total, page, limit, totalPages } }
    if (body?.data && Array.isArray(body.data?.data)) {
      return body.data as PaginatedUsers;
    }

    // { success, data: [...], total, page, limit, totalPages }
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

    // Already a PaginatedUsers without wrapper
    if (Array.isArray(body?.data?.data ?? body?.data)) {
      return (body.data ?? body) as PaginatedUsers;
    }

    return body?.data ?? body;
  },

  getById: async (id: string): Promise<User> => {
    const { data } = await apiClient.get<BackendApiResponse<User>>(
      `/users/${id}`
    );
    return data.data;
  },

  create: async (payload: CreateUserRequest): Promise<User> => {
    const { data } = await apiClient.post<BackendApiResponse<User>>(
      "/users",
      payload
    );
    return data.data;
  },

  update: async (id: string, payload: UpdateUserRequest): Promise<User> => {
    const { data } = await apiClient.patch<BackendApiResponse<User>>(
      `/users/${id}`,
      payload
    );
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  toggleActive: async (id: string): Promise<User> => {
    const { data } = await apiClient.patch<BackendApiResponse<User>>(
      `/users/${id}/toggle-active`
    );
    return data.data;
  },

  updatePassword: async (
    id: string,
    payload: { currentPassword: string; newPassword: string }
  ): Promise<void> => {
    await apiClient.patch(`/users/${id}/password`, payload);
  },
};
