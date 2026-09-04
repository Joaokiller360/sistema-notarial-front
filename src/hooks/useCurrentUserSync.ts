"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store";
import { authService } from "@/services";

/**
 * Refresca el usuario autenticado desde `/auth/me` al montar el dashboard.
 * Mantiene al día banderas que un administrador puede cambiar en caliente
 * (p. ej. `pdfDownloadDisabled`) sin obligar al usuario a cerrar sesión.
 */
export function useCurrentUserSync() {
  const { user, isAuthenticated, setUser } = useAuthStore();
  const userId = user?.id;

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    let cancelled = false;

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
        // silencioso: si falla, se conserva el usuario en caché
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId, setUser]);
}
