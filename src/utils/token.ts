import { jwtDecode } from "jwt-decode";
import type { JwtPayload } from "@/types";

const ACCESS_TOKEN_KEY = "notaria_access_token";
const REFRESH_TOKEN_KEY = "notaria_refresh_token";

export const tokenUtils = {
  getAccessToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  clearTokens: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  isTokenExpired: (token: string): boolean => {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  },

  decodeToken: (token: string): JwtPayload | null => {
    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      return null;
    }
  },
};
