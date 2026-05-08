"use client";

import { FolderArchive, Users, CheckCircle, Clock } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { useAuthStore } from "@/store";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  NOTARIO: "Notario",
  MATRIZADOR: "Matrizador",
  ARCHIVADOR: "Archivador",
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting()}, ${user?.firstName || "Usuario"}`}
        description={`Panel de control · ${ROLE_LABELS[user?.roles?.[0] || ""] || "Sin rol"}`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Archivos"
          value="—"
          description="Registros en el sistema"
          icon={FolderArchive}
        />
        <StatCard
          title="Archivos Activos"
          value="—"
          description="En estado activo"
          icon={CheckCircle}
        />
        <StatCard
          title="Pendientes"
          value="—"
          description="Requieren atención"
          icon={Clock}
        />
        <StatCard
          title="Usuarios"
          value="—"
          description="Usuarios registrados"
          icon={Users}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Actividad Reciente
          </h3>
          <div className="space-y-3">
            {[
              { text: "Sistema listo para producción", time: "Ahora" },
              { text: "Conecta tu backend NestJS para ver datos reales", time: "" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{item.text}</p>
                  {item.time && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Accesos Rápidos
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Nuevo Archivo", href: "/archives/new", icon: FolderArchive },
              { label: "Ver Archivos", href: "/archives", icon: FolderArchive },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-accent transition-all text-sm text-foreground"
              >
                <item.icon className="w-4 h-4 text-primary" />
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
