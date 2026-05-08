import { Badge } from "@/components/ui/badge";
import type { ArchiveStatus } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  ArchiveStatus,
  { label: string; className: string }
> = {
  ACTIVO: {
    label: "Activo",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  INACTIVO: {
    label: "Inactivo",
    className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  },
  PENDIENTE: {
    label: "Pendiente",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  ARCHIVADO: {
    label: "Archivado",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
};

interface StatusBadgeProps {
  status?: ArchiveStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null;
  const config = STATUS_CONFIG[status] || {
    label: status,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className, className)}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 inline-block" />
      {config.label}
    </Badge>
  );
}
