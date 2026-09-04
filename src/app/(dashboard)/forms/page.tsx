"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Plus, Search, ClipboardList, Eye, Trash2, User2, FileText, Star,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Pagination } from "@/components/common/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { NacionalidadSelect } from "@/components/common/NacionalidadSelect";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FORM_TEMPLATES } from "@/lib/form-templates";
import { uafeFormsService, type UafeForm } from "@/services";

const ACTO_LABEL: Record<string, string> = {
  compraventa_inmueble: "Compraventa de inmueble",
  compraventa_vehiculo: "Compraventa de vehículo",
  promesa_compraventa: "Promesa de compraventa",
  permuta: "Permuta",
  donacion: "Donación",
  cesion_derechos: "Cesión de derechos",
  hipoteca: "Constitución de hipoteca",
  cancelacion_hipoteca: "Cancelación de hipoteca",
  mutuo: "Contrato de mutuo",
  reconocimiento_deuda: "Reconocimiento de deuda",
  acuerdo_pago: "Acuerdo de pago",
  constitucion_compania: "Constitución de compañía",
  aumento_capital: "Aumento de capital",
  fideicomiso: "Constitución de fideicomiso",
  liquidacion_conyugal: "Liquidación de sociedad conyugal",
  adjudicacion_bienes: "Adjudicación de bienes",
  otro: "Otro",
};

// Nivel de alerta / vulnerabilidad → colores
const RIESGO_UI: Record<
  string,
  { label: string; dot: string; text: string; bar: string }
> = {
  "": { label: "Sin evaluar", dot: "bg-zinc-400", text: "text-zinc-500", bar: "border-l-zinc-300" },
  bajo: { label: "Bajo", dot: "bg-emerald-500", text: "text-emerald-600", bar: "border-l-emerald-500" },
  medio: { label: "Medio", dot: "bg-amber-500", text: "text-amber-600", bar: "border-l-amber-500" },
  alto: { label: "Alto", dot: "bg-orange-500", text: "text-orange-600", bar: "border-l-orange-500" },
  critico: { label: "Crítico", dot: "bg-red-500", text: "text-red-600", bar: "border-l-red-500" },
};
const riesgoUi = (n: string) => RIESGO_UI[n] ?? RIESGO_UI[""];

const TRAMITE_BADGE: Record<string, string> = {
  protocolo: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  diligencia: "bg-blue-500/10 text-blue-500 border-blue-500/30",
};

const PAGE_LIMIT = 15;

export default function FormsPage() {
  const router = useRouter();

  const [items, setItems] = useState<UafeForm[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [natFilter, setNatFilter] = useState("");
  const [riesgoFilter, setRiesgoFilter] = useState("");
  const [page, setPage] = useState(1);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await uafeFormsService.getAll({
        page,
        limit: PAGE_LIMIT,
        search: search.trim() || undefined,
        nacionalidad: natFilter || undefined,
        nivelRiesgo: (riesgoFilter as "" | "bajo" | "medio" | "alto" | "critico") || undefined,
      });
      setItems(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      toast.error("No se pudieron cargar los formularios");
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce de búsqueda + refetch cuando cambian filtros/página
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, natFilter, riesgoFilter]);

  const [deleteTarget, setDeleteTarget] = useState<UafeForm | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await uafeFormsService.delete(deleteTarget.id);
      toast.success("Formulario UAFE eliminado");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("No se pudo eliminar el formulario");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<UafeForm>[] = [
    {
      key: "nivel",
      label: "Nivel",
      render: (row) => {
        const r = riesgoUi(row.data.nivelRiesgo);
        return (
          <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", r.text)}>
            <span className={cn("w-2.5 h-2.5 rounded-full", r.dot)} />
            {r.label}
          </span>
        );
      },
    },
    {
      key: "compareciente",
      label: "Compareciente",
      render: (row) => {
        const r = riesgoUi(row.data.nivelRiesgo);
        return (
          <div className={cn("max-w-sm border-l-4 pl-3", r.bar)}>
            <p className="text-sm font-semibold text-foreground">
              {row.data.nombres || "— Sin nombre —"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {row.data.tipoPersona === "juridica" ? "Persona jurídica" : "Persona natural"}
              {row.data.numeroId ? ` · ${row.data.numeroId}` : ""}
              {row.data.nacionalidad ? ` · ${row.data.nacionalidad}` : ""}
            </p>
          </div>
        );
      },
    },
    {
      key: "template",
      label: "Plantilla",
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.templateName || "UAFE"}</span>
      ),
    },
    {
      key: "acto",
      label: "Acto / trámite",
      render: (row) => (
        <Badge
          variant="outline"
          className={cn("text-xs", TRAMITE_BADGE[row.data.tipoTramite])}
        >
          {ACTO_LABEL[row.data.actoContrato] ||
            (row.data.tipoTramite === "protocolo"
              ? "Protocolo"
              : row.data.tipoTramite === "diligencia"
                ? "Diligencia"
                : "—")}
        </Badge>
      ),
    },
    {
      key: "filledBy",
      label: "Llenado por",
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <User2 className="w-3.5 h-3.5" />
          {row.filledByName}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Fecha",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.createdAt), "dd MMM yyyy HH:mm", { locale: es })}
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
            className="h-8 w-8 cursor-pointer"
            onClick={() => router.push(`/forms/uafe/${row.id}`)}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive cursor-pointer"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Formularios"
        description="Formularios notariales — debida diligencia UAFE (Conozca a su cliente)"
      >
        <Button className="cursor-pointer" onClick={() => setTemplateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo formulario
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por compareciente, identificación o quien llenó..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-full sm:w-56">
          <NacionalidadSelect
            value={natFilter}
            onChange={(v) => {
              setNatFilter(v);
              setPage(1);
            }}
          />
        </div>
        <select
          value={riesgoFilter}
          onChange={(e) => {
            setRiesgoFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 w-full sm:w-48 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="">Todos los niveles de riesgo</option>
          <option value="bajo">Bajo</option>
          <option value="medio">Medio</option>
          <option value="alto">Alto</option>
          <option value="critico">Crítico</option>
        </select>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <DataTable
            columns={columns}
            data={items}
            keyExtractor={(row) => row.id}
            emptyTitle="No hay formularios"
            emptyDescription="Aún no se ha generado ningún formulario UAFE. Usa “Nuevo formulario”."
          />
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={PAGE_LIMIT}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ClipboardList className="w-3.5 h-3.5" />
        {total.toLocaleString()} formulario{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}.
      </p>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar formulario UAFE?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  Se eliminará el formulario de{" "}
                  <span className="font-semibold text-foreground">
                    {deleteTarget.data.nombres || "— sin nombre —"}
                  </span>
                  {deleteTarget.data.numeroId ? ` (${deleteTarget.data.numeroId})` : ""}. Esta
                  acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer" disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive cursor-pointer text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent className="bg-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo formulario</DialogTitle>
            <DialogDescription>Elige la plantilla para el nuevo formulario</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            {FORM_TEMPLATES.map((tpl) => (
              <Card
                key={tpl.id}
                className={cn(
                  "flex flex-col",
                  tpl.principal && "border-primary/40 ring-1 ring-primary/20"
                )}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    {tpl.name}
                    {tpl.principal && (
                      <Badge variant="outline" className="ml-auto gap-1 text-[10px]">
                        <Star className="w-3 h-3" />
                        Principal
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">{tpl.description}</p>
                  <Button
                    className="cursor-pointer w-full"
                    onClick={() => {
                      setTemplateModalOpen(false);
                      router.push(`/forms/nuevo/${tpl.id}`);
                    }}
                  >
                    Usar esta plantilla
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
