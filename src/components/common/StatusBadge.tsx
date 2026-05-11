import { Badge } from "@/components/ui/badge";
import type { ArchiveStatus } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  ArchiveStatus,
  { label: string; className: string }
> = {
  ACTIVO: {
    label: "Activo",
    className: "bg-[#1D2C49]/15 text-[#1D2C49] border-[#1D2C49]/25",
  },
  INACTIVO: {
    label: "Inactivo",
    className: "bg-[#1D2C49]/5 text-[#1D2C49]/50 border-[#1D2C49]/10",
  },
  PENDIENTE: {
    label: "Pendiente",
    className: "bg-[#1D2C49]/10 text-[#1D2C49] border-[#1D2C49]/20",
  },
  ARCHIVADO: {
    label: "Archivado",
    className: "bg-[#1D2C49] text-white border-[#1D2C49]",
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
