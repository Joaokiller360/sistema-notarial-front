import { apiClient } from "@/api/axios.client";
import type { NotaryFormValues, NotaryResponse } from "@/types";
import type { BackendApiResponse } from "@/types";
import { sanitizeText } from "@/schemas/notary.schema";

function buildPayload(data: NotaryFormValues): NotaryFormValues {
  return {
    notaryName: sanitizeText(data.notaryName),
    notaryNumber: data.notaryNumber,
    notaryOfficerName: sanitizeText(data.notaryOfficerName),
  };
}

function parseError(err: unknown, fallback: string): Error {
  const raw = (err as { response?: { data?: { message?: unknown } } })?.response?.data;
  const msg = raw?.message;
  const readable =
    Array.isArray(msg) ? msg.join(" · ") : typeof msg === "string" ? msg : fallback;
  return new Error(readable);
}

export const notaryService = {
  get: async (): Promise<NotaryResponse | null> => {
    try {
      const { data: res } = await apiClient.get<BackendApiResponse<NotaryResponse[]>>("/notaries");
      return res.data[0] ?? null;
    } catch {
      return null;
    }
  },

  create: async (data: NotaryFormValues): Promise<NotaryResponse> => {
    try {
      const { data: res } = await apiClient.post<BackendApiResponse<NotaryResponse>>(
        "/notaries",
        buildPayload(data)
      );
      return res.data;
    } catch (err) {
      throw parseError(err, "Error al registrar la notaría");
    }
  },

  update: async (id: number, data: NotaryFormValues): Promise<NotaryResponse> => {
    try {
      const { data: res } = await apiClient.patch<BackendApiResponse<NotaryResponse>>(
        `/notaries/${id}`,
        buildPayload(data)
      );
      return res.data;
    } catch (err) {
      throw parseError(err, "Error al actualizar la notaría");
    }
  },
};
