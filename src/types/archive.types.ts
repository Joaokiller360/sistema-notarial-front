export type ArchiveStatus = "ACTIVO" | "INACTIVO" | "PENDIENTE" | "ARCHIVADO";
export type ArchiveType = "A" | "C" | "D" | "O" | "P";

export interface Grantor {
  id?: string;
  nombresCompletos: string;
  cedulaORuc?: string;
  nacionalidad: string;
}

export interface Beneficiary {
  id?: string;
  nombresCompletos: string;
  cedulaORuc?: string;
  nacionalidad: string;
}

export interface Archive {
  id: string;
  code: string;
  type: ArchiveType;
  status?: ArchiveStatus;
  observations?: string;
  documentDate?: string;
  pdfUrl?: string;
  pdfFileName?: string;
  deletedAt?: string;
  grantors: Grantor[];
  beneficiaries: Beneficiary[];
  createdById: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  updatedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateArchiveRequest {
  code: string;
  type: ArchiveType;
  observations?: string;
  documentDate?: string;
  grantors?: Omit<Grantor, "id">[];
  beneficiaries?: Omit<Beneficiary, "id">[];
}

export interface UpdateArchiveRequest {
  code?: string;
  type?: ArchiveType;
  observations?: string;
  documentDate?: string;
  grantors?: Omit<Grantor, "id">[];
  beneficiaries?: Omit<Beneficiary, "id">[];
}

export interface ArchiveFilters {
  search?: string;
  type?: ArchiveType | "";
  status?: ArchiveStatus | "";
  page?: number;
  limit?: number;
}

export interface PaginatedArchives {
  data: Archive[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
