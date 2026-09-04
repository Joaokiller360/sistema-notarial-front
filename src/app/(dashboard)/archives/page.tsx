"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Filter, Eye, Pencil, Trash2, FileText, ExternalLink, Download, Ban,
  FolderArchive, FileCheck2, ClipboardList, BookOpen, FolderOpen, LayoutList, AlertCircle, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { NacionalidadSelect } from "@/components/common/NacionalidadSelect";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Pagination } from "@/components/common/Pagination";
import { useArchives, usePermissions } from "@/hooks";
import { useCreatingArchivesStore } from "@/store";
import { archivesService } from "@/services";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

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
  { value: "", label: "Todos", icon: LayoutList, color: "text-muted-foreground" },
  { value: "A", label: "Arrendamientos", icon: FolderArchive, color: "text-primary" },
  { value: "C", label: "Certificaciones", icon: FileCheck2, color: "text-emerald-400" },
  { value: "D", label: "Diligencias", icon: ClipboardList, color: "text-blue-400" },
  { value: "P", label: "Protocolos", icon: BookOpen, color: "text-purple-400" },
  { value: "O", label: "Otros", icon: FolderOpen, color: "text-amber-400" },
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
  const { archives, isLoading, isError, fetchAllArchives, deleteArchive, clearArchives } = useArchives();
  const { canEditArchive, canDeleteArchive, canCreateArchive, user } = usePermissions();
  const pdfRestricted = !!user?.pdfDownloadDisabled;
  const creatingCodes = useCreatingArchivesStore((s) => s.codes);

  const [activeType, setActiveType] = useState<ArchiveType | "">("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ArchiveStatus | "">("");
  const [nacionalidad, setNacionalidad] = useState("");
  const [clientPage, setClientPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Detail modal (todo)
  const [detailArchive, setDetailArchive] = useState<Archive | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // PDF-only modal
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfViewUrl, setPdfViewUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState("documento.pdf");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  const openDetail = async (row: Archive) => {
    setDetailArchive(row);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const full = await archivesService.getById(row.id);
      setDetailArchive(full);
    } catch {
      // keep row data as fallback
    } finally {
      setDetailLoading(false);
    }
  };

  const resolvePdfKey = async (row: Archive): Promise<string | null> => {
    if (row.pdfUrl) return row.pdfUrl;
    try {
      const full = await archivesService.getById(row.id);
      return full.pdfUrl ?? null;
    } catch {
      return null;
    }
  };

  const openPdf = async (row: Archive) => {
    if (creatingCodes.includes(row.code)) {
      toast.info("El archivo aún se está creando. Espera a que termine.");
      return;
    }
    setPdfOpen(true);
    setPdfViewUrl(null);
    setPdfName(row.pdfFileName || "documento.pdf");
    setPdfLoading(true);
    try {
      const key = await resolvePdfKey(row);
      if (!key) {
        toast.error("Este archivo no tiene documento adjunto");
        setPdfOpen(false);
        return;
      }
      const url = await archivesService.getPdfUrl(key);
      setPdfViewUrl(url);
    } catch {
      toast.error("No se pudo cargar el documento");
      setPdfOpen(false);
    } finally {
      setPdfLoading(false);
    }
  };

  const downloadPdf = async (row: Archive) => {
    if (pdfRestricted) {
      toast.error("Descarga deshabilitada para tu usuario");
      return;
    }
    setPdfDownloading(true);
    try {
      const key = await resolvePdfKey(row);
      if (!key) {
        toast.error("Este archivo no tiene documento adjunto");
        return;
      }
      const blob = await archivesService.downloadPdf(key);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = row.pdfFileName || "documento.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch {
      toast.error("No se pudo descargar el documento");
    } finally {
      setPdfDownloading(false);
    }
  };

  const load = useCallback(() => {
    fetchAllArchives({ status: status || undefined });
  }, [fetchAllArchives, status]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  // Reset client page when type / search / status change
  useEffect(() => {
    setClientPage(1);
  }, [activeType, search, status, nacionalidad, pageSize]);

  // Block print / save shortcuts while a restricted user has a PDF open
  useEffect(() => {
    if (!pdfRestricted || (!pdfOpen && !detailOpen)) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (k === "p" || k === "s")) {
        e.preventDefault();
        e.stopPropagation();
        toast.error("Impresión y descarga deshabilitadas para tu usuario");
      }
    };
    const onBeforePrint = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("beforeprint", onBeforePrint);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("beforeprint", onBeforePrint);
    };
  }, [pdfRestricted, pdfOpen, detailOpen]);

  const handleTabChange = (type: ArchiveType | "") => {
    setActiveType(type);
    setClientPage(1);
  };

  // Client-side filtering and pagination
  const filteredData = useMemo(() => {
    if (!archives?.data) return [];
    let data = archives.data;

    if (activeType) {
      data = data.filter((a) => a.type === activeType);
    }

    if (nacionalidad) {
      data = data.filter(
        (a) =>
          a.grantors.some((g) => g.nacionalidad === nacionalidad) ||
          a.beneficiaries.some((b) => b.nacionalidad === nacionalidad)
      );
    }

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (a) =>
          a.code.toLowerCase().includes(q) ||
          a.grantors.some(
            (g) =>
              g.nombresCompletos.toLowerCase().includes(q) ||
              (g.cedulaORuc ?? "").toLowerCase().includes(q)
          ) ||
          a.beneficiaries.some(
            (b) =>
              b.nombresCompletos.toLowerCase().includes(q) ||
              (b.cedulaORuc ?? "").toLowerCase().includes(q)
          )
      );
    }

    data = data.slice().sort((a, b) => {
      const yearA = parseInt(a.code.substring(0, 4), 10) || 0;
      const yearB = parseInt(b.code.substring(0, 4), 10) || 0;
      return yearB - yearA;
    });

    return data;
  }, [archives?.data, activeType, search, nacionalidad]);

  const displayData = useMemo(() => {
    const start = (clientPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, clientPage, pageSize]);

  const paginationInfo = useMemo(() => {
    const total = filteredData.length;
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) return null;
    return {
      page: clientPage,
      totalPages,
      total,
      limit: pageSize,
      onPageChange: setClientPage,
    };
  }, [activeType, search, archives, filteredData, clientPage, pageSize]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteArchive(deleteId);
      setDeleteId(null);
      load();
    } catch {
      // error already shown by hook — keep dialog open so user sees it failed
    } finally {
      setIsDeleting(false);
    }
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
      render: (row) => {
       const isCreating = creatingCodes.includes(row.code);
       return (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            title="Ver todo"
            onClick={() => openDetail(row)}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            title={isCreating ? "Creando archivo…" : "Ver PDF"}
            disabled={isCreating}
            onClick={() => openPdf(row)}
          >
            <FileText className="w-3.5 h-3.5" />
          </Button>
          {canEditArchive() && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => router.push(`/archives/${row.id}/edit`)}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          {canDeleteArchive() && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive cursor-pointer"
              onClick={() => setDeleteId(row.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
       );
      },
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
      <div className="flex bg-card rounded-xl items-center gap-1 border border-border overflow-x-auto pb-0 scrollbar-none">
        {TYPE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeType === tab.value;
          return (
            <button
              key={tab.value || "Todos"}
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
            onChange={(e) => { setSearch(e.target.value); setClientPage(1); }}
          />
        </div>
        <div className="w-full sm:w-56">
          <NacionalidadSelect
            value={nacionalidad}
            onChange={setNacionalidad}
          />
        </div>
        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                Mostrar {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {!isLoading && isError ? (
          <div className="bg-card rounded-lg border border-destructive/30 flex flex-col items-center justify-center gap-3 py-16">
            <AlertCircle className="w-10 h-10 text-destructive/60" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Error al cargar los archivos</p>
              <p className="text-xs text-muted-foreground mt-1">El servidor no pudo procesar la solicitud</p>
            </div>
            <button
              onClick={load}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar
            </button>
          </div>
        ) : (
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
        )}
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!isDeleting) setDeleteId(open ? deleteId : null); }}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este archivo? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive cursor-pointer text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Eliminando...
                </span>
              ) : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail modal — todo */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-white sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-primary">{detailArchive?.code}</span>
              {detailArchive?.type && (
                <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[detailArchive.type])}>
                  {TYPE_LABELS[detailArchive.type]}
                </Badge>
              )}
              {detailArchive?.status && <StatusBadge status={detailArchive.status} />}
            </DialogTitle>
            <DialogDescription>
              {detailArchive &&
                `Creado el ${format(new Date(detailArchive.createdAt), "dd/MM/yyyy HH:mm")}`}
            </DialogDescription>
          </DialogHeader>

          {detailArchive && (
            <div className="space-y-5 text-sm">
              {detailArchive.observations && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Observaciones</p>
                  <p className="break-words">{detailArchive.observations}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Otorgantes ({detailArchive.grantors.length})
                </p>
                <div className="space-y-2">
                  {detailArchive.grantors.map((g, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border bg-muted/20 grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Nombre</p>
                        <p className="break-words">{g.nombresCompletos}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cédula/RUC</p>
                        <p className="font-mono break-all">{g.cedulaORuc}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Nacionalidad</p>
                        <p className="break-words">{g.nacionalidad}</p>
                      </div>
                    </div>
                  ))}
                  {detailArchive.grantors.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sin otorgantes</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  A favor de ({detailArchive.beneficiaries.length})
                </p>
                <div className="space-y-2">
                  {detailArchive.beneficiaries.map((b, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border bg-muted/20 grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Nombre</p>
                        <p className="break-words">{b.nombresCompletos}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cédula/RUC</p>
                        <p className="font-mono break-all">{b.cedulaORuc}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Nacionalidad</p>
                        <p className="break-words">{b.nacionalidad}</p>
                      </div>
                    </div>
                  ))}
                  {detailArchive.beneficiaries.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sin beneficiarios</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                {detailArchive.createdBy && (
                  <div>
                    <p className="text-xs text-muted-foreground">Creado por</p>
                    <p>{detailArchive.createdBy.firstName} {detailArchive.createdBy.lastName}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Actualizado</p>
                  <p>{format(new Date(detailArchive.updatedAt), "dd/MM/yyyy HH:mm")}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => detailArchive && openPdf(detailArchive)}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Ver PDF
                </Button>
                {!pdfRestricted && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    disabled={pdfDownloading}
                    onClick={() => detailArchive && downloadPdf(detailArchive)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Descargar
                  </Button>
                )}
                {pdfRestricted && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground self-center">
                    <Ban className="w-3.5 h-3.5 text-destructive" />
                    Descarga e impresión deshabilitadas para tu usuario
                  </span>
                )}
                {detailLoading && (
                  <span className="text-xs text-muted-foreground self-center">Cargando detalles…</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF-only modal */}
      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="bg-white sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="truncate">{pdfName}</span>
            </DialogTitle>
          </DialogHeader>
          <div
            className="h-[75vh] w-full rounded-lg border border-border bg-muted/20 overflow-hidden"
            onContextMenu={(e) => { if (pdfRestricted) e.preventDefault(); }}
          >
            {pdfLoading ? (
              <div className="flex h-full items-center justify-center">
                <span className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pdfViewUrl ? (
              <iframe
                src={pdfRestricted ? `${pdfViewUrl}#toolbar=0&navpanes=0` : pdfViewUrl}
                title={pdfName}
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sin documento
              </div>
            )}
          </div>
          {pdfViewUrl && (
            <div className="flex justify-end">
              {pdfRestricted ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Ban className="w-3.5 h-3.5 text-destructive" />
                  Descarga e impresión deshabilitadas para tu usuario
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => window.open(pdfViewUrl, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Abrir en pestaña nueva
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
