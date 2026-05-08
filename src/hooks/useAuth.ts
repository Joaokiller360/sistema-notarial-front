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
  const { setAuth, clearAuth, user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      setAuth(response.user, response.tokens);
      document.cookie = `notaria_access_token=${response.tokens.accessToken}; path=/; max-age=${response.tokens.expiresIn}`;
      toast.success(`Bienvenido, ${response.user.firstName}`);
      router.push("/dashboard");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Credenciales incorrectas";
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
        "notaria_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      router.push("/login");
    }
  };

  const changePassword = async (payload: {
    currentPassword: string;
    newPassword: string;
  }) => {
    setIsLoading(true);
    try {
      await authService.changePassword(payload);
      toast.success("Contraseña actualizada correctamente");
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
    changePassword,
  };
}
