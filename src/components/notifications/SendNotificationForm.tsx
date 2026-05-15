"use client";

import { useState } from "react";
import { Send, Users, User, Info, CheckIcon } from "lucide-react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks";
import { cn } from "@/lib/utils";
import type { NotificationType, SendNotificationPayload } from "@/types";

const NOTIFICATION_TYPES: {
  value: NotificationType;
  label: string;
  description: string;
  badgeClass: string;
}[] = [
  {
    value: "INFORMATIVA",
    label: "Informativa",
    description: "Avisos generales sin urgencia",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    value: "URGENTE",
    label: "Urgente",
    description: "Requiere atención inmediata",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
  },
  {
    value: "RECORDATORIO",
    label: "Recordatorio",
    description: "Plazos y fechas importantes",
    badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  {
    value: "ALERTA",
    label: "Alerta",
    description: "Situación que requiere revisión",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
  },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  NOTARIO: "Notario",
  MATRIZADOR: "Matrizador",
  ARCHIVADOR: "Archivador",
};

interface FormState {
  recipientId: string;
  subject: string;
  message: string;
  type: NotificationType | "";
}

const EMPTY_FORM: FormState = {
  recipientId: "",
  subject: "",
  message: "",
  type: "",
};

/* Styles shared with the custom SelectItem in select.tsx */
const ITEM_BASE =
  "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50";

export function SendNotificationForm() {
  const { send, users, usersLoading } = useNotifications();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const isValid =
    form.recipientId !== "" &&
    form.subject.trim() !== "" &&
    form.message.trim() !== "" &&
    form.type !== "";

  const selectedType = NOTIFICATION_TYPES.find((t) => t.value === form.type);

  const recipientLabel =
    form.recipientId === "ALL"
      ? "todos los usuarios"
      : (() => {
          const u = users.find((u) => u.id === form.recipientId);
          return u ? `${u.firstName} ${u.lastName}` : "";
        })();

  const handleConfirm = async () => {
    setIsSending(true);
    const ok = await send(form as SendNotificationPayload);
    setIsSending(false);
    setConfirmOpen(false);
    if (ok) setForm(EMPTY_FORM);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main form */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <h2 className="text-sm font-semibold text-foreground">
              Redactar notificación
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Completa todos los campos para habilitar el envío
            </p>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Row 1: Destinatario + Asunto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Destinatario — raw base-ui para separar trigger de dropdown */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Destinatario</Label>
                <Select
                  value={form.recipientId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, recipientId: v ?? "" }))
                  }
                >
                  <SelectTrigger className="h-9 w-full text-sm" disabled={usersLoading}>
                    <SelectValue placeholder={usersLoading ? "Cargando usuarios…" : "Seleccionar…"}>
                      {form.recipientId === "ALL"
                        ? "Todos los usuarios"
                        : form.recipientId
                        ? (() => {
                            const u = users.find((u) => u.id === form.recipientId);
                            return u ? `${u.firstName} ${u.lastName}` : null;
                          })()
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    alignItemWithTrigger={false}
                    className="min-w-[240px]"
                  >
                    {/* "Todos" item — name only in ItemText */}
                    <SelectPrimitive.Item
                      value="ALL"
                      className={ITEM_BASE}
                    >
                      <SelectPrimitive.ItemText className="flex flex-1 items-center gap-2 text-sm">
                        <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-medium">Todos los usuarios</span>
                      </SelectPrimitive.ItemText>
                      <span className="text-xs text-muted-foreground ml-1">
                        — masivo
                      </span>
                      <SelectPrimitive.ItemIndicator
                        render={
                          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
                        }
                      >
                        <CheckIcon className="w-3.5 h-3.5" />
                      </SelectPrimitive.ItemIndicator>
                    </SelectPrimitive.Item>

                    {users.map((u) => (
                      <SelectPrimitive.Item
                        key={u.id}
                        value={u.id}
                        className={ITEM_BASE}
                      >
                        {/* Solo el nombre va en ItemText → es lo que muestra el trigger */}
                        <SelectPrimitive.ItemText className="flex flex-1 items-center gap-2 text-sm">
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium">
                            {u.firstName} {u.lastName}
                          </span>
                        </SelectPrimitive.ItemText>
                        {/* El rol va fuera de ItemText → solo visible en el dropdown */}
                        <span className="text-xs text-muted-foreground shrink-0">
                          {ROLE_LABELS[u.roles[0]] ?? u.roles[0]}
                        </span>
                        <SelectPrimitive.ItemIndicator
                          render={
                            <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
                          }
                        >
                          <CheckIcon className="w-3.5 h-3.5" />
                        </SelectPrimitive.ItemIndicator>
                      </SelectPrimitive.Item>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Asunto */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Asunto</Label>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      form.subject.length > 90
                        ? "text-destructive font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {form.subject.length}/100
                  </span>
                </div>
                <Input
                  placeholder="Asunto de la notificación"
                  maxLength={100}
                  value={form.subject}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, type: v as NotificationType }))
                }
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent
                  alignItemWithTrigger={false}
                  className="min-w-[260px]"
                >
                  {NOTIFICATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] h-5 px-1.5 font-medium shrink-0 ${t.badgeClass}`}
                        >
                          {t.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {t.description}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mensaje */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Mensaje</Label>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    form.message.length > 470
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {form.message.length}/500
                </span>
              </div>
              <Textarea
                placeholder="Escribe el mensaje completo de la notificación..."
                maxLength={500}
                rows={6}
                value={form.message}
                onChange={(e) =>
                  setForm((f) => ({ ...f, message: e.target.value }))
                }
                className="resize-none text-sm leading-relaxed"
              />
            </div>

            <div className="pt-1">
              <Button
                onClick={() => isValid && setConfirmOpen(true)}
                disabled={!isValid}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Enviar notificación
              </Button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Tipos de notificación
              </h3>
            </div>
            <div className="space-y-3">
              {NOTIFICATION_TYPES.map((t) => (
                <div key={t.value} className="flex items-start gap-2.5">
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-5 px-1.5 font-medium flex-shrink-0 mt-0.5 ${t.badgeClass}`}
                  >
                    {t.label}
                  </Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {(form.subject || form.message) && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Vista previa
                </p>
              </div>
              <div className="p-4 space-y-2">
                {form.subject && (
                  <p className="text-sm font-semibold text-foreground leading-snug">
                    {form.subject}
                  </p>
                )}
                {selectedType && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-5 px-1.5 ${selectedType.badgeClass}`}
                  >
                    {selectedType.label}
                  </Badge>
                )}
                {form.message && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 mt-1">
                    {form.message}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar envío</DialogTitle>
            <DialogDescription>
              ¿Enviar esta notificación a{" "}
              <span className="font-semibold text-foreground">
                {recipientLabel}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-muted/40 divide-y divide-border text-sm">
            <div className="px-4 py-3 flex justify-between items-center gap-3">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Asunto
              </span>
              <span className="font-medium text-right">{form.subject}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center gap-3">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Tipo
              </span>
              {selectedType && (
                <Badge
                  variant="outline"
                  className={`text-[10px] h-5 px-1.5 font-medium ${selectedType.badgeClass}`}
                >
                  {selectedType.label}
                </Badge>
              )}
            </div>
            <div className="px-4 py-3 flex justify-between items-center gap-3">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Para
              </span>
              <span className="font-medium text-right capitalize">
                {recipientLabel}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isSending}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={isSending} className="gap-2">
              {isSending ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Confirmar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
