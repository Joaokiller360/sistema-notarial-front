"use client";

import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { useNotificationStore } from "@/store/notification.store";
import { usersService, notificationsService, tasksService } from "@/services";
import type { User } from "@/types";
import type { SendNotificationPayload, AssignTaskPayload, TaskStatus } from "@/types";

export function useNotifications() {
  const { user } = useAuthStore();
  const {
    notifications,
    tasks,
    setNotifications,
    prependNotification,
    patchNotification,
    removeNotification: storeRemoveNotification,
    setTasks,
    prependTask,
    patchTask,
    removeTask: storeRemoveTask,
  } = useNotificationStore();

  /* ── Users ───────────────────────────────────────────── */
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUsersLoading(true);
    usersService
      .getAll({ page: 1, limit: 100 })
      .then((res) => { if (!cancelled) setUsers(res.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setUsersLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /* ── Fetch data on mount ─────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    Promise.all([
      notificationsService.getInbox(),
      notificationsService.getSent(),
    ])
      .then(([inboxRes, sentRes]) => {
        if (cancelled) return;
        const merged = [...inboxRes.data, ...sentRes.data];
        const deduped = Array.from(new Map(merged.map((n) => [n.id, n])).values());
        setNotifications(deduped);
      })
      .catch(() => {});

    Promise.all([
      tasksService.getReceived(),
      tasksService.getAssigned(),
    ])
      .then(([receivedRes, assignedRes]) => {
        if (cancelled) return;
        const merged = [...receivedRes.data, ...assignedRes.data];
        const deduped = Array.from(new Map(merged.map((t) => [t.id, t])).values());
        setTasks(deduped);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Permissions ─────────────────────────────────────── */
  const canSend =
    (user?.roles ?? []).includes("SUPER_ADMIN") ||
    (user?.roles ?? []).includes("NOTARIO");

  /* ── Computed lists ──────────────────────────────────── */
  const inbox = useMemo(
    () =>
      notifications
        .filter((n) => n.recipientId === user?.id || n.recipientId === "ALL")
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()),
    [notifications, user?.id]
  );

  const sent = useMemo(
    () =>
      notifications
        .filter((n) => n.senderId === user?.id)
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()),
    [notifications, user?.id]
  );

  const myTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.recipientId === user?.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [tasks, user?.id]
  );

  const assignedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.senderId === user?.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [tasks, user?.id]
  );

  const unreadCount = useMemo(() => inbox.filter((n) => !n.read).length, [inbox]);
  const pendingTaskCount = useMemo(
    () => myTasks.filter((t) => !t.readByRecipient).length,
    [myTasks]
  );

  /* ── Helpers ─────────────────────────────────────────── */
  const resolveRecipientName = (recipientId: string): string => {
    if (recipientId === "ALL") return "Todos los usuarios";
    const u = users.find((u) => u.id === recipientId);
    return u ? `${u.firstName} ${u.lastName}` : "Usuario";
  };

  /* ── Actions ─────────────────────────────────────────── */
  const send = async (payload: SendNotificationPayload): Promise<boolean> => {
    if (!user) return false;
    try {
      const notification = await notificationsService.send(payload);
      prependNotification(notification);
      toast.success("Notificación enviada exitosamente");
      return true;
    } catch {
      toast.error("Error al enviar la notificación");
      return false;
    }
  };

  const createTask = async (payload: AssignTaskPayload): Promise<boolean> => {
    if (!user) return false;
    try {
      const task = await tasksService.create(payload);
      prependTask(task);
      toast.success("Tarea asignada exitosamente");
      return true;
    } catch {
      toast.error("Error al asignar la tarea");
      return false;
    }
  };

  const readOne = async (id: string) => {
    try {
      await notificationsService.markRead(id);
      patchNotification(id, { read: true });
    } catch {
      // silent — optimistic already handled if needed
    }
  };

  const readAll = async () => {
    if (!user) return;
    try {
      await notificationsService.markAllRead();
      notifications
        .filter((n) => n.recipientId === user.id || n.recipientId === "ALL")
        .forEach((n) => patchNotification(n.id, { read: true }));
    } catch {
      toast.error("Error al marcar como leídas");
    }
  };

  const changeTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      await tasksService.updateStatus(taskId, status);
      patchTask(taskId, { status });
    } catch {
      toast.error("Error al actualizar el estado de la tarea");
    }
  };

  const readTask = async (id: string) => {
    try {
      await tasksService.markRead(id);
      patchTask(id, { readByRecipient: true });
    } catch {
      // silent
    }
  };

  const removeNotification = async (id: string) => {
    storeRemoveNotification(id);
    try {
      await notificationsService.delete(id);
    } catch {
      toast.error("Error al eliminar la notificación");
    }
  };

  const removeTask = async (id: string) => {
    storeRemoveTask(id);
    try {
      await tasksService.delete(id);
    } catch {
      toast.error("Error al eliminar la tarea");
    }
  };

  return {
    inbox,
    sent,
    myTasks,
    assignedTasks,
    unreadCount,
    pendingTaskCount,
    canSend,
    send,
    createTask,
    changeTaskStatus,
    readOne,
    readAll,
    readTask,
    removeNotification,
    removeTask,
    users,
    usersLoading,
    currentUserId: user?.id,
    resolveRecipientName,
  };
}
