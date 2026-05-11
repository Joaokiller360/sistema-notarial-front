"use client";

import { useEffect, useRef } from "react";
import axios from "axios";
import { tokenUtils } from "@/utils/token";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

// Refresh this many ms before the access token expires
const REFRESH_BEFORE_MS = 5 * 60 * 1000; // 5 minutes

export function useTokenRefresh() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);

      const accessToken = tokenUtils.getAccessToken();
      if (!accessToken) return;

      const decoded = tokenUtils.decodeToken(accessToken);
      if (!decoded?.exp || !decoded?.sub) return;

      const msUntilExpiry = decoded.exp * 1000 - Date.now();
      const delay = Math.max(0, msUntilExpiry - REFRESH_BEFORE_MS);

      const doRefresh = async () => {
        const refreshToken = tokenUtils.getRefreshToken();
        const at = tokenUtils.getAccessToken();
        if (!refreshToken || !at) return;

        const sub = tokenUtils.decodeToken(at)?.sub;
        if (!sub) return;

        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, {
            userId: sub,
            refreshToken,
          });
          const data = res.data?.data || res.data;
          if (data?.accessToken && data?.refreshToken) {
            tokenUtils.setTokens(data.accessToken, data.refreshToken);
            scheduleRefresh();
          }
        } catch {
          // Refresh failed — the interceptor will handle the next 401 naturally
        }
      };

      timerRef.current = setTimeout(doRefresh, delay);
    };

    scheduleRefresh();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
