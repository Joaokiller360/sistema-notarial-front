import { apiClient } from "@/api/axios.client";
import type { Task, AssignTaskPayload, TaskStatus, TaskPriority } from "@/types";

export interface PaginatedTasks {
  data: Task[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function extract(body: unknown): PaginatedTasks {
  const b = body as Record<string, unknown>;
  const inner = (b?.data ?? b) as Record<string, unknown>;
  if (Array.isArray(inner?.data)) return inner as unknown as PaginatedTasks;
  if (Array.isArray(inner)) {
    const arr = inner as Task[];
    return { data: arr, total: arr.length, page: 1, limit: arr.length, pages: 1 };
  }
  return { data: [], total: 0, page: 1, limit: 20, pages: 1 };
}

function unwrap<T>(body: unknown): T {
  const b = body as Record<string, unknown>;
  return (b?.data ?? b) as T;
}

export const tasksService = {
  create: async (payload: AssignTaskPayload): Promise<Task> => {
    const { data } = await apiClient.post("/tasks", payload);
    return unwrap<Task>(data);
  },

  getReceived: async (params?: {
    page?: number;
    limit?: number;
    status?: TaskStatus;
    priority?: TaskPriority;
  }): Promise<PaginatedTasks> => {
    const { data } = await apiClient.get("/tasks/received", { params });
    return extract(data);
  },

  getAssigned: async (params?: {
    page?: number;
    limit?: number;
    status?: TaskStatus;
  }): Promise<PaginatedTasks> => {
    const { data } = await apiClient.get("/tasks/assigned", { params });
    return extract(data);
  },

  updateStatus: async (id: string, status: TaskStatus): Promise<Task> => {
    const { data } = await apiClient.patch(`/tasks/${id}/status`, { status });
    return unwrap<Task>(data);
  },

  markRead: async (id: string): Promise<Task> => {
    const { data } = await apiClient.patch(`/tasks/${id}/read`);
    return unwrap<Task>(data);
  },

  delete: (id: string) => apiClient.delete(`/tasks/${id}`),
};
