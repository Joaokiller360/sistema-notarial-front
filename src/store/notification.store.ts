"use client";

import { create } from "zustand";
import type { Notification, Task } from "@/types";

import type { User } from "@/types";

interface NotificationState {
  notifications: Notification[];
  tasks: Task[];
  users: User[];
  usersLoading: boolean;
  setNotifications: (list: Notification[]) => void;
  prependNotification: (n: Notification) => void;
  patchNotification: (id: string, patch: Partial<Notification>) => void;
  removeNotification: (id: string) => void;
  setTasks: (list: Task[]) => void;
  prependTask: (t: Task) => void;
  patchTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  setUsers: (users: User[]) => void;
  setUsersLoading: (loading: boolean) => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  tasks: [],
  users: [],
  usersLoading: false,

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

  setUsers: (users) => set({ users }),
  setUsersLoading: (usersLoading) => set({ usersLoading }),
}));
