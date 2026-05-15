"use client";

import { useState } from "react";
import {
  CheckCheck, MailOpen, Mail, BellRing,
  Calendar, User, Users, Tag, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNotifications } from "@/hooks";
import type { Notification, NotificationType } from "@/types";

const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; badgeClass: string; dotClass: string; bgClass: string }
> = {
  INFORMATIVA: {
    label: "Informativa",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    dotClass:   "bg-blue-500",
    bgClass:    "bg-blue-50 dark:bg-blue-950/30",
  },
  URGENTE: {
    label: "Urgente",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    dotClass:   "bg-red-500",
    bgClass:    "bg-red-50 dark:bg-red-950/30",
  },
  RECORDATORIO: {
    label: "Recordatorio",
    badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-200",
    dotClass:   "bg-yellow-500",
    bgClass:    "bg-yellow-50 dark:bg-yellow-950/30",
  },
  ALERTA: {
    label: "Alerta",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
    dotClass:   "bg-orange-500",
    bgClass:    "bg-orange-50 dark:bg-orange-950/30",
  },
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("es-EC", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));

const formatDateShort = (iso: string) =>
  new Intl.DateTimeFormat("es-EC", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));

export function NotificationInbox() {
  const { inbox, unreadCount, readOne, readAll, removeNotification } = useNotifications();
  const [selected,  setSelected]  = useState<Notification | null>(null);
  const [deleteId,  setDeleteId]  = useState<string | null>(null);

  const handleOpen = (n: Notification) => {
    setSelected(n);
    if (!n.read) readOne(n.id);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    if (selected?.id === deleteId) setSelected(null);
    removeNotification(deleteId);
    setDeleteId(null);
  };

  return (
    <>
      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between min-h-[28px]">
          <p className="text-sm text-muted-foreground">
            {inbox.length === 0 ? (
              "Sin notificaciones"
            ) : (
              <>
                <span className="font-medium text-foreground">{inbox.length}</span>
                {` notificación${inbox.length !== 1 ? "es" : ""}`}
                {unreadCount > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    · {unreadCount} sin leer
                  </span>
                )}
              </>
            )}
          </p>
          {unreadCount > 0 && (
            <Button
              variant="ghost" size="sm"
              className="h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={readAll}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar todas como leídas
            </Button>
          )}
        </div>

        {/* Empty state */}
        {inbox.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-16 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <MailOpen className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Tu bandeja está vacía</p>
              <p className="text-xs text-muted-foreground mt-1">
                Aquí verás las notificaciones que recibas
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/60">
            {inbox.map((n) => {
              const cfg = TYPE_CONFIG[n.type];
              return (
                <div key={n.id} className="relative group">
                  <button
                    onClick={() => handleOpen(n)}
                    className={`w-full text-left px-4 py-4 flex items-start gap-3.5 transition-colors hover:bg-muted/40 pr-10 ${!n.read ? cfg.bgClass : ""}`}
                  >
                    {/* Read indicator */}
                    <div className="mt-1 flex-shrink-0 w-5 flex items-center justify-center">
                      {n.read
                        ? <Mail className="w-4 h-4 text-muted-foreground/40" />
                        : <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-sm leading-snug ${n.read ? "font-normal" : "font-semibold"} text-foreground`}>
                          {n.subject}
                        </p>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0 mt-0.5">
                          {formatDateShort(n.sentAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        De{" "}
                        <span className="font-medium text-foreground/70">{n.senderName}</span>
                        {n.recipientId === "ALL" && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 text-primary/70">
                            <Users className="w-3 h-3" />grupal
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                        {n.message}
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-5 flex-shrink-0 hidden sm:inline-flex font-medium ${cfg.badgeClass}`}
                    >
                      {cfg.label}
                    </Badge>
                  </button>

                  {/* Delete button — visible on hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteId(n.id); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-destructive hover:bg-destructive/10 transition-all"
                    title="Eliminar notificación"
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
        <SheetContent side="right" className="w-full sm:max-w-[480px] flex flex-col p-0 overflow-hidden">
          {selected && (
            <>
              <div className={`px-6 pt-6 pb-5 border-b border-border ${TYPE_CONFIG[selected.type].bgClass}`}>
                <div className="flex items-center justify-between mb-3 pr-8">
                  <Badge variant="outline" className={`text-xs font-medium ${TYPE_CONFIG[selected.type].badgeClass}`}>
                    <BellRing className="w-3 h-3 mr-1" />
                    {TYPE_CONFIG[selected.type].label}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCheck className="w-3.5 h-3.5" />Leído
                  </span>
                </div>
                <SheetTitle className="text-base font-semibold leading-snug text-foreground pr-2">
                  {selected.subject}
                </SheetTitle>
              </div>

              <div className="px-6 py-4 border-b border-border bg-muted/30">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      <User className="w-3 h-3" />Remitente
                    </dt>
                    <dd className="font-medium text-foreground text-sm">{selected.senderName}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      <Calendar className="w-3 h-3" />Fecha
                    </dt>
                    <dd className="text-foreground text-sm">{formatDate(selected.sentAt)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      <Users className="w-3 h-3" />Destinatario
                    </dt>
                    <dd className="flex items-center gap-2 text-foreground text-sm">
                      {selected.recipientId === "ALL" ? (
                        <>
                          <span>Todos los usuarios</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">grupal</Badge>
                        </>
                      ) : (
                        <span>{selected.recipientName}</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Tag className="w-3 h-3" />Mensaje
                </p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {selected.message}
                </p>
              </div>

              {/* Sheet footer */}
              <div className="px-6 py-4 border-t border-border bg-muted/20">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteId(selected.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar notificación
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar notificación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La notificación se eliminará permanentemente.
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
