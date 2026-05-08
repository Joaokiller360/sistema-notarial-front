"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  archives: "Archivos",
  new: "Nuevo",
  edit: "Editar",
  users: "Usuarios",
  settings: "Configuración",
  profile: "Mi Perfil",
  security: "Seguridad",
  system: "Sistema",
};

interface Crumb {
  label: string;
  href: string;
  isLast: boolean;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: Crumb[] = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const isId = /^[0-9a-f-]{8,}$/i.test(segment);
    const label = isId
      ? "Detalle"
      : ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

    return {
      label,
      href,
      isLast: index === segments.length - 1,
    };
  });

  return (
    <nav className="flex items-center gap-1 text-sm">
      <Link
        href="/dashboard"
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-colors"
              )}
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
