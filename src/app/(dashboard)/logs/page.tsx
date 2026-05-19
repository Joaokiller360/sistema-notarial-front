"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Shield, RefreshCw, User, Clock, Monitor, ChevronDown, ChevronUp,
  Globe, Hash, FolderArchive, Users, BookOpen, FileText, LayoutDashboard, KeyRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { Pagination } from "@/components/common/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { logsService } from "@/services";
import { useAuthStore } from "@/store";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Log, PaginatedLogs } from "@/types";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  UPDATE: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  DELETE: "bg-red-500/10 text-red-400 border-red-500/20",
  LOGIN:  "bg-purple-500/10 text-purple-400 border-purple-500/20",
  LOGOUT: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  SEARCH: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  READ:   "bg-slate-500/10 text-slate-400 border-slate-500/20",
  LIST:   "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-sky-500/10 text-sky-400 border-sky-500/20",
  POST:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PUT:    "bg-amber-500/10 text-amber-400 border-amber-500/20",
  PATCH:  "bg-orange-500/10 text-orange-400 border-orange-500/20",
  DELETE: "bg-red-500/10 text-red-400 border-red-500/20",
};

const RESOURCE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  archive:   { label: "Archivos",      icon: FolderArchive,    color: "text-primary" },
  archives:  { label: "Archivos",      icon: FolderArchive,    color: "text-primary" },
  user:      { label: "Usuarios",      icon: Users,            color: "text-blue-400" },
  users:     { label: "Usuarios",      icon: Users,            color: "text-blue-400" },
  protocol:  { label: "Protocolos",    icon: BookOpen,         color: "text-purple-400" },
  protocols: { label: "Protocolos",    icon: BookOpen,         color: "text-purple-400" },
  log:       { label: "Logs",          icon: FileText,         color: "text-zinc-400" },
  logs:      { label: "Logs",          icon: FileText,         color: "text-zinc-400" },
  auth:      { label: "Autenticación", icon: KeyRound,         color: "text-amber-400" },
  session:   { label: "Sesión",        icon: KeyRound,         color: "text-amber-400" },
  dashboard: { label: "Dashboard",     icon: LayoutDashboard,  color: "text-muted-foreground" },
};

function actionColor(action: string): string {
  const up = action?.toUpperCase() ?? "";
  const key = Object.keys(ACTION_COLORS).find((k) => up.includes(k));
  return key ? ACTION_COLORS[key] : "bg-sidebar text-amber-400 border-amber-500/20";
}

function methodColor(method?: string): string {
  if (!method) return "bg-sidebar text-zinc-400 border-zinc-500/20";
  return METHOD_COLORS[method.toUpperCase()] ?? "bg-sidebar text-zinc-400 border-zinc-500/20";
}

function statusColor(code?: number): string {
  if (!code) return "text-muted-foreground";
  if (code < 300) return "text-emerald-400";
  if (code < 400) return "text-amber-400";
  return "text-red-400";
}

function isSearchAction(action: string): boolean {
  const up = action?.toUpperCase() ?? "";
  return up.includes("SEARCH") || up.includes("BUSCAR") || up.includes("FIND");
}

function extractSearchQuery(details: Log["details"]): string | null {
  if (!details) return null;
  const obj = typeof details === "string" ? (() => { try { return JSON.parse(details); } catch { return null; } })() : details;
  if (!obj || typeof obj !== "object") return null;
  const d = obj as Record<string, unknown>;
  const raw = d.query ?? d.search ?? d.q ?? d.busqueda ?? d.term ?? null;
  return raw != null ? String(raw) : null;
}

function PageSection({ resource }: { resource?: string }) {
  if (!resource) return <span className="text-xs text-muted-foreground">—</span>;
  const meta = RESOURCE_META[resource.toLowerCase()];
  if (!meta) {
    return <span className="text-xs font-medium capitalize">{resource}</span>;
  }
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", meta.color)} />
      <span className={cn("text-xs font-medium", meta.color)}>{meta.label}</span>
    </div>
  );
}

function LogRow({ log }: { log: Log }) {
  const [expanded, setExpanded] = useState(false);
  const searchQuery = extractSearchQuery(log.details);
  const isSearch = isSearchAction(log.action) || !!searchQuery;
  const hasExtra = !!(log.details || log.userAgent || log.resourceId);

  return (
    <div className="border-b border-border last:border-0 bg-card">
      <div
        className={cn(
          "grid grid-cols-[140px_150px_1fr_1fr_110px_80px_64px_24px] gap-3 px-4 py-3 text-sm items-center",
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
              <p className="text-xs text-muted-foreground truncate leading-tight">{log.user.email}</p>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Sistema</span>
          )}
        </div>

        {/* Acción + búsqueda */}
        <div className="min-w-0 space-y-1">
          <Badge variant="outline" className={cn("text-xs font-mono", actionColor(log.action))}>
            {log.action}
          </Badge>
          {isSearch && searchQuery && (
            <div className="flex items-center gap-1">
              <Search className="w-2.5 h-2.5 text-sky-400 flex-shrink-0" />
              <span className="text-xs text-sky-400 font-mono truncate">&ldquo;{searchQuery}&rdquo;</span>
            </div>
          )}
          {isSearch && !searchQuery && (
            <div className="flex items-center gap-1">
              <Search className="w-2.5 h-2.5 text-sky-400 flex-shrink-0" />
              <span className="text-xs text-sky-400">búsqueda</span>
            </div>
          )}
        </div>

        {/* Ruta (method + endpoint) */}
        <div className="flex items-center gap-1.5 min-w-0">
          {log.method && (
            <Badge variant="outline" className={cn("text-xs font-mono flex-shrink-0 px-1.5 py-0", methodColor(log.method))}>
              {log.method}
            </Badge>
          )}
          {log.endpoint && (
            <span className="text-xs text-muted-foreground font-mono truncate">{log.endpoint}</span>
          )}
        </div>

        {/* Página/Sección */}
        <div className="min-w-0">
          <PageSection resource={log.resource} />
        </div>

        {/* IP */}
        <div className="min-w-0">
          {log.ip && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Globe className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate font-mono">{log.ip}</span>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="text-xs font-mono font-semibold text-right">
          {log.statusCode && (
            <span className={statusColor(log.statusCode)}>{log.statusCode}</span>
          )}
        </div>

        {/* Chevron */}
        <div className="flex justify-end">
          {hasExtra && (
            expanded
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {log.resourceId && (
            <div className="flex items-center gap-2">
              <Hash className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground font-mono">{log.resourceId}</span>
            </div>
          )}
          {log.userAgent && (
            <div className="flex items-start gap-2">
              <Monitor className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-xs text-muted-foreground break-all">{log.userAgent}</span>
            </div>
          )}
          {log.details && (
            <pre className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all border border-border">
              {typeof log.details === "string"
                ? log.details
                : JSON.stringify(log.details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function LogsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles.includes("SUPER_ADMIN") ?? false;

  const [logs, setLogs] = useState<PaginatedLogs | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const data = await logsService.getAll({ search: search || undefined, page, limit: 20 });
      setLogs(data);
    } catch {
      // silently fail — backend may not have /logs yet
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, search, page]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registros del Sistema"
        description="Auditoría completa de todas las acciones realizadas"
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sidebar border border-sidebar/30">
          <Shield className="w-3.5 h-3.5 text-white" />
          <span className="text-xs font-medium text-white">Solo Super Admin</span>
        </div>
        <Button variant="outline" size="icon" className="cursor-pointer" onClick={load} disabled={isLoading}>
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </Button>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por usuario, acción..."
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
        <div className="min-w-[960px]">
          <div className="grid grid-cols-[140px_150px_1fr_1fr_110px_80px_64px_24px] gap-3 px-4 py-2.5 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Fecha</span>
            <span>Usuario</span>
            <span>Acción</span>
            <span>Ruta</span>
            <span>Página</span>
            <span>IP</span>
            <span className="text-right">Status</span>
            <span />
          </div>

          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[140px_150px_1fr_1fr_110px_80px_64px_24px] gap-3 px-4 py-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-8" />
                  <div />
                </div>
              ))}
            </div>
          ) : !logs || logs.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Shield className="w-10 h-10 opacity-20" />
              <p className="text-sm">No hay registros disponibles</p>
              <p className="text-xs opacity-60">
                El backend debe exponer el endpoint{" "}
                <code className="font-mono">/logs</code>
              </p>
            </div>
          ) : (
            <div>
              {logs.data.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>

      {logs && logs.totalPages > 1 && (
        <Pagination
          page={logs.page}
          totalPages={logs.totalPages}
          total={logs.total}
          limit={logs.limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
