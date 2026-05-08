"use client";

import { useAuthStore } from "@/store";
import type { Role } from "@/types";

export function usePermissions() {
  const { user, hasRole, hasPermission } = useAuthStore();

  const can = (permissionName: string): boolean => hasPermission(permissionName);

  const is = (roles: Role | Role[]): boolean => hasRole(roles);

  const isSuperAdmin = () => user?.roles.includes("SUPER_ADMIN") ?? false;
  const isNotario = () => user?.roles.includes("NOTARIO") ?? false;
  const isMatrizador = () => user?.roles.includes("MATRIZADOR") ?? false;
  const isArchivador = () => user?.roles.includes("ARCHIVADOR") ?? false;

  const canManageUsers = () => isSuperAdmin() || isNotario();
  const canCreateArchive = () =>
    isSuperAdmin() || isNotario() || isMatrizador() || can("archives:create");
  const canEditArchive = () =>
    isSuperAdmin() || isNotario() || isMatrizador();
  const canDeleteArchive = () => isSuperAdmin() || isNotario();
  const canViewSystemSettings = () => isSuperAdmin();

  const primaryRole = (): Role | undefined => user?.roles[0];

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
    primaryRole,
    user,
  };
}
