"use client";

import { useAuthStore } from "@/store";
import type { Role } from "@/types";

export function usePermissions() {
  const { user, hasRole, hasPermission } = useAuthStore();

  const can = (permissionName: string): boolean => hasPermission(permissionName);

  const is = (roles: Role | Role[]): boolean => hasRole(roles);

  const isSuperAdmin = () => (user?.roles ?? []).includes("SUPER_ADMIN");
  const isNotario = () => (user?.roles ?? []).includes("NOTARIO");
  const isMatrizador = () => (user?.roles ?? []).includes("MATRIZADOR");
  const isArchivador = () => (user?.roles ?? []).includes("ARCHIVADOR");

  const canManageUsers = () => isSuperAdmin() || isNotario();
  const canCreateArchive = () =>
    isSuperAdmin() || isNotario() || isArchivador() || can("archives:create");
  const canEditArchive = () =>
    isSuperAdmin() || isNotario() || isArchivador();
  const canDeleteArchive = () => isSuperAdmin() || isNotario();
  const canViewSystemSettings = () => isSuperAdmin();
  const canCreateNews = () => isSuperAdmin();
  const canDeleteNews = () => isSuperAdmin();

  const primaryRole = (): Role | undefined => (user?.roles ?? [])[0];

  return {
    can,
    is,
    isSuperAdmin,
    isNotario,
    isMatrizador,
    isArchivador,
    canManageUsers,
    canCreateArchive,
    canEditArchive,
    canDeleteArchive,
    canViewSystemSettings,
    canCreateNews,
    canDeleteNews,
    primaryRole,
    user,
  };
}
