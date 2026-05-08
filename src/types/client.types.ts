import type { Archive } from "./archive.types";

export interface Client {
  id: string;
  nombresCompletos: string;
  cedulaORuc: string;
  nacionalidad?: string;
  email?: string;
  phone?: string;
  totalArchivesAsGrantor?: number;
  totalArchivesAsBeneficiary?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientDetail extends Client {
  archivesAsGrantor: Archive[];
  archivesAsBeneficiary: Archive[];
}

export interface ClientFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedClients {
  data: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
