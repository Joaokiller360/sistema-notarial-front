export type NotificationType = "INFORMATIVA" | "URGENTE" | "RECORDATORIO" | "ALERTA";

export interface NotificationUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}

export interface Notification {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  subject: string;
  message: string;
  type: NotificationType;
  sentAt: string;
  read: boolean;
}

export interface SendNotificationPayload {
  recipientId: string;
  subject: string;
  message: string;
  type: NotificationType;
}

/* ── Tasks ─────────────────────────────────────────────── */

export type TaskPriority = "ALTA" | "MEDIA" | "BAJA";
export type TaskStatus   = "PENDIENTE" | "EN_PROGRESO" | "COMPLETADA";

export interface TaskAttachment {
  name: string;
  size: number;
  mimeType: string;
}

export interface Task {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  attachment?: TaskAttachment;
  createdAt: string;
  readByRecipient: boolean;
}

export interface AssignTaskPayload {
  recipientId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  attachment?: TaskAttachment;
}
