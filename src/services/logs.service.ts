import { apiClient } from "@/api/axios.client";
import type {
  LogEntry,
  LogFilters,
  PaginatedResponse,
  BackendApiResponse,
} from "@/types";

function normalize(
  body: Record<string, unknown>,
  filters: LogFilters
): PaginatedResponse<LogEntry> {
  // { success, data: { data: [...], total, page, limit, pages } }
  const inner =
    body?.data && Array.isArray((body.data as { data?: unknown }).data)
      ? (body.data as Record<string, unknown>)
      : body;

  const rows = Array.isArray(inner.data) ? (inner.data as LogEntry[]) : [];
  const total = typeof inner.total === "number" ? inner.total : rows.length;
  const limit =
    typeof inner.limit === "number" ? inner.limit : filters.limit ?? 20;
  const page = typeof inner.page === "number" ? inner.page : filters.page ?? 1;
  const pages =
    typeof inner.pages === "number"
      ? inner.pages
      : typeof inner.totalPages === "number"
        ? (inner.totalPages as number)
        : Math.max(1, Math.ceil(total / limit));

  return { data: rows, total, page, limit, pages };
}

/** Tope de `limit` que acepta el backend (GET /api/v1/logs → 400 si se supera). */
const MAX_API_LIMIT = 100;

async function fetchPage(
  filters: LogFilters,
  signal?: AbortSignal
): Promise<PaginatedResponse<LogEntry>> {
  const response = await apiClient.get("/logs", { params: filters, signal });
  return normalize(response.data, filters);
}

export const logsService = {
  getAll: async (
    filters: LogFilters = {},
    signal?: AbortSignal
  ): Promise<PaginatedResponse<LogEntry>> => {
    const want = filters.limit ?? 20;
    const uiPage = filters.page ?? 1;

    // Caso simple: cabe en una sola petición.
    if (want <= MAX_API_LIMIT) {
      return fetchPage(filters, signal);
    }

    // El usuario pidió más de lo que el backend permite por request:
    // se traen varias páginas de MAX_API_LIMIT y se concatenan. Se corta
    // apenas una página devuelve menos de lo pedido (no hay más registros).
    const chunks = Math.ceil(want / MAX_API_LIMIT);
    const startApiPage = (uiPage - 1) * chunks + 1;
    const rows: LogEntry[] = [];
    let total = 0;

    for (let i = 0; i < chunks; i++) {
      const res = await fetchPage(
        { ...filters, page: startApiPage + i, limit: MAX_API_LIMIT },
        signal
      );
      rows.push(...res.data);
      total = res.total || total;
      if (res.data.length < MAX_API_LIMIT) break;
      if (rows.length >= want) break;
    }

    const effectiveTotal = total || rows.length;
    return {
      data: rows.slice(0, want),
      total: effectiveTotal,
      page: uiPage,
      limit: want,
      pages: Math.max(1, Math.ceil(effectiveTotal / want)),
    };
  },

  getById: async (id: string): Promise<LogEntry> => {
    const { data } = await apiClient.get<BackendApiResponse<LogEntry>>(
      `/logs/${id}`
    );
    return data.data;
  },
};
