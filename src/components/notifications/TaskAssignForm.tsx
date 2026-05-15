"use client";

import { useState, useRef } from "react";
import { ClipboardList, Send, User, Paperclip, X, FileText, AlertCircle, CheckIcon } from "lucide-react";
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
import type { TaskPriority, AssignTaskPayload } from "@/types";

/* ── Constants ────────────────────────────────────────── */

const PRIORITIES: { value: TaskPriority; label: string; class: string }[] = [
  { value: "ALTA",  label: "Alta",  class: "bg-red-100 text-red-700 border-red-200"    },
  { value: "MEDIA", label: "Media", class: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "BAJA",  label: "Baja",  class: "bg-green-100 text-green-700 border-green-200"  },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  NOTARIO: "Notario",
  MATRIZADOR: "Matrizador",
  ARCHIVADOR: "Archivador",
};

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXT = ".pdf,.doc,.docx";
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/* Only letters (including Spanish) + digits + spaces */
const ALPHANUMERIC_RE = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s]*$/;
const ALLOWED_KEY_RE  = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s]$/;

const ITEM_BASE =
  "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50";

/* ── Helpers ──────────────────────────────────────────── */

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  return "DOC";
}

/* ── Form state ───────────────────────────────────────── */

interface FormState {
  recipientId: string;
  title: string;
  description: string;
  priority: TaskPriority | "";
  dueDate: string;
}

interface AttachmentMeta {
  name: string;
  size: number;
  mimeType: string;
}

interface FieldErrors {
  recipientId?: string;
  title?: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  attachment?: string;
}

const EMPTY: FormState = {
  recipientId: "",
  title: "",
  description: "",
  priority: "",
  dueDate: "",
};

/* ── Component ────────────────────────────────────────── */

export function TaskAssignForm() {
  const { createTask, users, usersLoading } = useNotifications();
  const [form, setForm]           = useState<FormState>(EMPTY);
  const [attachment, setAttachment] = useState<AttachmentMeta | null>(null);
  const [errors, setErrors]       = useState<FieldErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Validation ─────────────────────────────────────── */

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!form.recipientId) e.recipientId = "Selecciona un destinatario";
    if (!form.title.trim()) {
      e.title = "El título es obligatorio";
    } else if (!ALPHANUMERIC_RE.test(form.title)) {
      e.title = "Solo se permiten letras y números";
    } else if (form.title.length > 100) {
      e.title = "Máximo 100 caracteres";
    }
    if (!form.description.trim()) {
      e.description = "La descripción es obligatoria";
    } else if (!ALPHANUMERIC_RE.test(form.description)) {
      e.description = "Solo se permiten letras y números";
    } else if (form.description.length > 500) {
      e.description = "Máximo 500 caracteres";
    }
    if (!form.priority)    e.priority  = "Selecciona la prioridad";
    if (!form.dueDate)     e.dueDate   = "La fecha límite es obligatoria";
    else if (new Date(form.dueDate) < new Date(new Date().toDateString()))
      e.dueDate = "La fecha debe ser hoy o posterior";
    return e;
  };

  /* ── Key filter — block non-alphanumeric ─────────────── */

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const ctrl = ["Backspace","Delete","ArrowLeft","ArrowRight","Home","End","Tab","Enter"];
    if (ctrl.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!ALLOWED_KEY_RE.test(e.key)) e.preventDefault();
  };

  const handlePaste = (
    field: "title" | "description",
    max: number,
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    e.preventDefault();
    const raw   = e.clipboardData.getData("text");
    const clean = raw.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s]/g, "").slice(0, max);
    const el    = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end   = el.selectionEnd   ?? 0;
    const next  = (el.value.slice(0, start) + clean + el.value.slice(end)).slice(0, max);
    setForm((f) => ({ ...f, [field]: next }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  /* ── File handling ───────────────────────────────────── */

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrors((er) => ({ ...er, attachment: "Solo se aceptan archivos PDF, DOC o DOCX" }));
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setErrors((er) => ({ ...er, attachment: `El archivo no puede superar ${MAX_SIZE_MB} MB` }));
      e.target.value = "";
      return;
    }
    setAttachment({ name: file.name, size: file.size, mimeType: file.type });
    setErrors((er) => ({ ...er, attachment: undefined }));
    e.target.value = "";
  };

  /* ── Submit ──────────────────────────────────────────── */

  const handleSubmit = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setIsSending(true);
    const payload: AssignTaskPayload = {
      recipientId:  form.recipientId,
      title:        form.title.trim(),
      description:  form.description.trim(),
      priority:     form.priority as TaskPriority,
      dueDate:      form.dueDate,
      attachment:   attachment ?? undefined,
    };
    const ok = await createTask(payload);
    setIsSending(false);
    setConfirmOpen(false);
    if (ok) { setForm(EMPTY); setAttachment(null); setErrors({}); }
  };

  /* ── Computed ────────────────────────────────────────── */

  const recipientName =
    form.recipientId
      ? (() => {
          const u = users.find((u) => u.id === form.recipientId);
          return u ? `${u.firstName} ${u.lastName}` : "";
        })()
      : "";

  const selectedPriority = PRIORITIES.find((p) => p.value === form.priority);

  /* ── Render ─────────────────────────────────────────── */

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form card */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Asignar tarea</h2>
              <p className="text-xs text-muted-foreground">
                Solo letras y números · Puedes adjuntar PDF o Word
              </p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Row 1: Destinatario + Prioridad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Destinatario</Label>
                <Select
                  value={form.recipientId}
                  onValueChange={(v) => {
                    setForm((f) => ({ ...f, recipientId: v ?? "" }));
                    setErrors((er) => ({ ...er, recipientId: undefined }));
                  }}
                >
                  <SelectTrigger
                    className={cn("h-9 w-full text-sm", errors.recipientId && "border-destructive")}
                    disabled={usersLoading}
                  >
                    <SelectValue placeholder={usersLoading ? "Cargando usuarios…" : "Seleccionar…"}>
                      {form.recipientId
                        ? (() => {
                            const u = users.find((u) => u.id === form.recipientId);
                            return u ? `${u.firstName} ${u.lastName}` : null;
                          })()
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} className="min-w-[240px]">
                    {users.map((u) => (
                      <SelectPrimitive.Item key={u.id} value={u.id} className={ITEM_BASE}>
                        <SelectPrimitive.ItemText className="flex flex-1 items-center gap-2 text-sm">
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium">{u.firstName} {u.lastName}</span>
                        </SelectPrimitive.ItemText>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {ROLE_LABELS[u.roles[0]] ?? u.roles[0]}
                        </span>
                        <SelectPrimitive.ItemIndicator
                          render={<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />}
                        >
                          <CheckIcon className="w-3.5 h-3.5" />
                        </SelectPrimitive.ItemIndicator>
                      </SelectPrimitive.Item>
                    ))}
                  </SelectContent>
                </Select>
                {errors.recipientId && <p className="text-xs text-destructive">{errors.recipientId}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Prioridad</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => {
                    setForm((f) => ({ ...f, priority: v as TaskPriority }));
                    setErrors((er) => ({ ...er, priority: undefined }));
                  }}
                >
                  <SelectTrigger className={cn("h-9 w-full text-sm", errors.priority && "border-destructive")}>
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-medium ${p.class}`}>
                          {p.label}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.priority && <p className="text-xs text-destructive">{errors.priority}</p>}
              </div>
            </div>

            {/* Row 2: Título + Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Título de la tarea</Label>
                  <span className={cn("text-xs tabular-nums", form.title.length > 90 ? "text-destructive font-medium" : "text-muted-foreground")}>
                    {form.title.length}/100
                  </span>
                </div>
                <Input
                  placeholder="Ej: Revision de escritura 4521"
                  maxLength={100}
                  value={form.title}
                  onKeyDown={handleKeyDown}
                  onPaste={(e) => handlePaste("title", 100, e)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({ ...f, title: v }));
                    setErrors((er) => ({ ...er, title: undefined }));
                  }}
                  className={cn("h-9 text-sm", errors.title && "border-destructive")}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Fecha límite</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, dueDate: e.target.value }));
                    setErrors((er) => ({ ...er, dueDate: undefined }));
                  }}
                  className={cn("h-9 text-sm", errors.dueDate && "border-destructive")}
                />
                {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate}</p>}
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Descripción</Label>
                <span className={cn("text-xs tabular-nums", form.description.length > 470 ? "text-destructive font-medium" : "text-muted-foreground")}>
                  {form.description.length}/500
                </span>
              </div>
              <Textarea
                placeholder="Describe la tarea con detalle"
                maxLength={500}
                rows={5}
                value={form.description}
                onKeyDown={handleKeyDown}
                onPaste={(e) => handlePaste("description", 500, e)}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({ ...f, description: v }));
                  setErrors((er) => ({ ...er, description: undefined }));
                }}
                className={cn("resize-none text-sm leading-relaxed", errors.description && "border-destructive")}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            </div>

            {/* Adjunto */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Adjunto <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>

              {attachment ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex-shrink-0">
                    {getFileIcon(attachment.mimeType)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => { setAttachment(null); setErrors((er) => ({ ...er, attachment: undefined })); }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 text-sm",
                    "text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/30",
                    "transition-colors cursor-pointer",
                    errors.attachment && "border-destructive"
                  )}
                >
                  <Paperclip className="w-4 h-4 shrink-0" />
                  <span>Haz clic para adjuntar PDF, DOC o DOCX (máx. {MAX_SIZE_MB} MB)</span>
                </button>
              )}

              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_EXT}
                className="hidden"
                onChange={handleFile}
              />

              {errors.attachment && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.attachment}
                </p>
              )}
            </div>

            <div className="pt-1">
              <Button onClick={handleSubmit} className="gap-2">
                <Send className="w-4 h-4" />
                Asignar tarea
              </Button>
            </div>
          </div>
        </div>

        {/* Side info */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Prioridades</h3>
            <div className="space-y-3">
              {PRIORITIES.map((p) => (
                <div key={p.value} className="flex items-center gap-2.5">
                  <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-medium shrink-0 ${p.class}`}>
                    {p.label}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {p.value === "ALTA"  && "Atención inmediata requerida"}
                    {p.value === "MEDIA" && "Completar en el plazo indicado"}
                    {p.value === "BAJA"  && "Sin urgencia, cuando sea posible"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Archivos permitidos
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-muted-foreground/50" /> PDF</li>
              <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-muted-foreground/50" /> Word (.doc)</li>
              <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-muted-foreground/50" /> Word (.docx)</li>
              <li className="flex items-center gap-1.5 text-muted-foreground/70"><span className="w-1 h-1 rounded-full bg-muted-foreground/30" /> Máximo {MAX_SIZE_MB} MB</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar asignación</DialogTitle>
            <DialogDescription>
              ¿Asignar esta tarea a{" "}
              <span className="font-semibold text-foreground">{recipientName}</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-muted/40 divide-y divide-border text-sm">
            {[
              { label: "Título",     value: form.title },
              { label: "Prioridad", value: selectedPriority
                  ? <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-medium ${selectedPriority.class}`}>{selectedPriority.label}</Badge>
                  : null },
              { label: "Fecha límite", value: form.dueDate
                  ? new Intl.DateTimeFormat("es-EC",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(form.dueDate + "T12:00:00"))
                  : null },
              ...(attachment ? [{ label: "Adjunto", value: attachment.name }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">{label}</span>
                <span className="font-medium text-right text-sm">{value}</span>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isSending}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={isSending} className="gap-2">
              {isSending ? (
                <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Asignando...</>
              ) : (
                <><Send className="w-4 h-4" />Confirmar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
