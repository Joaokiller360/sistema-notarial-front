"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  Calendar,
  User,
  Paperclip,
  CheckCheck,
  Clock,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotifications } from "@/hooks";
import { usePermissions } from "@/hooks";
import type { Task, TaskStatus, TaskPriority } from "@/types";

/* ── Config ───────────────────────────────────────────── */

const PRIORITY_CFG: Record<TaskPriority, { label: string; class: string; dot: string }> = {
  ALTA:  { label: "Alta",  class: "bg-red-100 text-red-700 border-red-200",       dot: "bg-red-500"    },
  MEDIA: { label: "Media", class: "bg-yellow-100 text-yellow-700 border-yellow-200", dot: "bg-yellow-500" },
  BAJA:  { label: "Baja",  class: "bg-green-100 text-green-700 border-green-200",   dot: "bg-green-500"  },
};

const STATUS_CFG: Record<TaskStatus, { label: string; class: string; icon: React.ElementType }> = {
  PENDIENTE:    { label: "Pendiente",    class: "bg-orange-100 text-orange-700 border-orange-200", icon: Clock        },
  EN_PROGRESO:  { label: "En progreso",  class: "bg-blue-100 text-blue-700 border-blue-200",       icon: AlertCircle  },
  COMPLETADA:   { label: "Completada",   class: "bg-green-100 text-green-700 border-green-200",    icon: CheckCheck   },
};

const formatDate = (s: string) =>
  new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(s + "T12:00:00"));

const formatDateTime = (s: string) =>
  new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(s));

function formatBytes(bytes: number) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/* ── Component ────────────────────────────────────────── */

export function MyTasksList() {
  const { myTasks, assignedTasks, changeTaskStatus, readTask, removeTask } = useNotifications();
  const { isSuperAdmin, isNotario } = usePermissions();
  const isSender = isSuperAdmin() || isNotario();

  const [view, setView]         = useState<"received" | "assigned">("received");
  const [selected, setSelected] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (!deleteId) return;
    if (selected?.id === deleteId) setSelected(null);
    removeTask(deleteId);
    setDeleteId(null);
  };

  const tasks = view === "received" ? myTasks : assignedTasks;

  const handleOpen = (t: Task) => {
    setSelected(t);
    if (!t.readByRecipient) readTask(t.id);
  };

  const unreadReceived = myTasks.filter((t) => !t.readByRecipient).length;

  return (
    <>
      <div className="space-y-4">
        {/* Sub-tabs (only for senders) */}
        {isSender && (
          <div className="flex gap-1 bg-muted/40 rounded-lg p-1 w-fit">
            {(["received", "assigned"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === v
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "received" ? "Recibidas" : "Asignadas por mí"}
                {v === "received" && unreadReceived > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {unreadReceived}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Summary */}
        <p className="text-xs text-muted-foreground px-0.5">
          {tasks.length === 0
            ? "Sin tareas"
            : `${tasks.length} tarea${tasks.length !== 1 ? "s" : ""}`}
        </p>

        {/* Empty state */}
        {tasks.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-14 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Sin tareas</p>
              <p className="text-xs text-muted-foreground mt-1">
                {view === "received" ? "No tienes tareas asignadas" : "Aún no has asignado tareas"}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/60">
            {tasks.map((t) => {
              const pri = PRIORITY_CFG[t.priority];
              const sta = STATUS_CFG[t.status];
              const overdue = t.status !== "COMPLETADA" && new Date(t.dueDate + "T23:59:59") < new Date();

              return (
                <div key={t.id} className="relative group">
                <button
                  onClick={() => handleOpen(t)}
                  className={`w-full text-left px-4 py-4 flex items-start gap-3.5 transition-colors hover:bg-muted/40 pr-10 ${
                    !t.readByRecipient && view === "received" ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                  }`}
                >
                  {/* Unread dot */}
                  <div className="mt-1 flex-shrink-0 w-2.5">
                    {!t.readByRecipient && view === "received" && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 block" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-sm leading-snug ${!t.readByRecipient && view === "received" ? "font-semibold" : "font-medium"} text-foreground`}>
                        {t.title}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {overdue && (
                          <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                            Vencida
                          </span>
                        )}
                        <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-medium hidden sm:inline-flex ${sta.class}`}>
                          {sta.label}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {view === "received" ? t.senderName : t.recipientName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(t.dueDate)}
                      </span>
                      {t.attachment && (
                        <span className="flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          Adjunto
                        </span>
                      )}
                    </div>
                  </div>

                  <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-medium shrink-0 ${pri.class}`}>
                    {pri.label}
                  </Badge>
                </button>
                {/* Delete — visible on hover */}
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteId(t.id); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-destructive hover:bg-destructive/10 transition-all"
                  title="Eliminar tarea"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-[500px] flex flex-col p-0 overflow-hidden">
          {selected && (() => {
            const pri = PRIORITY_CFG[selected.priority];
            const sta = STATUS_CFG[selected.status];
            const overdue = selected.status !== "COMPLETADA" && new Date(selected.dueDate + "T23:59:59") < new Date();

            return (
              <>
                {/* Header strip */}
                <div className="px-6 pt-6 pb-4 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-2 mb-3 pr-8">
                    <Badge variant="outline" className={`text-xs font-medium ${pri.class}`}>
                      {pri.label}
                    </Badge>
                    <Badge variant="outline" className={`text-xs font-medium ${sta.class}`}>
                      {sta.label}
                    </Badge>
                    {overdue && (
                      <Badge variant="outline" className="text-xs font-medium bg-red-100 text-red-700 border-red-200">
                        Vencida
                      </Badge>
                    )}
                  </div>
                  <SheetTitle className="text-base font-semibold leading-snug pr-2">
                    {selected.title}
                  </SheetTitle>
                </div>

                {/* Meta */}
                <div className="px-6 py-4 border-b border-border bg-muted/10">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <dt className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        {view === "received" ? "Asignado por" : "Asignado a"}
                      </dt>
                      <dd className="font-medium">
                        {view === "received" ? selected.senderName : selected.recipientName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fecha límite</dt>
                      <dd className={`font-medium ${overdue ? "text-red-600" : ""}`}>
                        {formatDate(selected.dueDate)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Asignada el</dt>
                      <dd className="text-muted-foreground text-sm">{formatDateTime(selected.createdAt)}</dd>
                    </div>
                  </dl>
                </div>

                {/* Description */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Descripción</p>
                    <p className="text-sm text-foreground leading-relaxed">{selected.description}</p>
                  </div>

                  {/* Attachment */}
                  {selected.attachment && (
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Adjunto</p>
                      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                          {selected.attachment.mimeType === "application/pdf" ? "PDF" : "DOC"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{selected.attachment.name}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(selected.attachment.size)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status update — only receiver can change */}
                  {view === "received" && selected.status !== "COMPLETADA" && (
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Actualizar estado
                      </p>
                      <Select
                        value={selected.status}
                        onValueChange={(v) => {
                          changeTaskStatus(selected.id, v as TaskStatus);
                          setSelected((prev) => prev ? { ...prev, status: v as TaskStatus } : null);
                        }}
                      >
                        <SelectTrigger className="h-9 w-full text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDIENTE">
                            <span className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-orange-500" /> Pendiente
                            </span>
                          </SelectItem>
                          <SelectItem value="EN_PROGRESO">
                            <span className="flex items-center gap-2">
                              <AlertCircle className="w-3.5 h-3.5 text-blue-500" /> En progreso
                            </span>
                          </SelectItem>
                          <SelectItem value="COMPLETADA">
                            <span className="flex items-center gap-2">
                              <CheckCheck className="w-3.5 h-3.5 text-green-500" /> Completada
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Sheet footer — delete */}
                <div className="px-6 py-4 border-t border-border bg-muted/20 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteId(selected.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar tarea
                  </Button>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La tarea se eliminará permanentemente.
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
    </>
  );
}
