"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FolderArchive, Users, UserRound, Plus, Newspaper, CalendarDays, ImageOff } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { useAuthStore } from "@/store";
import { archivesService, usersService, clientsService, newsService } from "@/services";
import type { News } from "@/types";

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
  const [latestNews, setLatestNews] = useState<News[]>([]);
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
        const [allArchives, allClients, allUsers, news] =
          await Promise.allSettled([
            archivesService.getAll({ page: 1, limit: 1 }),
            clientsService.getAll({ page: 1, limit: 1 }),
            usersService.getAll({ page: 1, limit: 1 }),
            newsService.getAll({ page: 1, limit: 3 }),
          ]);

        setStats({
          totalArchives:
            allArchives.status === "fulfilled" ? allArchives.value.total : 0,
          totalClients:
            allClients.status === "fulfilled" ? allClients.value.total : 0,
          totalUsers:
            allUsers.status === "fulfilled" ? allUsers.value.total : 0,
        });

        if (news.status === "fulfilled") {
          setLatestNews(news.value.data);
        }
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
    { label: "Ver Notificaciones", href: "/notifications", icon: Newspaper },
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
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-primary" />
              Últimas Noticias
            </h3>
            <Link
              href="/news"
              className="text-xs text-primary hover:underline font-medium"
            >
              Ver todas →
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3 flex-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-16 h-16 rounded-lg bg-muted shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-2 bg-muted/50 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : latestNews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center flex-1">
              <Newspaper className="w-10 h-10 text-muted-foreground/25 mb-3" />
              <p className="text-sm text-muted-foreground">No hay noticias disponibles aún.</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {latestNews.map((item) => (
                <Link
                  key={item.id}
                  href={`/news/${item.id}`}
                  className="flex gap-3 group hover:bg-muted/40 rounded-lg p-2 -mx-2 transition-colors"
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="64px"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff className="w-5 h-5 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground/60">
                      <CalendarDays className="w-3 h-3" />
                      <time dateTime={item.createdAt}>
                        {new Date(item.createdAt).toLocaleDateString("es-EC", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
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
