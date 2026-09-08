"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { authService } from "@/services";
import { tokenUtils } from "@/utils/token";
import type { LoginRequest } from "@/types";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  // Sesión única: el backend responde 409 si ya hay una sesión activa del
  // usuario en otro dispositivo (la PRIMERA sesión gana). La UI de login lo
  // muestra como un aviso con botón "Reintentar".
  const [sessionConflict, setSessionConflict] = useState(false);
  const { setAuth, clearAuth, setUser, user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const login = async (credentials: LoginRequest) => {
    setSessionConflict(false);
    // Sesión única: si ya hay una sesión válida en este navegador, no permitir
    // un segundo login. Hay que cerrar sesión primero.
    const existing = tokenUtils.getAccessToken();
    if (isAuthenticated && existing && !tokenUtils.isTokenExpired(existing)) {
      toast.error(
        "Ya tienes una sesión activa. Cierra sesión antes de iniciar con otra cuenta."
      );
      router.push("/dashboard");
      return;
    }
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      setAuth(response.user, response.tokens);
      document.cookie = `notaria_access_token=${response.tokens.accessToken}; path=/; max-age=${response.tokens.expiresIn}; SameSite=Strict`;
      toast.success(`Bienvenido, ${response.user.firstName}`);
      // El MATRIZADOR "puro" aterriza en /forms; el resto en /dashboard.
      const roles = response.user.roles ?? [];
      const landing =
        roles.includes("MATRIZADOR") &&
        !roles.includes("SUPER_ADMIN") &&
        !roles.includes("NOTARIO")
          ? "/forms"
          : "/dashboard";
      router.push(landing);
    } catch (error: unknown) {
      const res = (error as { response?: { status?: number; data?: { message?: string } } })
        ?.response;
      const backendMsg = res?.data?.message;
      if (res?.status === 409) {
        // Sesión activa en otro dispositivo. No toast: la pantalla de login
        // muestra un aviso propio con botón "Reintentar" y conserva el formulario.
        setSessionConflict(true);
        throw error;
      }
      let message: string;
      if (res?.status === 403) {
        // Cuenta bloqueada por intentos fallidos (distinto del 401 de credenciales
        // y del 429 de rate-limit).
        message =
          backendMsg ||
          "Cuenta bloqueada por múltiples intentos fallidos. Contacta a un administrador o notario para desbloquearla.";
      } else if (res?.status === 429) {
        message = "Demasiadas solicitudes. Espera un momento e intenta de nuevo.";
      } else {
        message = backendMsg || "Credenciales incorrectas";
      }
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = tokenUtils.getRefreshToken();
    try {
      await authService.logout(refreshToken || undefined);
    } catch {
      // ignorar errores de logout en el servidor
    } finally {
      clearAuth();
      document.cookie =
        "notaria_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict";
      router.push("/login");
    }
  };

  const updateProfile = async (payload: {
    firstName: string;
    lastName: string;
  }) => {
    if (!user) return;
    setIsLoading(true);
    try {
      // /auth/me es self-service (solo requiere estar autenticado); PATCH /users/:id
      // exige el permiso users:update, que la mayoría de roles no tiene.
      const updated = await authService.updateMe(payload);
      setUser({
        ...user,
        ...updated,
        roles: updated.roles ?? user.roles,
        permissions: updated.permissions ?? user.permissions,
      });
      toast.success("Perfil actualizado correctamente");
      return updated;
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Error al actualizar el perfil";
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (payload: {
    currentPassword: string;
    newPassword: string;
  }) => {
    if (!user) return;
    setIsLoading(true);
    try {
      await authService.changePassword(payload);
      toast.success("Contraseña actualizada. Por seguridad debes iniciar sesión nuevamente.");
      clearAuth();
      document.cookie =
        "notaria_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict";
      router.push("/login");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Error al actualizar la contraseña";
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateProfile,
    changePassword,
    sessionConflict,
    clearSessionConflict: () => setSessionConflict(false),
  };
}
