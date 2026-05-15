"use client";

import { useState, useMemo } from "react";
import { Filter, X, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/common/Pagination";
import { useNotifications } from "@/hooks";
import type { NotificationType } from "@/types";

const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; class: string }
> = {
  INFORMATIVA: {
    label: "Informativa",
    class: "bg-blue-100 text-blue-700 border-blue-200",
  },
  URGENTE: {
    label: "Urgente",
    class: "bg-red-100 text-red-700 border-red-200",
  },
  RECORDATORIO: {
    label: "Recordatorio",
    class: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  ALERTA: {
    label: "Alerta",
    class: "bg-orange-100 text-orange-700 border-orange-200",
  },
};

const PAGE_SIZE = 10;

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export function NotificationHistory() {
  const { sent, removeNotification } = useNotifications();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<NotificationType | "">("");
  const [filterRead, setFilterRead] = useState<"all" | "read" | "unread">(
    "all"
  );
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const filtered = useMemo(() => {
    return sent.filter((n) => {
      if (filterType && n.type !== filterType) return false;
      if (filterRead === "read" && !n.read) return false;
      if (filterRead === "unread" && n.read) return false;
      if (filterFrom) {
        if (new Date(n.sentAt) < new Date(filterFrom + "T00:00:00"))
          return false;
      }
      if (filterTo) {
        if (new Date(n.sentAt) > new Date(filterTo + "T23:59:59"))
          return false;
      }
      return true;
    });
  }, [sent, filterType, filterRead, filterFrom, filterTo]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters =
    !!filterType || filterRead !== "all" || !!filterFrom || !!filterTo;

  const clearFilters = () => {
    setFilterType("");
    setFilterRead("all");
    setFilterFrom("");
    setFilterTo("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filters card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Filtros
            </span>
            {hasFilters && (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                activos
              </Badge>
            )}
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={clearFilters}
            >
              <X className="w-3 h-3" />
              Limpiar
            </Button>
          )}
        </div>

        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Desde
            </Label>
            <Input
              type="date"
              value={filterFrom}
              onChange={(e) => {
                setFilterFrom(e.target.value);
                setPage(1);
              }}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Hasta
            </Label>
            <Input
              type="date"
              value={filterTo}
              onChange={(e) => {
                setFilterTo(e.target.value);
                setPage(1);
              }}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Tipo
            </Label>
            <Select
              value={filterType}
              onValueChange={(v) => {
                setFilterType(v as NotificationType | "");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los tipos</SelectItem>
                <SelectItem value="INFORMATIVA">Informativa</SelectItem>
                <SelectItem value="URGENTE">Urgente</SelectItem>
                <SelectItem value="RECORDATORIO">Recordatorio</SelectItem>
                <SelectItem value="ALERTA">Alerta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Estado de lectura
            </Label>
            <Select
              value={filterRead}
              onValueChange={(v) => {
                setFilterRead(v as "all" | "read" | "unread");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="read">Leídos</SelectItem>
                <SelectItem value="unread">No leídos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results summary */}
      <div className="flex items-center gap-2 px-1">
        <History className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          {filtered.length === 0
            ? "Sin resultados"
            : `${filtered.length} notificación${filtered.length !== 1 ? "es" : ""} enviada${filtered.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3">
                Destinatario
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3">
                Asunto
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 hidden sm:table-cell">
                Tipo
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3 hidden md:table-cell">
                Fecha envío
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide py-3">
                Estado
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-14 text-muted-foreground text-sm"
                >
                  <p className="font-medium">No hay notificaciones</p>
                  <p className="text-xs mt-1">
                    {hasFilters
                      ? "Prueba ajustando los filtros"
                      : "Aún no has enviado ninguna notificación"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((n) => (
                <TableRow
                  key={n.id}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <TableCell className="py-3.5">
                    <p className="text-sm font-medium text-foreground">
                      {n.recipientName}
                    </p>
                  </TableCell>
                  <TableCell className="py-3.5 max-w-[200px]">
                    <p className="text-sm text-foreground truncate">
                      {n.subject}
                    </p>
                  </TableCell>
                  <TableCell className="py-3.5 hidden sm:table-cell">
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-5 px-1.5 font-medium ${
                        TYPE_CONFIG[n.type].class
                      }`}
                    >
                      {TYPE_CONFIG[n.type].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5 hidden md:table-cell">
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatDate(n.sentAt)}
                    </p>
                  </TableCell>
                  <TableCell className="py-3.5">
                    {n.read ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        Leído
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                        No leído
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(n.id)}
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {filtered.length > PAGE_SIZE && (
          <div className="border-t border-border">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              limit={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar notificación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) { removeNotification(deleteId); setDeleteId(null); } }}
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
