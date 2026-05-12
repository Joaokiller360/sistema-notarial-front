"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, UserRound, Users, UserCheck, UserPlus, Upload,
  Download, FileText, CheckCircle2, AlertCircle, X,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Pagination } from "@/components/common/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { archivesService, clientsService } from "@/services";
import type { ClientPayload } from "@/services/clients.service";
import type { Archive } from "@/types";

interface DerivedClient {
  id: string;
  nombresCompletos: string;
  cedulaORuc: string;
  nacionalidad?: string;
  asGrantor: number;
  asBeneficiary: number;
}

function extractClients(archives: Archive[]): DerivedClient[] {
  const map = new Map<string, DerivedClient>();

  for (const archive of archives) {
    for (const g of archive.grantors) {
      const key = g.cedulaORuc ?? g.nombresCompletos;
      const cur = map.get(key);
      if (cur) {
        cur.asGrantor++;
      } else {
        map.set(key, {
          id: key,
          nombresCompletos: g.nombresCompletos,
          cedulaORuc: g.cedulaORuc ?? "",
          nacionalidad: g.nacionalidad,
          asGrantor: 1,
          asBeneficiary: 0,
        });
      }
    }
    for (const b of archive.beneficiaries) {
      const key = b.cedulaORuc ?? b.nombresCompletos;
      const cur = map.get(key);
      if (cur) {
        cur.asBeneficiary++;
      } else {
        map.set(key, {
          id: key,
          nombresCompletos: b.nombresCompletos,
          cedulaORuc: b.cedulaORuc ?? "",
          nacionalidad: b.nacionalidad,
          asGrantor: 0,
          asBeneficiary: 1,
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.nombresCompletos.localeCompare(b.nombresCompletos)
  );
}

function downloadTemplate() {
  const BOM = "﻿";
  // Plantilla actualizada con columna pasaporte
  const rows = [
    "nombresCompletos,cedulaORuc,pasaporte,nacionalidad",
    "Juan Carlos Pérez López,0102030405,,Ecuatoriana",
    "María García Rodríguez,,,Colombiana",
    "Carlos Andrés Torres,,AB123456,Venezolana",
    "Ana Sofía Ramírez,1234567890123,,Ecuatoriana",
  ].join("\n");
  const blob = new Blob([BOM + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_clientes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Error de validación por fila
interface RowError {
  row: number;
  field: string;
  message: string;
}

interface ParseResult {
  rows: ClientPayload[];
  duplicates: number;
  invalid: number;
  rowErrors: RowError[];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (i === line.length) { result.push(""); break; }
    if (line[i] === '"') {
      i++;
      let field = "";
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') { field += '"'; i += 2; }
          else { i++; break; }
        } else {
          field += line[i++];
        }
      }
      result.push(field.trim());
      if (line[i] === ',') i++;
    } else {
      const next = line.indexOf(',', i);
      if (next === -1) { result.push(line.slice(i).trim()); break; }
      result.push(line.slice(i, next).trim());
      i = next + 1;
    }
  }
  return result;
}

function sanitizeCedula(raw: string): string {
  return raw.replace(/[\s\-\.]/g, "");
}

// Tarea 4: validadores de campos de identificación
function validateCedulaORuc(value: string): string | null {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return "debe contener solo números";
  if (value.length === 10) return null;
  if (value.length === 13) return null;
  return `debe tener 10 dígitos (cédula) o 13 dígitos (RUC); tiene ${value.length}`;
}

function validatePasaporte(value: string): string | null {
  if (!value) return null;
  if (!/^[a-zA-Z0-9]+$/.test(value)) return "debe ser alfanumérico (sin caracteres especiales)";
  if (value.length < 5 || value.length > 20) return `debe tener entre 5 y 20 caracteres; tiene ${value.length}`;
  return null;
}

function parseCSV(text: string): ParseResult {
  const lines = text.replace(/\r/g, "").trim().split("\n");
  if (lines.length < 2) return { rows: [], duplicates: 0, invalid: 0, rowErrors: [] };

  // Detectar índices de columnas a partir del encabezado
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s/g, ""));
  const iNombres     = headers.findIndex((h) => h.includes("nombre")) ?? 0;
  const iCedula      = headers.findIndex((h) => h.includes("cedula") || h.includes("ruc"));
  const iPasaporte   = headers.findIndex((h) => h.includes("pasaporte"));
  const iNacionalidad = headers.findIndex((h) => h.includes("nacional"));

  // Fallback posicional para CSVs sin encabezado reconocido
  const colNombres     = iNombres     >= 0 ? iNombres     : 0;
  const colCedula      = iCedula      >= 0 ? iCedula      : 1;
  const colPasaporte   = iPasaporte   >= 0 ? iPasaporte   : -1;
  const colNacionalidad = iNacionalidad >= 0 ? iNacionalidad : (colPasaporte >= 0 ? 3 : 2);

  let invalid = 0;
  let duplicates = 0;
  const seen = new Set<string>();
  const rows: ClientPayload[] = [];
  const rowErrors: RowError[] = [];

  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line.trim()) { invalid++; continue; }

    const cols = parseCSVLine(line);
    const nombresCompletos = (cols[colNombres] ?? "").trim();
    const cedulaRaw        = sanitizeCedula(cols[colCedula] ?? "");
    const pasaporteRaw     = colPasaporte >= 0 ? (cols[colPasaporte] ?? "").trim() : "";
    const nacionalidad     = (cols[colNacionalidad] ?? "").trim() || "ECUATORIANA";

    if (!nombresCompletos) { invalid++; continue; }

    let rowHasError = false;

    // Validar cédula/RUC si viene relleno
    if (cedulaRaw) {
      const err = validateCedulaORuc(cedulaRaw);
      if (err) {
        rowErrors.push({ row: li, field: "cedulaORuc", message: `Fila ${li}: Cédula/RUC "${cedulaRaw}" ${err}` });
        rowHasError = true;
      }
    }

    // Validar pasaporte si viene relleno
    if (pasaporteRaw) {
      const err = validatePasaporte(pasaporteRaw);
      if (err) {
        rowErrors.push({ row: li, field: "pasaporte", message: `Fila ${li}: Pasaporte "${pasaporteRaw}" ${err}` });
        rowHasError = true;
      }
    }

    // Filas con errores de formato se omiten pero no detienen la importación
    if (rowHasError) { invalid++; continue; }

    const dedupeKey = cedulaRaw || pasaporteRaw;
    if (dedupeKey) {
      if (seen.has(dedupeKey)) { duplicates++; continue; }
      seen.add(dedupeKey);
    }

    rows.push({
      nombresCompletos,
      ...(cedulaRaw ? { cedulaORuc: cedulaRaw } : {}),
      ...(pasaporteRaw ? { pasaporte: pasaporteRaw } : {}),
      nacionalidad,
    });
  }

  return { rows, duplicates, invalid, rowErrors };
}

const PAGE_LIMIT = 15;

export default function ClientsPage() {
  const router = useRouter();

  const [allArchives, setAllArchives] = useState<Archive[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Single-add dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({
    nombresCompletos: "",
    cedulaORuc: "",
    pasaporte: "",
    isPasaporte: false,
    nacionalidad: "",
  });
  const [isAdding, setIsAdding] = useState(false);

  // Errores inline del diálogo
  const [cedulaDialogError, setCedulaDialogError] = useState("");
  const [pasaporteDialogError, setPasaporteDialogError] = useState("");

  // Bulk import dialog
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [parsedRows, setParsedRows] = useState<ClientPayload[]>([]);
  const [parseStats, setParseStats] = useState({ duplicates: 0, invalid: 0, rowErrors: [] as RowError[] });
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, created: 0, errors: 0 });
  const [importFileName, setImportFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      let collected: Archive[] = [];
      let currentPage = 1;
      let totalPages = 1;
      do {
        const result = await archivesService.getAll({ page: currentPage, limit: 100 });
        collected = collected.concat(result.data);
        totalPages = result.totalPages;
        currentPage++;
      } while (currentPage <= totalPages);
      setAllArchives(collected);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const clients = useMemo(() => extractClients(allArchives), [allArchives]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.nombresCompletos.toLowerCase().includes(q) ||
        c.cedulaORuc.includes(q)
    );
  }, [clients, search]);

  useEffect(() => { setPage(1); }, [search]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_LIMIT;
    return filtered.slice(start, start + PAGE_LIMIT);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PAGE_LIMIT);

  const resetAddForm = () => {
    setAddForm({ nombresCompletos: "", cedulaORuc: "", pasaporte: "", isPasaporte: false, nacionalidad: "" });
    setCedulaDialogError("");
    setPasaporteDialogError("");
  };

  // Single add
  const handleAdd = async () => {
    if (!addForm.nombresCompletos.trim() || !addForm.nacionalidad.trim()) {
      toast.error("Nombre y nacionalidad son requeridos");
      return;
    }

    // Validación final del formulario
    if (addForm.isPasaporte) {
      const v = addForm.pasaporte.trim();
      if (!v) { setPasaporteDialogError("El pasaporte es requerido"); return; }
      if (!/^[a-zA-Z0-9]+$/.test(v)) { setPasaporteDialogError("El pasaporte debe ser alfanumérico"); return; }
      if (v.length < 5 || v.length > 20) { setPasaporteDialogError("El pasaporte debe tener entre 5 y 20 caracteres"); return; }
    } else if (addForm.cedulaORuc && !/^\d+$/.test(addForm.cedulaORuc)) {
      setCedulaDialogError("La cédula/RUC debe contener solo números");
      return;
    }

    setIsAdding(true);
    try {
      await clientsService.create({
        nombresCompletos: addForm.nombresCompletos.trim(),
        // Si es pasaporte lo enviamos en cedulaORuc (único campo de identificación del API)
        cedulaORuc: addForm.isPasaporte
          ? (addForm.pasaporte.trim() || undefined)
          : (addForm.cedulaORuc.trim() || undefined),
        nacionalidad: addForm.nacionalidad.trim(),
      });
      toast.success("Cliente agregado exitosamente");
      setShowAddDialog(false);
      resetAddForm();
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Error al agregar el cliente");
    } finally {
      setIsAdding(false);
    }
  };

  // CSV file pick
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, duplicates, invalid, rowErrors } = parseCSV(text);
      setParsedRows(rows);
      setParseStats({ duplicates, invalid, rowErrors });
    };
    reader.readAsText(file, "UTF-8");
  };

  const CHUNK_SIZE = 500;

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setImportProgress({ done: 0, total: parsedRows.length, created: 0, errors: 0 });

    let totalCreated = 0;
    let totalErrors = 0;
    let failedChunks = 0;
    let firstErrorMsg = "";

    for (let i = 0; i < parsedRows.length; i += CHUNK_SIZE) {
      const chunk = parsedRows.slice(i, i + CHUNK_SIZE);
      try {
        const result = await clientsService.bulkCreate(chunk);
        totalCreated += result.created;
        totalErrors += result.errors ?? 0;
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const raw = (err as { response?: { data?: unknown } })?.response?.data;
        const msg = (raw as { message?: unknown })?.message;
        const text = Array.isArray(msg) ? msg.join(" · ") : typeof msg === "string" ? msg : `Error ${status ?? "de red"}`;
        if (!firstErrorMsg) firstErrorMsg = text;
        totalErrors += chunk.length;
        failedChunks++;
      }
      setImportProgress({
        done: Math.min(i + CHUNK_SIZE, parsedRows.length),
        total: parsedRows.length,
        created: totalCreated,
        errors: totalErrors,
      });
    }

    setIsImporting(false);

    const totalChunks = Math.ceil(parsedRows.length / CHUNK_SIZE);
    if (failedChunks === totalChunks) {
      toast.error(firstErrorMsg || "No se pudo importar ningún cliente.");
    } else if (totalErrors > 0) {
      toast.warning(`${totalCreated.toLocaleString()} importados · ${totalErrors.toLocaleString()} con errores`);
    } else {
      toast.success(`${totalCreated.toLocaleString()} clientes importados exitosamente`);
    }

    setShowImportDialog(false);
    setParsedRows([]);
    setImportFileName("");
    setImportProgress({ done: 0, total: 0, created: 0, errors: 0 });
    load();
  };

  const resetImport = () => {
    setParsedRows([]);
    setImportFileName("");
    setParseStats({ duplicates: 0, invalid: 0, rowErrors: [] });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const columns: Column<DerivedClient>[] = [
    {
      key: "name",
      label: "Cliente",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {row.nombresCompletos.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{row.nombresCompletos}</p>
            <p className="text-xs text-muted-foreground font-mono">{row.cedulaORuc}</p>
          </div>
        </div>
      ),
    },
    {
      key: "nacionalidad",
      label: "Nacionalidad",
      render: (row) =>
        row.nacionalidad ? (
          <span className="text-sm">{row.nacionalidad}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "asGrantor",
      label: "Como Otorgante",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
            {row.asGrantor} trámite{row.asGrantor !== 1 ? "s" : ""}
          </Badge>
        </div>
      ),
    },
    {
      key: "asBeneficiary",
      label: "Como A Favor De",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            {row.asBeneficiary} trámite{row.asBeneficiary !== 1 ? "s" : ""}
          </Badge>
        </div>
      ),
    },
    {
      key: "actions",
      label: "Trámites",
      className: "text-right",
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => router.push(`/clients/${encodeURIComponent(row.cedulaORuc || row.nombresCompletos)}`)}
        >
          Ver trámites
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Otorgantes y beneficiarios que han participado en trámites"
      >
        {!isLoading && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
            <UserRound className="w-3.5 h-3.5 text-primary" />
            <span className="text-md font-medium text-primary">{clients.length} clientes</span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => setShowImportDialog(true)}
        >
          <Upload className="w-4 h-4 mr-1.5" />
          Importar CSV
        </Button>
        <Button
          size="sm"
          className="cursor-pointer"
          onClick={() => setShowAddDialog(true)}
        >
          <UserPlus className="w-4 h-4 mr-1.5" />
          Nuevo Cliente
        </Button>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o cédula..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
            data={paged}
            isLoading={false}
            keyExtractor={(row) => row.id}
            emptyTitle="No hay clientes"
            emptyDescription={
              search
                ? "No se encontraron clientes con ese nombre o cédula."
                : "Los clientes aparecen al crear archivos con otorgantes y beneficiarios."
            }
          />
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              limit={PAGE_LIMIT}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {/* ── Dialog: Nuevo Cliente ── */}
      <Dialog open={showAddDialog} onOpenChange={(v) => { setShowAddDialog(v); if (!v) resetAddForm(); }}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Nuevo Cliente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre completo <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ej. Juan Carlos Pérez López"
                value={addForm.nombresCompletos}
                onChange={(e) => setAddForm((p) => ({ ...p, nombresCompletos: e.target.value }))}
              />
            </div>

            {/* Tareas 1-2-3: cédula/RUC numérica + checkbox pasaporte + campo pasaporte */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>{addForm.isPasaporte ? "Pasaporte" : "Cédula / RUC"} <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={addForm.isPasaporte}
                    onChange={() => {
                      setAddForm((p) => ({ ...p, isPasaporte: !p.isPasaporte, cedulaORuc: "", pasaporte: "" }));
                      setCedulaDialogError("");
                      setPasaporteDialogError("");
                    }}
                    className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground">¿Es Pasaporte?</span>
                </label>
              </div>

              {addForm.isPasaporte ? (
                // Campo pasaporte: alfanumérico, 5–20 caracteres
                <Input
                  placeholder="Ej. AB123456"
                  maxLength={20}
                  value={addForm.pasaporte}
                  onKeyDown={(e) => {
                    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"];
                    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
                    if (!/^[a-zA-Z0-9]$/.test(e.key)) {
                      e.preventDefault();
                      setPasaporteDialogError("Solo se permiten letras y números en el pasaporte");
                      setTimeout(() => setPasaporteDialogError(""), 2500);
                    }
                  }}
                  onChange={(e) => {
                    const filtered = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
                    if (e.target.value !== filtered) setPasaporteDialogError("Solo se permiten letras y números en el pasaporte");
                    else setPasaporteDialogError("");
                    setAddForm((p) => ({ ...p, pasaporte: filtered }));
                  }}
                />
              ) : (
                // Campo cédula/RUC: solo numérico
                <Input
                  placeholder="0102030405"
                  value={addForm.cedulaORuc}
                  onKeyDown={(e) => {
                    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"];
                    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
                    if (!/^\d$/.test(e.key)) {
                      e.preventDefault();
                      setCedulaDialogError("Solo se permiten números en la cédula/RUC");
                      setTimeout(() => setCedulaDialogError(""), 2500);
                    }
                  }}
                  onChange={(e) => {
                    const filtered = e.target.value.replace(/\D/g, "");
                    if (e.target.value !== filtered) setCedulaDialogError("Solo se permiten números en la cédula/RUC");
                    else setCedulaDialogError("");
                    setAddForm((p) => ({ ...p, cedulaORuc: filtered }));
                  }}
                />
              )}

              {cedulaDialogError && !addForm.isPasaporte && (
                <p className="text-xs text-destructive">{cedulaDialogError}</p>
              )}
              {pasaporteDialogError && addForm.isPasaporte && (
                <p className="text-xs text-destructive">{pasaporteDialogError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Nacionalidad <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ej. Ecuatoriana"
                value={addForm.nacionalidad}
                onChange={(e) => setAddForm((p) => ({ ...p, nacionalidad: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => { setShowAddDialog(false); resetAddForm(); }}>
              Cancelar
            </Button>
            <Button
              className="cursor-pointer"
              onClick={handleAdd}
              disabled={isAdding || !addForm.nombresCompletos.trim() || !addForm.nacionalidad.trim()}
            >
              {isAdding ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </span>
              ) : "Guardar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Importar CSV ── */}
      <Dialog
        open={showImportDialog}
        onOpenChange={(v) => { setShowImportDialog(v); if (!v) resetImport(); }}
      >
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Importar Clientes desde CSV
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Paso 1 — Descarga la plantilla
              </p>
              <p className="text-xs text-muted-foreground">
                Llena el archivo con los datos de tus clientes. Cédula/RUC (10 o 13 dígitos) y Pasaporte (alfanumérico, 5–20 caracteres) son opcionales pero se validarán si se ingresan.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={downloadTemplate}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Descargar plantilla_clientes.csv
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Paso 2 — Sube el archivo llenado
              </p>

              {parsedRows.length === 0 ? (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Haz clic para seleccionar el CSV
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-muted border border-border px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-medium">{importFileName}</span>
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                        {parsedRows.length.toLocaleString()} filas
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 cursor-pointer"
                      onClick={resetImport}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider grid grid-cols-3 gap-2">
                      <span>Nombre</span>
                      <span>Cédula/RUC</span>
                      <span>Nacionalidad</span>
                    </div>
                    <div className="divide-y divide-border max-h-40 overflow-y-auto">
                      {parsedRows.slice(0, 50).map((row, i) => (
                        <div key={i} className="px-3 py-1.5 grid grid-cols-3 gap-2 text-xs">
                          <span className="truncate font-medium">{row.nombresCompletos}</span>
                          <span className="truncate text-muted-foreground font-mono">
                            {row.cedulaORuc || <span className="italic">—</span>}
                          </span>
                          <span className="truncate">{row.nacionalidad}</span>
                        </div>
                      ))}
                    </div>
                    {parsedRows.length > 50 && (
                      <div className="px-3 py-1.5 text-xs text-muted-foreground text-center bg-muted/50">
                        +{(parsedRows.length - 50).toLocaleString()} filas más...
                      </div>
                    )}
                  </div>

                  {(parseStats.duplicates > 0 || parseStats.invalid > 0) && (
                    <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>
                        {parseStats.duplicates > 0 && (
                          <span>{parseStats.duplicates.toLocaleString()} duplicados eliminados</span>
                        )}
                        {parseStats.duplicates > 0 && parseStats.invalid > 0 && " · "}
                        {parseStats.invalid > 0 && (
                          <span>{parseStats.invalid.toLocaleString()} filas inválidas omitidas</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Tarea 4: mostrar errores de validación por fila */}
                  {parseStats.rowErrors.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {parseStats.rowErrors.length} error{parseStats.rowErrors.length !== 1 ? "es" : ""} de formato detectado{parseStats.rowErrors.length !== 1 ? "s" : ""}
                        {" "}(esas filas fueron omitidas)
                      </p>
                      <div className="rounded-lg border border-destructive/20 bg-destructive/5 max-h-32 overflow-y-auto divide-y divide-destructive/10">
                        {parseStats.rowErrors.slice(0, 20).map((e, i) => (
                          <p key={i} className="px-3 py-1.5 text-xs text-destructive">
                            {e.message}
                          </p>
                        ))}
                        {parseStats.rowErrors.length > 20 && (
                          <p className="px-3 py-1.5 text-xs text-destructive/70 text-center">
                            +{parseStats.rowErrors.length - 20} errores más...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {isImporting && importProgress.total > 0 && (
            <div className="px-1 pb-1 space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Lote {Math.min(Math.ceil(importProgress.done / CHUNK_SIZE), Math.ceil(importProgress.total / CHUNK_SIZE))} de {Math.ceil(importProgress.total / CHUNK_SIZE)}</span>
                <span>{importProgress.done.toLocaleString()} / {importProgress.total.toLocaleString()}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((importProgress.done / importProgress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              disabled={isImporting}
              onClick={() => { setShowImportDialog(false); resetImport(); }}
            >
              Cancelar
            </Button>
            <Button
              className="cursor-pointer"
              onClick={handleImport}
              disabled={isImporting || parsedRows.length === 0}
            >
              {isImporting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Importando...
                </span>
              ) : (
                `Importar ${parsedRows.length > 0 ? parsedRows.length.toLocaleString() : ""} cliente${parsedRows.length !== 1 ? "s" : ""}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
