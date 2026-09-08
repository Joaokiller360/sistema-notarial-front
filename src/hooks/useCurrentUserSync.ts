"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store";
import { authService } from "@/services";

/**
 * Refresca el usuario autenticado desde `/auth/me`:
 *  - al montar el dashboard,
 *  - al volver el foco a la pestaña,
 *  - cada 45 s mientras la pestaña está visible.
 *
 * Sirve para dos cosas:
 *  1. Mantener al día banderas que un admin puede cambiar en caliente
 *     (p. ej. `pdfDownloadDisabled`) sin obligar a cerrar sesión.
 *  2. Sesión única: si el backend cortó esta sesión (login en otro dispositivo),
 *     esta request devuelve 401 y el interceptor de axios limpia la sesión y
 *     redirige a /login. Sin este sondeo, un tab viejo inactivo seguiría
 *     "logueado" en pantalla hasta la próxima acción del usuario.
 */
const SYNC_INTERVAL_MS = 45_000;

export function useCurrentUserSync() {
  const { user, isAuthenticated, setUser } = useAuthStore();
  const userId = user?.id;

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    let cancelled = false;

    const sync = () => {
      if (cancelled || document.visibilityState === "hidden") return;
      authService
        .getMe()
        .then((fresh) => {
          if (cancelled) return;
          const current = useAuthStore.getState().user;
          if (!current || current.id !== fresh.id) return;

          const raw = fresh as typeof fresh & { canDownloadPdf?: boolean };
          const pdfDownloadDisabled =
            typeof raw.pdfDownloadDisabled === "boolean"
              ? raw.pdfDownloadDisabled
              : typeof raw.canDownloadPdf === "boolean"
                ? !raw.canDownloadPdf
                : current.pdfDownloadDisabled;

          setUser({
            ...current,
            ...fresh,
            roles: fresh.roles ?? current.roles,
            permissions: fresh.permissions ?? current.permissions,
            pdfDownloadDisabled,
          });
        })
        .catch(() => {
          // silencioso: un 401 de sesión única ya lo maneja el interceptor de
          // axios (limpia sesión + redirige). Otros errores no son fatales.
        });
    };

    sync();

    const onFocus = () => sync();
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(sync, SYNC_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [isAuthenticated, userId, setUser]);
}
