"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Shield, RefreshCw, User, Clock, Monitor, ChevronDown, ChevronUp,
  Globe, Hash, X, Check, ChevronLeft, ChevronRight, CalendarDays, SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { logsService, usersService } from "@/services";
import { useAuthStore } from "@/store";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { LogEntry, PaginatedResponse } from "@/types";

/* ------------------------------------------------------------------ */
/*  Mapas de presentación                                             */
/* ------------------------------------------------------------------ */

const BADGE_GREEN = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
const BADGE_AMBER = "bg-amber-500/10 text-amber-400 border-amber-500/20";
const BADGE_RED = "bg-red-500/10 text-red-400 border-red-500/20";
const BADGE_VIOLET = "bg-violet-500/10 text-violet-400 border-violet-500/20";
const BADGE_SKY = "bg-sky-500/10 text-sky-400 border-sky-500/20";
const BADGE_CYAN = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
const BADGE_GRAY = "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";

function actionColor(action: string): string {
  const a = (action ?? "").toUpperCase();
  if (a === "CREATE") return BADGE_GREEN;
  if (a === "UPDATE") return BADGE_AMBER;
  if (a === "DELETE") return BADGE_RED;
  if (a === "SEARCH") return BADGE_SKY;
  if (a === "DOWNLOAD") return BADGE_CYAN;
  if (
    a === "LOGIN" || a === "LOGOUT" || a === "AUTH" ||
    a === "UNLOCK_ACCOUNT" || a === "FORCE_LOGOUT" || a.includes("PASSWORD")
  ) {
    return BADGE_VIOLET;
  }
  return BADGE_GRAY; // READ y cualquier otro fallback
}

const RESOURCE_LABELS: Record<string, string> = {
  auth: "Autenticación",
  users: "Usuarios",
  archives: "Archivos",
  clients: "Clientes",
  roles: "Roles",
  permissions: "Permisos",
  notaries: "Notarías",
  notifications: "Notificaciones",
  tasks: "Tareas",
  news: "Noticias",
  "uafe-forms": "Formularios UAFE",
  settings: "Configuración",
  system: "Sistema",
};

function resourceLabel(resource: string | null): string {
  if (!resource) return "—";
  return RESOURCE_LABELS[resource.toLowerCase().trim()] ?? resource;
}

function statusColor(code: number | null): string {
  if (code == null) return "text-muted-foreground";
  if (code < 300) return "text-emerald-400";
  if (code < 400) return "text-sky-400";
  if (code < 500) return "text-amber-400";
  return "text-red-400";
}

function searchTerm(details: LogEntry["details"]): string | null {
  if (!details || typeof details !== "object") return null;
  const d = details as Record<string, unknown>;
  const raw = d.q ?? d.search ?? d.query;
  return raw != null && raw !== "" ? String(raw) : null;
}

const GRID =
  "grid grid-cols-[150px_180px_1fr_150px_130px_70px_28px] gap-3 px-4";

/* ------------------------------------------------------------------ */
/*  Autocomplete de usuario                                           */
/* ------------------------------------------------------------------ */

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

function UserSelect({
  value,
  onChange,
}: {
  value: UserOption | null;
  onChange: (u: UserOption | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [options, setOptions] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const res = await usersService.getAll({
          search: term || undefined,
          limit: 10,
        });
        if (!cancelled) {
          setOptions(
            res.data.map((u) => ({
              id: u.id,
              firstName: u.firstName,
              lastName: u.lastName,
              email: u.email,
            }))
          );
        }
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-9 w-full lg:w-64 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs cursor-pointer">
        <span className="flex items-center gap-1.5 min-w-0">
          <User className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
          <span className="truncate">
            {value ? `${value.firstName} ${value.lastName}` : "Todos los usuarios"}
          </span>
        </span>
        {value ? (
          <X
            className="w-3.5 h-3.5 flex-shrink-0 opacity-60 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar usuario..."
            value={term}
            onValueChange={setTerm}
          />
          <CommandList>
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <>
                <CommandEmpty>Sin resultados</CommandEmpty>
                <CommandGroup>
                  {options.map((u) => (
                    <CommandItem
                      key={u.id}
                      value={u.id}
                      onSelect={() => {
                        onChange(u);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.email}
                        </p>
                      </div>
                      {value?.id === u.id && (
                        <Check className="w-3.5 h-3.5 flex-shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/*  Fila                                                              */
/* ------------------------------------------------------------------ */

function LogRow({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const term = searchTerm(log.details);
  const hasExtra = !!(log.resourceId || log.userAgent || log.details);

  return (
    <div className="border-b border-border last:border-0 bg-card">
      <div
        className={cn(
          GRID,
          "py-3 text-sm items-center",
          hasExtra && "cursor-pointer hover:bg-muted/20 transition-colors"
        )}
        onClick={() => hasExtra && setExpanded((v) => !v)}
      >
        {/* Fecha */}
        <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span className="text-xs truncate">
            {format(new Date(log.createdAt), "dd MMM yy HH:mm:ss", { locale: es })}
          </span>
        </div>

        {/* Usuario */}
        <div className="flex items-center gap-1.5 min-w-0">
          <User className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
          {log.user ? (
            <div className="min-w-0">
              <p className="text-xs font-medium truncate leading-tight">
                {log.user.firstName} {log.user.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate leading-tight">
                {log.user.email}
              </p>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Sistema</span>
          )}
        </div>

        {/* Acción */}
        <div className="min-w-0 space-y-1">
          <Badge
            variant="outline"
            className={cn("text-xs font-mono", actionColor(log.action))}
          >
            {log.action}
          </Badge>
          {log.action === "SEARCH" && term && (
            <div className="flex items-center gap-1">
              <Search className="w-2.5 h-2.5 text-sky-400 flex-shrink-0" />
              <span className="text-xs text-sky-400 font-mono truncate">
                &ldquo;{term}&rdquo;
              </span>
            </div>
          )}
        </div>

        {/* Página / Sección */}
        <div className="min-w-0">
          <span className="text-xs font-medium">{resourceLabel(log.resource)}</span>
        </div>

        {/* IP */}
        <div className="min-w-0">
          {log.ip && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate font-mono">{log.ip}</span>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="text-xs font-mono font-semibold text-right">
          {log.statusCode != null && (
            <span className={statusColor(log.statusCode)}>{log.statusCode}</span>
          )}
        </div>

        {/* Chevron */}
        <div className="flex justify-end">
          {hasExtra &&
            (expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ))}
        </div>
      </div>

      {expanded && hasExtra && (
        <div className="px-4 pb-3 space-y-2">
          {log.resourceId != null && (
            <div className="flex items-center gap-2">
              <Hash className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground font-mono">
                {String(log.resourceId)}
              </span>
            </div>
          )}
          {log.userAgent && (
            <div className="flex items-start gap-2">
              <Monitor className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-xs text-muted-foreground break-all">
                {log.userAgent}
              </span>
            </div>
          )}
          {log.details && (
            <pre className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 overflow-x-auto border border-border">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Página                                                            */
/* ------------------------------------------------------------------ */

const HEADERS = ["Fecha", "Usuario", "Acción", "Página", "IP", "Status", ""];
const LIMIT_OPTIONS = [20, 50, 100, 200, 500];

export default function LogsPage() {
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);
  const isAdmin = authUser?.roles.includes("SUPER_ADMIN") ?? false;

  const [resp, setResp] = useState<PaginatedResponse<LogEntry> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const [actionInput, setActionInput] = useState("");
  const [action, setAction] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const userId = selectedUser?.id ?? "";
  const [dateFrom, setDateFrom] = useState(""); // yyyy-mm-dd
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(LIMIT_OPTIONS[0]);
  const [jumpTo, setJumpTo] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const startDate = dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : "";
  const endDate = dateTo ? new Date(`${dateTo}T23:59:59.999`).toISOString() : "";

  const hasFilters = !!(action || selectedUser || dateFrom || dateTo);
  const activeFilterCount =
    (action ? 1 : 0) + (selectedUser ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const handleLimitChange = (v: string | null) => {
    if (!v) return;
    setLimit(Number(v));
    setPage(1);
  };

  useEffect(() => {
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router]);

  // debounce 400ms sobre el input de acción; al aplicarse vuelve a la página 1
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setAction(actionInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [actionInput]);

  const handleUserChange = (u: UserOption | null) => {
    setSelectedUser(u);
    setPage(1);
  };

  const handleDateFrom = (v: string) => {
    setDateFrom(v);
    setPage(1);
  };
  const handleDateTo = (v: string) => {
    setDateTo(v);
    setPage(1);
  };

  // Fetch único: debounce 350ms + AbortController. Evita ráfaga de requests
  // (StrictMode doble-invoca, cambios de filtro encadenados) que dispara 429.
  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(false);
      try {
        const data = await logsService.getAll(
          {
            page,
            limit,
            action: action || undefined,
            userId: userId || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
          controller.signal
        );
        if (!controller.signal.aborted) {
          setResp(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        // request cancelada por un cambio de deps: no marcar error
        const canceled =
          (err as { code?: string })?.code === "ERR_CANCELED" ||
          (err as { name?: string })?.name === "CanceledError";
        if (!canceled) {
          setError(true);
          setResp(null);
          setIsLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isAdmin, page, limit, action, userId, startDate, endDate, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const clearFilters = () => {
    setActionInput("");
    setAction("");
    setSelectedUser(null);
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const pages = resp?.pages ?? 1;
  const goToPage = () => {
    const n = parseInt(jumpTo, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= pages) setPage(n);
    setJumpTo("");
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registros del Sistema"
        description="Auditoría completa de todas las acciones realizadas"
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sidebar border border-sidebar/30">
          <Shield className="w-3.5 h-3.5 text-white" />
          <span className="text-xs font-medium text-white">Solo Admin</span>
        </div>
        <Select value={String(limit)} onValueChange={handleLimitChange}>
          <SelectTrigger className="w-36 cursor-pointer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIMIT_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                Mostrar {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="cursor-pointer"
          onClick={reload}
          disabled={isLoading}
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </Button>
      </PageHeader>

      {/* Filtros — se editan dentro del modal */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          className="cursor-pointer gap-1.5"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge
              variant="outline"
              className="ml-1 h-5 min-w-5 justify-center px-1 bg-primary/10 text-primary border-primary/20"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {action && (
          <Badge variant="outline" className="gap-1 font-mono">
            {action}
            <button
              type="button"
              className="cursor-pointer opacity-60 hover:opacity-100"
              onClick={() => { setActionInput(""); setAction(""); setPage(1); }}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}
        {selectedUser && (
          <Badge variant="outline" className="gap-1">
            {selectedUser.firstName} {selectedUser.lastName}
            <button
              type="button"
              className="cursor-pointer opacity-60 hover:opacity-100"
              onClick={() => handleUserChange(null)}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}
        {(dateFrom || dateTo) && (
          <Badge variant="outline" className="gap-1">
            {dateFrom || "…"} → {dateTo || "…"}
            <button
              type="button"
              className="cursor-pointer opacity-60 hover:opacity-100"
              onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer text-muted-foreground"
            onClick={clearFilters}
          >
            <X className="w-4 h-4 mr-1.5" />
            Limpiar
          </Button>
        )}
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Acción
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="CREATE, LOGIN, SEARCH..."
                  className="pl-9"
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Usuario
              </label>
              <UserSelect value={selectedUser} onChange={handleUserChange} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> Desde
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => handleDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> Hasta
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => handleDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              className="cursor-pointer text-muted-foreground"
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              <X className="w-4 h-4 mr-1.5" />
              Limpiar
            </Button>
            <Button className="cursor-pointer" onClick={() => setFiltersOpen(false)}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabla */}
      <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
        <div className="min-w-[900px]">
          <div
            className={cn(
              GRID,
              "py-2.5 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            )}
          >
            {HEADERS.map((h, i) => (
              <span key={i} className={i === 5 ? "text-right" : undefined}>
                {h}
              </span>
            ))}
          </div>

          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={cn(GRID, "py-3")}>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-10 ml-auto" />
                  <div />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Shield className="w-10 h-10 opacity-20" />
              <p className="text-sm">No se pudieron cargar los registros</p>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={reload}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Reintentar
              </Button>
            </div>
          ) : !resp || resp.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Shield className="w-10 h-10 opacity-20" />
              <p className="text-sm">Sin registros</p>
            </div>
          ) : (
            <div>
              {resp.data.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Paginación */}
      {resp && resp.data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
          <p className="text-sm text-muted-foreground">
            Página <span className="font-medium text-foreground">{resp.page}</span>{" "}
            de <span className="font-medium text-foreground">{pages}</span>
            {" · "}
            <span className="font-medium text-foreground">{resp.total}</span>{" "}
            registros
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={resp.page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Input
              type="number"
              min={1}
              max={pages}
              value={jumpTo}
              onChange={(e) => setJumpTo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goToPage();
              }}
              className="h-8 w-16 text-center"
              placeholder={String(resp.page)}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 cursor-pointer"
              onClick={goToPage}
            >
              Ir
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={resp.page >= pages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
