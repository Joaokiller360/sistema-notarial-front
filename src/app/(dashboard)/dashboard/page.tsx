"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderArchive, Users, UserRound, Plus, Newspaper } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { useAuthStore } from "@/store";
import { archivesService, usersService, clientsService } from "@/services";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  NOTARIO: "Notario",
  MATRIZADOR: "Matrizador",
  ARCHIVADOR: "Archivador",
};

interface Stats {
  totalArchives: number;
  totalClients: number;
  totalUsers: number;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        const [allArchives, allClients, allUsers] =
          await Promise.allSettled([
            archivesService.getAll({ page: 1, limit: 1 }),
            clientsService.getAll({ page: 1, limit: 1 }),
            usersService.getAll({ page: 1, limit: 1 }),
          ]);

        setStats({
          totalArchives:
            allArchives.status === "fulfilled" ? allArchives.value.total : 0,
          totalClients:
            allClients.status === "fulfilled" ? allClients.value.total : 0,
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
    { label: "Clientes", href: "/clients", icon: UserRound },
    { label: "Usuarios", href: "/users", icon: Users },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting()}, ${displayName}`}
        description={`Panel de control · ${ROLE_LABELS[user?.roles?.[0] || ""] || "Sin rol"}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Total de Archivos"
          value={stats?.totalArchives ?? "—"}
          description="Registros en el sistema"
          icon={FolderArchive}
          isLoading={isLoading}
        />
        <StatCard
          title="Total de Clientes"
          value={stats?.totalClients ?? "—"}
          description="Otorgantes y beneficiarios"
          icon={UserRound}
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
        {/* Noticias */}
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-primary" />
              Noticias
            </h3>
            <Link
              href="/news"
              className="text-xs text-primary hover:underline font-medium"
            >
              Ver Noticias →
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center py-10 text-center flex-1">
            <Newspaper className="w-10 h-10 text-muted-foreground/25 mb-3" />
            <p className="text-sm text-muted-foreground">No hay noticias disponibles aún.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Próximamente encontrarás actualizaciones del sistema aquí.
            </p>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Accesos Rápidos
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-all text-sm text-foreground"
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
