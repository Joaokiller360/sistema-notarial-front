"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store";
import { tokenUtils } from "@/utils/token";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

/**
 * Sesión única (la PRIMERA sesión gana): al cerrar la pestaña/navegador intenta
 * liberar la sesión con un POST /auth/logout best-effort. `sendBeacon` no admite
 * header `Authorization`, por eso `fetch` con `keepalive`. Si falla, la sesión
 * se libera sola tras ~15 min de inactividad (SESSION_IDLE_MINUTES en el back).
 *
 * ⚠️ `beforeunload`/`pagehide` NO distinguen "cerrar" de "recargar (F5)". Con
 * este hook activo, un F5 cierra la sesión en el servidor y la siguiente request
 * responde 401 -> el usuario vuelve a /login. Si eso no es aceptable, NO montar
 * este hook y dejar que la sesión caduque por inactividad (15 min).
 *
 * Se controla con NEXT_PUBLIC_LOGOUT_ON_UNLOAD ("true" para activarlo).
 */
const ENABLED = process.env.NEXT_PUBLIC_LOGOUT_ON_UNLOAD === "true";

export function useLogoutOnUnload() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!ENABLED || !isAuthenticated) return;

    const handler = () => {
      const accessToken = tokenUtils.getAccessToken();
      if (!accessToken) return;
      const refreshToken = tokenUtils.getRefreshToken() || "";
      try {
        fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refreshToken }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        /* best-effort */
      }
    };

    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [isAuthenticated]);
}
