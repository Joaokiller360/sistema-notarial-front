export interface News {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateNewsRequest {
  title: string;
  description: string;
}

export interface PaginatedNews {
  data: News[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NewsFilters {
  page?: number;
  limit?: number;
}
