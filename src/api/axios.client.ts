import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { tokenUtils } from "@/utils/token";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
}> = [];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token as string);
  });
  failedQueue = [];
};

/** Aviso que la página de login lee tras un corte de sesión forzado. */
export const SESSION_NOTICE_KEY = "notaria_session_notice";

const SESSION_SUPERSEDED_RE = /sesi[oó]n iniciada en otro dispositivo/i;
const SESSION_SUPERSEDED_NOTICE =
  "Tu sesión se cerró porque iniciaste sesión en otro dispositivo.";

function errorMessage(error: AxiosError): string {
  const data = error.response?.data as { message?: unknown } | undefined;
  const m = data?.message;
  if (Array.isArray(m)) return m.join(" · ");
  return typeof m === "string" ? m : "";
}

/** Sesión única (backend): 401 con el mensaje de "otro dispositivo". */
function isSessionSuperseded(error: AxiosError): boolean {
  return (
    error.response?.status === 401 && SESSION_SUPERSEDED_RE.test(errorMessage(error))
  );
}

/** Limpia tokens + cookie y vuelve a /login, opcionalmente con un aviso. */
function forceLogout(notice?: string): void {
  tokenUtils.clearTokens();
  if (typeof window === "undefined") return;
  document.cookie =
    "notaria_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict";
  if (notice) {
    try {
      sessionStorage.setItem(SESSION_NOTICE_KEY, notice);
    } catch {
      // sessionStorage no disponible: seguimos con la redirección igual
    }
  }
  window.location.href = "/login";
}

const isAuthEndpoint = (url?: string): boolean =>
  !!url && (url.includes("/auth/login") || url.includes("/auth/refresh"));

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenUtils.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    if (error.response?.status === 429) {
      const count = originalRequest._retryCount ?? 0;
      if (count < 2) {
        originalRequest._retryCount = count + 1;
        const retryAfter = error.response.headers["retry-after"];
        const delay = retryAfter ? parseInt(String(retryAfter)) * 1000 : (count + 1) * 1500;
        await sleep(delay);
        return apiClient(originalRequest);
      }
    }

    // Sesión única: el backend cortó esta sesión (login en otro dispositivo).
    // No entrar al loop de refresh — fallaría igual. Limpiar y volver a /login.
    if (isSessionSuperseded(error)) {
      forceLogout(SESSION_SUPERSEDED_NOTICE);
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      const refreshToken = tokenUtils.getRefreshToken();
      const userId = getUserIdFromToken();

      if (!refreshToken || !userId) {
        forceLogout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          userId,
          refreshToken,
        });

        const responseData = response.data?.data || response.data;
        const { accessToken, refreshToken: newRefreshToken } = responseData;

        tokenUtils.setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        forceLogout(
          isSessionSuperseded(refreshError as AxiosError)
            ? SESSION_SUPERSEDED_NOTICE
            : undefined
        );
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Translate common HTTP error messages to Spanish
    if (error.response) {
      const data = error.response.data as Record<string, unknown> | undefined;
      if (data && typeof data.message === "string") {
        data.message = translateError(data.message);
      }
    }

    return Promise.reject(error);
  }
);

const ERROR_TRANSLATIONS: Record<string, string> = {
  "Unauthorized": "No autorizado. Por favor inicia sesión.",
  "Forbidden": "No tienes permisos para realizar esta acción.",
  "Not Found": "El recurso solicitado no fue encontrado.",
  "Internal Server Error": "Error interno del servidor. Intenta de nuevo.",
  "Bad Request": "Solicitud inválida.",
  "Conflict": "Ya existe un registro con esos datos.",
  "Unprocessable Entity": "Los datos enviados no son válidos.",
  "Too Many Requests": "Demasiadas solicitudes. Espera un momento.",
  "Service Unavailable": "Servicio no disponible. Intenta más tarde.",
  "Gateway Timeout": "Tiempo de espera agotado. Intenta de nuevo.",
  "Network Error": "Error de red. Verifica tu conexión.",
  "Request failed with status code 400": "Solicitud inválida.",
  "Request failed with status code 401": "No autorizado. Por favor inicia sesión.",
  "Request failed with status code 403": "No tienes permisos para realizar esta acción.",
  "Request failed with status code 404": "El recurso solicitado no fue encontrado.",
  "Request failed with status code 409": "Ya existe un registro con esos datos.",
  "Request failed with status code 422": "Los datos enviados no son válidos.",
  "Request failed with status code 500": "Error interno del servidor. Intenta de nuevo.",
  "Request failed with status code 503": "Servicio no disponible. Intenta más tarde.",
};

function translateError(message: string): string {
  if (ERROR_TRANSLATIONS[message]) return ERROR_TRANSLATIONS[message];
  for (const [en, es] of Object.entries(ERROR_TRANSLATIONS)) {
    if (message.toLowerCase().includes(en.toLowerCase())) return es;
  }
  return message;
}

function getUserIdFromToken(): string | null {
  const token = tokenUtils.getAccessToken();
  if (!token) return null;
  const decoded = tokenUtils.decodeToken(token);
  return decoded?.sub || null;
}

export const apiFormClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

apiFormClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenUtils.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiFormClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    if (error.response?.status === 429) {
      const count = originalRequest._retryCount ?? 0;
      if (count < 2) {
        originalRequest._retryCount = count + 1;
        const retryAfter = error.response.headers["retry-after"];
        const delay = retryAfter ? parseInt(String(retryAfter)) * 1000 : (count + 1) * 1500;
        await sleep(delay);
        return apiFormClient(originalRequest);
      }
    }

    // Sesión única: el backend cortó esta sesión (login en otro dispositivo).
    // No entrar al loop de refresh — fallaría igual. Limpiar y volver a /login.
    if (isSessionSuperseded(error)) {
      forceLogout(SESSION_SUPERSEDED_NOTICE);
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      const refreshToken = tokenUtils.getRefreshToken();
      const userId = getUserIdFromToken();

      if (!refreshToken || !userId) {
        forceLogout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiFormClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          userId,
          refreshToken,
        });

        const responseData = response.data?.data || response.data;
        const { accessToken, refreshToken: newRefreshToken } = responseData;

        tokenUtils.setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiFormClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        forceLogout(
          isSessionSuperseded(refreshError as AxiosError)
            ? SESSION_SUPERSEDED_NOTICE
            : undefined
        );
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response) {
      const data = error.response.data as Record<string, unknown> | undefined;
      if (data && typeof data.message === "string") {
        data.message = translateError(data.message);
      }
    }

    return Promise.reject(error);
  }
);
