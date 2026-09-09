"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { useNotificationStore } from "@/store/notification.store";
import { tokenUtils } from "@/utils/token";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { forceLogout, SESSION_SUPERSEDED_NOTICE } from "@/api/axios.client";
import type { Notification, Task, TaskStatus } from "@/types";

/* ── Payloads (shapes confirmados por backend) ─────────── */

interface TaskAssignedPayload {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  title: string;
  description: string;
  priority: Task["priority"];
  dueDate: string;
  status: TaskStatus;
  attachment: { name: string; size: number; mimeType: string } | null;
  createdAt: string;
  readByRecipient: boolean;
}

interface TaskStatusUpdatedPayload {
  taskId: string;
  status: TaskStatus;
  updatedAt: string;
}

type NotificationPayload = Notification;

interface NotificationReadPayload {
  id: string;
  read?: boolean;
  readAt?: string;
}

interface TaskReadPayload {
  taskId: string;
  readByRecipient?: boolean;
  readAt?: string;
}

interface NewsPublishedPayload {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  createdAt: string;
}

/* ── Mapeos ───────────────────────────────────────────── */

function toTask(p: TaskAssignedPayload): Task {
  return { ...p, attachment: p.attachment ?? undefined };
}

/**
 * Conexión WebSocket en tiempo real. Se registra UNA SOLA VEZ en el layout
 * del dashboard, junto a `useNotificationsBootstrap`. Registrarlo en más de
 * un componente reintroduce el problema de conexiones/ráfagas duplicadas.
 *
 * El WS es complementario: si no conecta, degrada en silencio y la app
 * sigue por REST/polling. No muestra errores visibles.
 */
export function useRealtimeConnection() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;

    const token = tokenUtils.getAccessToken();
    if (!token) return;

    const socket = connectSocket(token);
    const store = () => useNotificationStore.getState();

    /* task:assigned → nueva tarea para mí */
    const onTaskAssigned = (payload: TaskAssignedPayload) => {
      if (store().tasks.some((t) => t.id === payload.id)) return; // anti-duplicado
      store().prependTask(toTask(payload));
      toast.info(`Nueva tarea: ${payload.title}`);
    };

    /* task:status-updated → cambió el estado de una tarea que yo asigné */
    const onTaskStatusUpdated = (payload: TaskStatusUpdatedPayload) => {
      store().patchTask(payload.taskId, { status: payload.status });
    };

    /* notification:new → notificación personal o broadcast ("ALL") */
    const onNotificationNew = (payload: NotificationPayload) => {
      if (store().notifications.some((n) => n.id === payload.id)) return;
      store().prependNotification(payload);
      const urgent = payload.type === "URGENTE" || payload.type === "ALERTA";
      (urgent ? toast.warning : toast.info)(payload.subject);
    };

    /* notification:read → el destinatario marcó como leída una notificación
       que yo envié. Actualiza el estado "Leído" en el historial en vivo. */
    const onNotificationRead = (payload: NotificationReadPayload) => {
      store().patchNotification(payload.id, {
        read: payload.read ?? true,
      });
    };

    /* task:read → el destinatario abrió/leyó una tarea que yo asigné. */
    const onTaskRead = (payload: TaskReadPayload) => {
      store().patchTask(payload.taskId, {
        readByRecipient: payload.readByRecipient ?? true,
      });
    };

    /* news:published → aviso liviano con enlace a /news */
    const onNewsPublished = (payload: NewsPublishedPayload) => {
      toast.info("Nueva noticia publicada", {
        description: payload.title,
        action: {
          label: "Ver",
          onClick: () => {
            window.location.assign("/news");
          },
        },
      });
    };

    /* Sesión invalidada por el server (login en otro dispositivo,
       force-logout de admin, cambio/reset de contraseña). */
    const onDisconnect = (reason: string) => {
      if (reason === "io server disconnect") {
        disconnectSocket();
        forceLogout(SESSION_SUPERSEDED_NOTICE);
      }
      // otras razones (red): socket.io reintenta solo, en silencio
    };

    // token inválido/expirado u otro fallo de handshake: sin ruido visible
    const onConnectError = () => {};

    socket.on("task:assigned", onTaskAssigned);
    socket.on("task:status-updated", onTaskStatusUpdated);
    socket.on("task:read", onTaskRead);
    socket.on("notification:new", onNotificationNew);
    socket.on("notification:read", onNotificationRead);
    socket.on("news:published", onNewsPublished);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("task:assigned", onTaskAssigned);
      socket.off("task:status-updated", onTaskStatusUpdated);
      socket.off("task:read", onTaskRead);
      socket.off("notification:new", onNotificationNew);
      socket.off("notification:read", onNotificationRead);
      socket.off("news:published", onNewsPublished);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      disconnectSocket();
    };
  }, [isAuthenticated, hasHydrated]);
}
