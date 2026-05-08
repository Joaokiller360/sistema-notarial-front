export interface Log {
  id: string;
  action: string;
  entity?: string;
  entityId?: string;
  userId?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface LogFilters {
  search?: string;
  action?: string;
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
