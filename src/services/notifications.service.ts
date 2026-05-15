import { apiClient } from "@/api/axios.client";
import type { Notification, NotificationType, SendNotificationPayload } from "@/types";

export interface PaginatedNotifications {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function extract(body: unknown): PaginatedNotifications {
  const b = body as Record<string, unknown>;
  const inner = (b?.data ?? b) as Record<string, unknown>;
  if (Array.isArray(inner?.data)) return inner as unknown as PaginatedNotifications;
  if (Array.isArray(inner)) {
    const arr = inner as Notification[];
    return { data: arr, total: arr.length, page: 1, limit: arr.length, pages: 1 };
  }
  return { data: [], total: 0, page: 1, limit: 20, pages: 1 };
}

function unwrap<T>(body: unknown): T {
  const b = body as Record<string, unknown>;
  return (b?.data ?? b) as T;
}

export const notificationsService = {
  send: async (payload: SendNotificationPayload): Promise<Notification> => {
    const { data } = await apiClient.post("/notifications", payload);
    return unwrap<Notification>(data);
  },

  getInbox: async (page = 1, limit = 20): Promise<PaginatedNotifications> => {
    const { data } = await apiClient.get("/notifications/inbox", { params: { page, limit } });
    return extract(data);
  },

  getSent: async (params?: {
    page?: number;
    limit?: number;
    type?: NotificationType;
    read?: boolean;
    from?: string;
    to?: string;
  }): Promise<PaginatedNotifications> => {
    const { data } = await apiClient.get("/notifications/sent", { params });
    return extract(data);
  },

  markRead: async (id: string): Promise<Notification> => {
    const { data } = await apiClient.patch(`/notifications/${id}/read`);
    return unwrap<Notification>(data);
  },

  markAllRead: async (): Promise<{ updated: number }> => {
    const { data } = await apiClient.patch("/notifications/read-all");
    return unwrap<{ updated: number }>(data);
  },

  delete: (id: string) => apiClient.delete(`/notifications/${id}`),
};
