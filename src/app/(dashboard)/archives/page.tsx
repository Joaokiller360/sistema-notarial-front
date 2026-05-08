"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Filter, Eye, Pencil, Trash2,
  FolderArchive, FileCheck2, ClipboardList, BookOpen, FolderOpen, LayoutList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Pagination } from "@/components/common/Pagination";
import { useArchives, usePermissions } from "@/hooks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Archive, ArchiveStatus, ArchiveType } from "@/types";

const PAGE_LIMIT = 10;

const STATUS_OPTIONS: { value: ArchiveStatus | ""; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "ACTIVO", label: "Activo" },
  { value: "INACTIVO", label: "Inactivo" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "ARCHIVADO", label: "Archivado" },
];

interface TypeTab {
  value: ArchiveType | "";
  label: string;
  icon: React.ElementType;
  color: string;
}

const TYPE_TABS: TypeTab[] = [
  { value: "", label: "Todos",           icon: LayoutList,    color: "text-muted-foreground" },
  { value: "A", label: "Arrendamientos",        icon: FolderArchive, color: "text-primary" },
  { value: "C", label: "Certificaciones",icon: FileCheck2,    color: "text-emerald-400" },
  { value: "D", label: "Diligencias",    icon: ClipboardList, color: "text-blue-400" },
  { value: "P", label: "Protocolos",     icon: BookOpen,      color: "text-purple-400" },
  { value: "O", label: "Otros",          icon: FolderOpen,    color: "text-amber-400" },
];

const TYPE_LABELS: Record<ArchiveType, string> = {
  A: "Arrendamiento",
  C: "Certificación",
  D: "Diligencia",
  P: "Protocolo",
  O: "Otro",
};

const TYPE_COLORS: Record<ArchiveType, string> = {
  A: "bg-primary/10 text-primary border-primary/20",
  C: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  D: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  P: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  O: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function ArchivesPage() {
  const router = useRouter();
  const { archives, isLoading, fetchArchives, deleteArchive, clearArchives } = useArchives();
  const { canEditArchive, canDeleteArchive, canCreateArchive } = usePermissions();

  const [activeType, setActiveType] = useState<ArchiveType | "">("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ArchiveStatus | "">("");
  // serverPage: used when Todos (no type filter) — server paginates
  const [serverPage, setServerPage] = useState(1);
  // clientPage: used when a type tab is active — frontend paginates
  const [clientPage, setClientPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Always use standard server pagination. Type filtering is done client-side.
  // Never send `type` to the backend — it returns 400.
  const load = useCallback(() => {
    fetchArchives({
      search: search || undefined,
      status: status || undefined,
      page: serverPage,
      limit: PAGE_LIMIT,
    });
  }, [fetchArchives, search, status, serverPage]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  // Reset client page when type / search / status change
  useEffect(() => {
    setClientPage(1);
  }, [activeType, search, status]);

  const handleTabChange = (type: ArchiveType | "") => {
    clearArchives();
    setActiveType(type);
    setClientPage(1);
    setServerPage(1);
  };

  // Client-side filtering and pagination
  const filteredData = useMemo(() => {
    if (!archives?.data) return [];
    if (!activeType) return archives.data;
    return archives.data.filter((a) => a.type === activeType);
  }, [archives?.data, activeType]);

  const displayData = useMemo(() => {
    if (!activeType) return filteredData;
    const start = (clientPage - 1) * PAGE_LIMIT;
    return filteredData.slice(start, start + PAGE_LIMIT);
  }, [activeType, filteredData, clientPage]);

  const paginationInfo = useMemo(() => {
    if (!activeType) {
      if (!archives || archives.totalPages <= 1) return null;
      return {
        page: archives.page,
        totalPages: archives.totalPages,
        total: archives.total,
        limit: archives.limit,
        onPageChange: setServerPage,
      };
    }
    const total = filteredData.length;
    const totalPages = Math.ceil(total / PAGE_LIMIT);
    if (totalPages <= 1) return null;
    return {
      page: clientPage,
      totalPages,
      total,
      limit: PAGE_LIMIT,
      onPageChange: setClientPage,
    };
  }, [activeType, archives, filteredData, clientPage]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteArchive(deleteId);
    setDeleteId(null);
    load();
  };

  const newHref = activeType ? `/archives/new?type=${activeType}` : "/archives/new";

  const columns: Column<Archive>[] = [
    {
      key: "code",
      label: "Código",
      render: (row) => (
        <span className="font-mono text-sm font-semibold text-primary">{row.code}</span>
      ),
    },
    {
      key: "type",
      label: "Tipo",
      render: (row) =>
        row.type ? (
          <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[row.type])}>
            {TYPE_LABELS[row.type]}
          </Badge>
        ) : null,
    },
    {
      key: "grantors",
      label: "Otorgantes",
      render: (row) => (
        <div className="max-w-48">
          {row.grantors.slice(0, 2).map((g, i) => (
            <p key={i} className="text-sm truncate">{g.nombresCompletos}</p>
          ))}
          {row.grantors.length > 2 && (
            <p className="text-xs text-muted-foreground">+{row.grantors.length - 2} más</p>
          )}
        </div>
      ),
    },
    {
      key: "beneficiaries",
      label: "A favor de",
      render: (row) => (
        <div className="max-w-48">
          {row.beneficiaries.slice(0, 2).map((b, i) => (
            <p key={i} className="text-sm truncate">{b.nombresCompletos}</p>
          ))}
          {row.beneficiaries.length > 2 && (
            <p className="text-xs text-muted-foreground">+{row.beneficiaries.length - 2} más</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      label: "Fecha",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.createdAt), "dd MMM yyyy", { locale: es })}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/archives/${row.id}`)}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          {canEditArchive() && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push(`/archives/${row.id}/edit`)}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          {canDeleteArchive() && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => setDeleteId(row.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Archivos Notariales"
        description="Gestión y consulta de archivos del sistema"
      >
        {canCreateArchive() && (
          <ButtonLink href={newHref}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo{activeType ? ` ${TYPE_LABELS[activeType]}` : " Archivo"}
          </ButtonLink>
        )}
      </PageHeader>

      {/* Type tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-0 scrollbar-none">
        {TYPE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeType === tab.value;
          return (
            <button
              key={tab.value || "__all__"}
              onClick={() => handleTabChange(tab.value as ArchiveType | "")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive ? tab.color : "")} />
              {tab.label}
              {activeType === tab.value && tab.value && filteredData.length > 0 && (
                <span className="ml-1 text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-mono">
                  {filteredData.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nombre o cédula..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setServerPage(1); }}
          />
        </div>
        <Select
          value={status || "__all__"}
          onValueChange={(v) => { setStatus(v === "__all__" ? "" : v as ArchiveStatus); setServerPage(1); }}
        >
          <SelectTrigger className="w-48">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <DataTable
          columns={columns}
          data={displayData}
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          emptyTitle={activeType ? `No hay ${TYPE_LABELS[activeType].toLowerCase()}s` : "No hay archivos"}
          emptyDescription={
            activeType
              ? `Crea el primer ${TYPE_LABELS[activeType].toLowerCase()} para comenzar.`
              : "Crea tu primer archivo notarial para comenzar."
          }
        />
        {paginationInfo && (
          <Pagination
            page={paginationInfo.page}
            totalPages={paginationInfo.totalPages}
            total={paginationInfo.total}
            limit={paginationInfo.limit}
            onPageChange={paginationInfo.onPageChange}
          />
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El archivo será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
