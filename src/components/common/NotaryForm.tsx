"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notarySchema, sanitizeText, type NotaryFormData } from "@/schemas/notary.schema";
import { notaryService } from "@/services/notary.service";
import { useNotaryStore } from "@/store/notary.store";
import { toTitleCase } from "@/utils/formatters";

const NAME_MAX = 100;

// notaryName: letters, digits, spaces, . , - '
const STRIP_NOTARY_NAME = /[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,'\-]/g;
const ALLOWED_NOTARY_NAME_KEY = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,'\-]$/;

// notaryOfficerName: letters, spaces, - '
const STRIP_OFFICER_NAME = /[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'\-]/g;
const ALLOWED_OFFICER_NAME_KEY = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'\-]$/;

type NameField = "notaryName" | "notaryOfficerName";

const FIELD_CONFIG: Record<NameField, { strip: RegExp; allowedKey: RegExp }> = {
  notaryName: { strip: STRIP_NOTARY_NAME, allowedKey: ALLOWED_NOTARY_NAME_KEY },
  notaryOfficerName: { strip: STRIP_OFFICER_NAME, allowedKey: ALLOWED_OFFICER_NAME_KEY },
};

export function NotaryForm() {
  const { setNotaryData, setNotaryId } = useNotaryStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<NotaryFormData>({
    resolver: zodResolver(notarySchema),
    mode: "onBlur",
  });

  const notaryNameLen = (watch("notaryName") ?? "").length;
  const notaryOfficerLen = (watch("notaryOfficerName") ?? "").length;

  // ── Text fields ───────────────────────────────────────────────────────────

  // Layer 1 — block key before it reaches the input
  const handleNameKeyDown = (field: NameField) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key.length > 1 || e.ctrlKey || e.metaKey) return;
    if (!FIELD_CONFIG[field].allowedKey.test(e.key)) e.preventDefault();
  };

  // Layer 2 — sanitize pasted text
  const makeNamePasteHandler =
    (field: NameField) => (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const raw = e.clipboardData.getData("text");
      let clean: string;
      try {
        clean = sanitizeText(raw);
      } catch {
        clean = "";
      }
      clean = clean
        .replace(FIELD_CONFIG[field].strip, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, NAME_MAX);

      const el = e.currentTarget;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const newVal = (el.value.slice(0, start) + clean + el.value.slice(end)).slice(0, NAME_MAX);
      const titled = toTitleCase(newVal);

      el.value = titled;
      setValue(field, titled, { shouldValidate: true });
    };

  // Builds all props for a text field
  const makeNameProps = (field: NameField) => {
    const { onBlur: rhfOnBlur, onChange: rhfOnChange, ...rest } = register(field);
    const { strip } = FIELD_CONFIG[field];
    return {
      ...rest,
      // Layer 3 — strip chars that arrive via autocomplete / IME / drag-drop
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const filtered = raw.replace(strip, "");
        if (filtered !== raw) {
          e.target.value = filtered;
          setValue(field, filtered, { shouldDirty: true });
          return;
        }
        rhfOnChange(e);
      },
      // Layer 4 — Title Case on blur
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        const titled = toTitleCase(e.target.value);
        e.target.value = titled;
        setValue(field, titled, { shouldValidate: true });
        rhfOnBlur(e);
      },
      onKeyDown: handleNameKeyDown(field),
      onPaste: makeNamePasteHandler(field),
    };
  };

  // ── Number field ──────────────────────────────────────────────────────────

  const makeNumberProps = () => {
    const { onBlur: rhfOnBlur, onChange: rhfOnChange, ...rest } = register("notaryNumber", {
      valueAsNumber: true,
    });
    return {
      ...rest,
      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key.length > 1 || e.ctrlKey || e.metaKey) return;
        if (!/^\d$/.test(e.key)) {
          e.preventDefault();
          return;
        }
        const el = e.currentTarget;
        const hasSelection = el.selectionStart !== el.selectionEnd;
        if (!hasSelection && el.value.replace(/\D/g, "").length >= 3) {
          e.preventDefault();
        }
      },
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
        if (digits !== e.target.value) {
          e.target.value = digits;
          setValue("notaryNumber", digits ? parseInt(digits, 10) : NaN, { shouldDirty: true });
          return;
        }
        rhfOnChange(e);
      },
      onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 3);
        if (digits) {
          e.currentTarget.value = digits;
          setValue("notaryNumber", parseInt(digits, 10), { shouldValidate: true });
        }
      },
      onBlur: rhfOnBlur,
    };
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (data: NotaryFormData) => {
    try {
      const response = await notaryService.create(data);
      setNotaryData(data);
      setNotaryId(response.id);
      toast.success("Notaría registrada exitosamente");
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Error al registrar la notaría");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Datos de la notaría</span>
      </div>

      {/* Campo 1 — Nombre de la notaría */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="notaryName">Nombre de la notaría</Label>
          <span className="text-xs text-muted-foreground">
            {notaryNameLen}/{NAME_MAX}
          </span>
        </div>
        <Input
          id="notaryName"
          placeholder="Notaría Pública Central"
          maxLength={NAME_MAX}
          className={errors.notaryName ? "border-destructive focus-visible:ring-destructive" : ""}
          {...makeNameProps("notaryName")}
        />
        {errors.notaryName && (
          <p role="alert" className="text-xs text-destructive">
            {errors.notaryName.message}
          </p>
        )}
      </div>

      {/* Campo 2 — Número de la notaría */}
      <div className="space-y-1.5">
        <Label htmlFor="notaryNumber">Número de la notaría</Label>
        <Input
          id="notaryNumber"
          type="number"
          placeholder="42"
          min={1}
          max={999}
          className={errors.notaryNumber ? "border-destructive focus-visible:ring-destructive" : ""}
          {...makeNumberProps()}
        />
        {errors.notaryNumber && (
          <p role="alert" className="text-xs text-destructive">
            {errors.notaryNumber.message}
          </p>
        )}
      </div>

      {/* Campo 3 — Nombre del notario encargado */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="notaryOfficerName">Nombre del notario encargado</Label>
          <span className="text-xs text-muted-foreground">
            {notaryOfficerLen}/{NAME_MAX}
          </span>
        </div>
        <Input
          id="notaryOfficerName"
          placeholder="Juan Carlos Pérez"
          maxLength={NAME_MAX}
          className={errors.notaryOfficerName ? "border-destructive focus-visible:ring-destructive" : ""}
          {...makeNameProps("notaryOfficerName")}
        />
        {errors.notaryOfficerName && (
          <p role="alert" className="text-xs text-destructive">
            {errors.notaryOfficerName.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full cursor-pointer" disabled={!isValid || isSubmitting}>
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Guardando...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Guardar notaría
          </span>
        )}
      </Button>
    </form>
  );
}
