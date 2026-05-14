import { apiClient } from "@/api/axios.client";
import type {
  User,
  Role,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilters,
  PaginatedUsers,
  BackendApiResponse,
} from "@/types";

type RawUser = User & { userRoles?: { role?: { type?: string; name?: string } }[] };

function normalizeRoles(u: RawUser): Role[] {
  // Backend returns userRoles: [{ role: { id, type, name } }]
  if (Array.isArray(u.userRoles) && u.userRoles.length > 0) {
    return u.userRoles
      .map((ur) => (ur.role?.type ?? ur.role?.name ?? "") as Role)
      .filter(Boolean) as Role[];
  }
  // Fallback: roles as strings or objects
  if (Array.isArray(u.roles)) {
    return u.roles
      .map((r) => {
        if (typeof r === "string") return r as Role;
        const obj = r as unknown as { type?: string; name?: string };
        return (obj.type ?? obj.name ?? "") as Role;
      })
      .filter(Boolean) as Role[];
  }
  return [];
}

function normalizeUser(u: RawUser): User {
  return { ...u, roles: normalizeRoles(u) };
}

async function fetchUserById(id: string): Promise<User> {
  const { data } = await apiClient.get<BackendApiResponse<RawUser>>(`/users/${id}`);
  return normalizeUser(data.data);
}

export const usersService = {
  getAll: async (filters: UserFilters = {}): Promise<PaginatedUsers> => {
    const response = await apiClient.get("/users", { params: filters });
    const body = response.data;

    let result: PaginatedUsers;

    // { success, data: { data: [...], total, page, limit, totalPages } }
    if (body?.data && Array.isArray(body.data?.data)) {
      result = body.data as PaginatedUsers;
    }
    // { success, data: [...], total, page, limit, totalPages }
    else if (Array.isArray(body?.data)) {
      result = {
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
    else {
      result = (body.data ?? body) as PaginatedUsers;
    }

    const enriched = await Promise.all(
      result.data.map((u) => fetchUserById(u.id).catch(() => normalizeUser(u as RawUser)))
    );
    return { ...result, data: enriched };
  },

  getById: (id: string): Promise<User> => fetchUserById(id),

  create: async (payload: CreateUserRequest): Promise<User> => {
    const { data } = await apiClient.post<BackendApiResponse<User>>(
      "/users",
      payload
    );
    return normalizeUser(data.data as RawUser);
  },

  update: async (id: string, payload: UpdateUserRequest): Promise<User> => {
    const { data } = await apiClient.patch<BackendApiResponse<User>>(
      `/users/${id}`,
      payload
    );
    return normalizeUser(data.data as RawUser);
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
