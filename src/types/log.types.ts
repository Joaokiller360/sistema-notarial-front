export interface Log {
  id: string;
  userId?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  action: string;
  endpoint?: string;
  method?: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown> | string;
  ip?: string;
  userAgent?: string;
  statusCode?: number;
  createdAt: string;
}

export interface LogFilters {
  search?: string;
  action?: string;
  /** ISO 8601 — límite inferior del rango de fechas */
  startDate?: string;
  /** ISO 8601 — límite superior del rango de fechas */
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedLogs {
  data: Log[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
