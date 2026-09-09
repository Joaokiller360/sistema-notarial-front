export type LogResource =
  | "auth"
  | "users"
  | "archives"
  | "clients"
  | "roles"
  | "permissions"
  | "notaries"
  | "notifications"
  | "tasks"
  | "news"
  | "uafe-forms"
  | "settings"
  | "system";

export type LogMethod = "POST" | "GET" | "PATCH" | "PUT" | "DELETE";

export interface LogEntry {
  id: string;
  userId: string | null;
  action: string;
  endpoint: string;
  /** Método HTTP; puede llegar cualquier string en mayúsculas como fallback. */
  method: LogMethod | string;
  /** `null` para acciones del sistema o recursos sin mapear. */
  resource: LogResource | string | null;
  resourceId: string | number | null;
  /** Objeto JSON arbitrario (body redactado, query de búsqueda, error, etc.). */
  details: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  statusCode: number | null;
  createdAt: string;
  /** `null` cuando `userId` es `null` (acción del sistema / no autenticado). */
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface LogFilters {
  page?: number;
  limit?: number;
  /** UUID v4 — filtra por usuario. */
  userId?: string;
  /** Filtra por acción (contiene, case-insensitive). */
  action?: string;
  /** ISO 8601 — límite inferior de `createdAt`. */
  startDate?: string;
  /** ISO 8601 — límite superior de `createdAt`. */
  endDate?: string;
}

/** @deprecated usar `LogEntry`. */
export type Log = LogEntry;
/** @deprecated usar `PaginatedResponse<LogEntry>`. */
export type PaginatedLogs = PaginatedResponse<LogEntry>;
