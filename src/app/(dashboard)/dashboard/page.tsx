"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderArchive, Users, CheckCircle, Clock, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { useAuthStore } from "@/store";
import { archivesService, usersService } from "@/services";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  NOTARIO: "Notario",
  MATRIZADOR: "Matrizador",
  ARCHIVADOR: "Archivador",
};

interface Stats {
  totalArchives: number;
  activeArchives: number;
  pendingArchives: number;
  totalUsers: number;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Robust name: handles firstName, first_name, or email fallback
  const displayName =
    user?.firstName ||
    (user as unknown as Record<string, string>)?.first_name ||
    user?.email?.split("@")[0] ||
    "Usuario";

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const [allArchives, activeArchives, pendingArchives, allUsers] =
          await Promise.allSettled([
            archivesService.getAll({ page: 1, limit: 1 }),
            archivesService.getAll({ status: "ACTIVO", page: 1, limit: 1 }),
            archivesService.getAll({ status: "PENDIENTE", page: 1, limit: 1 }),
            usersService.getAll({ page: 1, limit: 1 }),
          ]);

        setStats({
          totalArchives:
            allArchives.status === "fulfilled" ? allArchives.value.total : 0,
          activeArchives:
            activeArchives.status === "fulfilled"
              ? activeArchives.value.total
              : 0,
          pendingArchives:
            pendingArchives.status === "fulfilled"
              ? pendingArchives.value.total
              : 0,
          totalUsers:
            allUsers.status === "fulfilled" ? allUsers.value.total : 0,
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const quickLinks = [
    { label: "Nuevo Archivo", href: "/archives/new", icon: Plus },
    { label: "Ver Archivos", href: "/archives", icon: FolderArchive },
    { label: "Clientes", href: "/clients", icon: Users },
    { label: "Usuarios", href: "/users", icon: Users },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting()}, ${displayName}`}
        description={`Panel de control · ${ROLE_LABELS[user?.roles?.[0] || ""] || "Sin rol"}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          title="Total de Archivos"
          value={stats?.totalArchives ?? "—"}
          description="Registros en el sistema"
          icon={FolderArchive}
          isLoading={isLoading}
        />
        <StatCard
          title="Archivos Activos"
          value={stats?.activeArchives ?? "—"}
          description="En estado activo"
          icon={CheckCircle}
          isLoading={isLoading}
        />
        <StatCard
          title="Pendientes"
          value={stats?.pendingArchives ?? "—"}
          description="Requieren atención"
          icon={Clock}
          isLoading={isLoading}
        />
        <StatCard
          title="Usuarios"
          value={stats?.totalUsers ?? "—"}
          description="Usuarios registrados"
          icon={Users}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity placeholder */}
        <div className="rounded-lg border border-border bg-sidebar/50 p-6">
          <h3 className="text-xl font-semibold mb-4">
            Resumen
          </h3>
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 rounded bg-muted/30 animate-pulse" />
              ))
            ) : (
              [
                {
                  text: `${stats?.totalArchives ?? 0} archivos registrados en el sistema`,
                  sub: `${stats?.activeArchives ?? 0} activos · ${stats?.pendingArchives ?? 0} pendientes`,
                },
                {
                  text: `${stats?.totalUsers ?? 0} usuarios con acceso`,
                  sub: user?.roles?.[0]
                    ? `Tu rol: ${ROLE_LABELS[user.roles[0]] || user.roles[0]}`
                    : "",
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-md text-foreground">{item.text}</p>
                    {item.sub && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.sub}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick links — use Next.js Link to avoid full-page reload */}
        <div className="rounded-lg border border-border bg-sidebar/50 p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Accesos Rápidos
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-sidebar/50 transition-all text-sm text-foreground"
              >
                <item.icon className="w-4 h-4 text-primary" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
