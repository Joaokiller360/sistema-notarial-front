"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Plus, Search, ClipboardList, Eye, Trash2, User2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
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
import { cn } from "@/lib/utils";
import {
  deleteUafe,
  listUafe,
  seedExampleUafe,
  hasExampleUafe,
  type UafeSubmission,
} from "@/lib/uafe-forms";

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

export default function FormsPage() {
  const router = useRouter();

  const [items, setItems] = useState<UafeSubmission[]>([]);
  const [search, setSearch] = useState("");
  const [natFilter, setNatFilter] = useState("");
  const [examplesLoaded, setExamplesLoaded] = useState(false);

  const refresh = () => {
    setItems(listUafe());
    setExamplesLoaded(hasExampleUafe());
  };

  const handleSeedExamples = () => {
    const n = seedExampleUafe();
    refresh();
    toast.success(n > 0 ? `${n} formularios de ejemplo cargados` : "Los ejemplos ya estaban cargados");
  };

  useEffect(() => {
    let cancelled = false;
    // Lectura async para no hacer setState síncrono dentro del efecto.
    Promise.resolve().then(() => {
      if (cancelled) return;
      setItems(listUafe());
      setExamplesLoaded(hasExampleUafe());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const nacionalidades = useMemo(() => {
    const set = new Set<string>();
    items.forEach((s) => {
      const n = s.data.nacionalidad?.trim();
      if (n) set.add(n);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((s) => {
      if (natFilter && s.data.nacionalidad !== natFilter) return false;
      if (!q) return true;
      return (
        s.data.nombres.toLowerCase().includes(q) ||
        s.filledByName.toLowerCase().includes(q) ||
        s.data.numeroId.toLowerCase().includes(q)
      );
    });
  }, [items, search, natFilter]);

  const [deleteTarget, setDeleteTarget] = useState<UafeSubmission | null>(null);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteUafe(deleteTarget.id);
    setDeleteTarget(null);
    refresh();
    toast.success("Formulario UAFE eliminado");
  };

  const columns: Column<UafeSubmission>[] = [
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
        {!examplesLoaded && (
          <Button variant="outline" className="cursor-pointer" onClick={handleSeedExamples}>
            <Sparkles className="w-4 h-4 mr-2" />
            Cargar 3 ejemplos
          </Button>
        )}
        <ButtonLink href="/forms/plantillas">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo formulario
        </ButtonLink>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por compareciente, identificación o quien llenó..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={natFilter}
          onChange={(e) => setNatFilter(e.target.value)}
          className="h-9 w-full sm:w-60 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="">Todas las nacionalidades</option>
          {nacionalidades.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(row) => row.id}
        emptyTitle="No hay formularios"
        emptyDescription="Aún no se ha generado ningún formulario UAFE. Usa “Nuevo formulario UAFE”."
      />

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ClipboardList className="w-3.5 h-3.5" />
        Los formularios se guardan en este navegador. Pendiente conectar backend.
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
            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive cursor-pointer text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
