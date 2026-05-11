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
  timeout: 7200000,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token as string);
  });
  failedQueue = [];
};

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
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = tokenUtils.getRefreshToken();
      const userId = getUserIdFromToken();

      if (!refreshToken || !userId) {
        tokenUtils.clearTokens();
        if (typeof window !== "undefined") window.location.href = "/login";
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
        tokenUtils.clearTokens();
        if (typeof window !== "undefined") window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function getUserIdFromToken(): string | null {
  const token = tokenUtils.getAccessToken();
  if (!token) return null;
  const decoded = tokenUtils.decodeToken(token);
  return decoded?.sub || null;
}

export const apiFormClient = axios.create({
  baseURL: API_URL,
  timeout: 7200000,
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
