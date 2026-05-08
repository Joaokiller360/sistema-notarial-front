"use client";

import { useAuthStore } from "@/store";
import type { Role } from "@/types";

interface RoleGuardProps {
  children: React.ReactNode;
  roles?: Role[];
  action?: string;
  resource?: string;
  fallback?: React.ReactNode;
}

export function RoleGuard({
  children,
  roles,
  action,
  resource,
  fallback = null,
}: RoleGuardProps) {
  const { hasRole, hasPermission } = useAuthStore();

  if (roles && roles.length > 0 && !hasRole(roles)) {
    return <>{fallback}</>;
  }

  if (action && resource && !hasPermission(`${action}:${resource}`)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
