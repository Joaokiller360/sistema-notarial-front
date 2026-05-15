"use client";

import { create } from "zustand";
import type { Notification, Task } from "@/types";

interface NotificationState {
  notifications: Notification[];
  tasks: Task[];
  setNotifications: (list: Notification[]) => void;
  prependNotification: (n: Notification) => void;
  patchNotification: (id: string, patch: Partial<Notification>) => void;
  removeNotification: (id: string) => void;
  setTasks: (list: Task[]) => void;
  prependTask: (t: Task) => void;
  patchTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  tasks: [],

  setNotifications: (list) => set({ notifications: list }),
  prependNotification: (n) =>
    set((s) => ({ notifications: [n, ...s.notifications] })),
  patchNotification: (id, patch) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    })),
  removeNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  setTasks: (list) => set({ tasks: list }),
  prependTask: (t) => set((s) => ({ tasks: [t, ...s.tasks] })),
  patchTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
}));
