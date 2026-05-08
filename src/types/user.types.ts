import type { Role } from "./auth.types";

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleIds?: string[];
  isActive?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  roleIds?: string[];
  isActive?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: Role | "";
  isActive?: boolean | "";
  page?: number;
  limit?: number;
}

export interface PaginatedUsers {
  data: import("./auth.types").User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type { Role };
