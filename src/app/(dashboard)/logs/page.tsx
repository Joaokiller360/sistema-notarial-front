"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Shield, RefreshCw, User, Clock, Monitor, ChevronDown, ChevronUp } from "lucide-react";
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
  CREATE:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  UPDATE:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  DELETE:  "bg-red-500/10 text-red-400 border-red-500/20",
  LOGIN:   "bg-purple-500/10 text-purple-400 border-purple-500/20",
  LOGOUT:  "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

function actionColor(action: string): string {
  const key = Object.keys(ACTION_COLORS).find((k) =>
    action?.toUpperCase().includes(k)
  );
  return key
    ? ACTION_COLORS[key]
    : "bg-amber-500/10 text-amber-400 border-amber-500/20";
}

function LogRow({ log }: { log: Log }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = !!log.details;

  return (
    <div className="border-b border-border last:border-0">
      <div
        className={cn(
          "grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 text-sm items-center",
          hasDetails && "cursor-pointer hover:bg-muted/20 transition-colors"
        )}
        onClick={() => hasDetails && setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2 text-muted-foreground min-w-0">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate text-xs">
            {format(new Date(log.createdAt), "dd MMM yyyy HH:mm:ss", { locale: es })}
          </span>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <User className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
          {log.user ? (
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">
                {log.user.firstName} {log.user.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">{log.user.email}</p>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Sistema</span>
          )}
        </div>

        <div>
          <Badge variant="outline" className={cn("text-xs font-mono", actionColor(log.action))}>
            {log.action}
          </Badge>
        </div>

        <div className="min-w-0">
          {log.entity && (
            <p className="text-xs font-medium truncate">{log.entity}</p>
          )}
          {log.ipAddress && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Monitor className="w-3 h-3" />
              {log.ipAddress}
            </div>
          )}
        </div>

        <div className="w-6 flex justify-end">
          {hasDetails && (
            expanded
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && log.details && (
        <div className="px-4 pb-3">
          <pre className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all border border-border">
            {typeof log.details === "string"
              ? log.details
              : JSON.stringify(log.details, null, 2)}
          </pre>
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
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <Shield className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-medium text-purple-400">Solo Super Admin</span>
        </div>
        <Button variant="outline" size="icon" onClick={load} disabled={isLoading}>
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

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Fecha</span>
          <span>Usuario</span>
          <span>Acción</span>
          <span>Entidad / IP</span>
          <span className="w-6" />
        </div>

        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <div className="w-6" />
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
