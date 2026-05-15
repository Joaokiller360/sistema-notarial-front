"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Settings, Shield, AlertTriangle, Save, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/common/PageHeader";
import { RoleGuard } from "@/guards";
import { EmptyState } from "@/components/common/EmptyState";
import { useSystemSettings } from "@/hooks";
import { notaryService } from "@/services";
import { useNotaryStore } from "@/store";
import { toast } from "sonner";
import { toTitleCase } from "@/utils/formatters";

const fileConfigSchema = z.object({
  maxPdfSizeMb: z
    .number()
    .int("Debe ser un número entero")
    .min(1, "El mínimo es 1 MB")
    .max(500, "El máximo permitido es 500 MB"),
  maxPdfImages: z
    .number()
    .int("Debe ser un número entero")
    .min(1, "El mínimo es 1 imagen")
    .max(5000, "El máximo permitido es 5000 imágenes"),
});

const versionSchema = z.object({
  systemVersion: z
    .string()
    .min(1, "La versión no puede estar vacía")
    .max(30, "Máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9.\-_]+$/, "Solo letras, números, puntos, guiones y guiones bajos"),
});

type FileConfigFormData = z.infer<typeof fileConfigSchema>;
type VersionFormData = z.infer<typeof versionSchema>;

const NAME_MAX = 100;
const STRIP_NOTARY_NAME = /[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,'\-]/g;
const ALLOWED_NOTARY_NAME_KEY = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,'\-]$/;
const STRIP_OFFICER_NAME = /[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'\-]/g;
const ALLOWED_OFFICER_NAME_KEY = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'\-]$/;

export default function SystemSettingsPage() {
  const { config, isLoading, fetchConfig, updateConfig } = useSystemSettings();
  const { notaryData, notaryId, setNotaryData, setNotaryId } = useNotaryStore();

  const [notaryName, setNotaryName] = useState(notaryData?.notaryName ?? "");
  const [notaryNumber, setNotaryNumber] = useState(notaryData?.notaryNumber?.toString() ?? "");
  const [officerName, setOfficerName] = useState(notaryData?.notaryOfficerName ?? "");
  const [isSavingNotary, setIsSavingNotary] = useState(false);

  // ── Nombre de la Notaría ──────────────────────────────────────────────────
  const handleNotaryNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key.length > 1 || e.ctrlKey || e.metaKey) return;
    if (!ALLOWED_NOTARY_NAME_KEY.test(e.key)) e.preventDefault();
  };
  const handleNotaryNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = e.target.value.replace(STRIP_NOTARY_NAME, "").slice(0, NAME_MAX);
    e.target.value = filtered;
    setNotaryName(filtered);
  };
  const handleNotaryNamePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const clean = e.clipboardData.getData("text").replace(STRIP_NOTARY_NAME, "").replace(/\s+/g, " ").trim();
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const newVal = (el.value.slice(0, start) + clean + el.value.slice(end)).slice(0, NAME_MAX);
    el.value = newVal;
    setNotaryName(newVal);
  };

  // ── Número de Notaría ─────────────────────────────────────────────────────
  const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key.length > 1 || e.ctrlKey || e.metaKey) return;
    if (!/^\d$/.test(e.key)) { e.preventDefault(); return; }
    const el = e.currentTarget;
    const hasSelection = el.selectionStart !== el.selectionEnd;
    if (!hasSelection && el.value.replace(/\D/g, "").length >= 3) e.preventDefault();
  };
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
    e.target.value = digits;
    setNotaryNumber(digits);
  };
  const handleNumberPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 3);
    e.currentTarget.value = digits;
    setNotaryNumber(digits);
  };

  // ── Notario Titular ───────────────────────────────────────────────────────
  const handleOfficerNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key.length > 1 || e.ctrlKey || e.metaKey) return;
    if (!ALLOWED_OFFICER_NAME_KEY.test(e.key)) e.preventDefault();
  };
  const handleOfficerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = e.target.value.replace(STRIP_OFFICER_NAME, "").slice(0, NAME_MAX);
    e.target.value = filtered;
    setOfficerName(filtered);
  };
  const handleOfficerNamePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const clean = e.clipboardData.getData("text").replace(STRIP_OFFICER_NAME, "").replace(/\s+/g, " ").trim();
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const newVal = (el.value.slice(0, start) + clean + el.value.slice(end)).slice(0, NAME_MAX);
    el.value = newVal;
    setOfficerName(newVal);
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting: isSubmittingFiles },
  } = useForm<FileConfigFormData>({
    resolver: zodResolver(fileConfigSchema),
    defaultValues: { maxPdfSizeMb: 10, maxPdfImages: 20 },
  });

  const {
    register: registerVersion,
    handleSubmit: handleSubmitVersion,
    reset: resetVersion,
    setValue: setVersionValue,
    formState: { errors: versionErrors, isDirty: isVersionDirty, isSubmitting: isSubmittingVersion },
  } = useForm<VersionFormData>({
    resolver: zodResolver(versionSchema),
    defaultValues: { systemVersion: "1.0.0" },
  });

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    notaryService.get().then((data) => {
      if (data) {
        setNotaryName(data.notaryName);
        setNotaryNumber(data.notaryNumber.toString());
        setOfficerName(data.notaryOfficerName);
        setNotaryData({ notaryName: data.notaryName, notaryNumber: data.notaryNumber, notaryOfficerName: data.notaryOfficerName });
        setNotaryId(data.id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (config) {
      reset({ maxPdfSizeMb: config.maxPdfSizeMb, maxPdfImages: config.maxPdfImages });
      resetVersion({ systemVersion: config.systemVersion ?? "1.0.0" });
    }
  }, [config, reset, resetVersion]);

  const onSubmitFileConfig = async (data: FileConfigFormData) => {
    try {
      await updateConfig({ maxPdfSizeMb: data.maxPdfSizeMb, maxPdfImages: data.maxPdfImages });
      reset({ maxPdfSizeMb: data.maxPdfSizeMb, maxPdfImages: data.maxPdfImages });
    } catch {
      // toast already shown by the hook
    }
  };

  const handleSaveNotary = async () => {
    const num = parseInt(notaryNumber, 10);
    if (!notaryName.trim() || !notaryNumber || isNaN(num) || num < 1 || num > 999 || !officerName.trim()) {
      toast.error("Completa todos los campos correctamente");
      return;
    }
    const titledName = toTitleCase(notaryName.trim());
    const titledOfficer = toTitleCase(officerName.trim());
    const payload = { notaryName: titledName, notaryNumber: num, notaryOfficerName: titledOfficer };
    setIsSavingNotary(true);
    try {
      if (notaryId) {
        await notaryService.update(notaryId, payload);
      } else {
        const response = await notaryService.create(payload);
        setNotaryId(response.id);
      }
      setNotaryName(titledName);
      setOfficerName(titledOfficer);
      setNotaryData(payload);
      toast.success("Información de la notaría guardada");
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Error al guardar la información");
    } finally {
      setIsSavingNotary(false);
    }
  };

  const handleVersionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const control = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Home", "End", "Tab"];
    if (control.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/^[a-zA-Z0-9.\-_]$/.test(e.key)) e.preventDefault();
  };

  const handleVersionPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const clean = pasted.replace(/[^a-zA-Z0-9.\-_]/g, "").slice(0, 30);
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const newVal = (el.value.slice(0, start) + clean + el.value.slice(end)).slice(0, 30);
    setVersionValue("systemVersion", newVal, { shouldValidate: true });
  };

  const onSubmitVersion = async (data: VersionFormData) => {
    try {
      await updateConfig({ systemVersion: data.systemVersion });
      resetVersion({ systemVersion: data.systemVersion });
    } catch {
      // toast already shown by the hook
    }
  };

  return (
    <RoleGuard
      roles={["SUPER_ADMIN"]}
      fallback={
        <EmptyState
          icon={Shield}
          title="Acceso Restringido"
          description="Solo el Super Administrador puede acceder a la configuración del sistema."
        />
      }
    >
      <div className="space-y-6">
        <PageHeader
          title="Configuración del Sistema"
          description="Ajustes globales del sistema notarial"
        />

        <div className="max-w-2xl space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Información de la Notaría
              </CardTitle>
              <CardDescription>
                Datos institucionales que aparecen en documentos y reportes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nombre de la Notaría</Label>
                <Input
                  placeholder="Notaría Primera del Cantón..."
                  value={notaryName}
                  maxLength={NAME_MAX}
                  onKeyDown={handleNotaryNameKeyDown}
                  onChange={handleNotaryNameChange}
                  onPaste={handleNotaryNamePaste}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {notaryName.length}/{NAME_MAX}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Número de Notaría</Label>
                <Input
                  placeholder="001"
                  type="number"
                  min={1}
                  max={999}
                  value={notaryNumber}
                  onKeyDown={handleNumberKeyDown}
                  onChange={handleNumberChange}
                  onPaste={handleNumberPaste}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notario Titular</Label>
                <Input
                  placeholder="Dr. Juan Pérez"
                  value={officerName}
                  maxLength={NAME_MAX}
                  onKeyDown={handleOfficerNameKeyDown}
                  onChange={handleOfficerNameChange}
                  onPaste={handleOfficerNamePaste}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {officerName.length}/{NAME_MAX}
                </p>
              </div>
              <Button
                type="button"
                className="text-primary-foreground cursor-pointer"
                onClick={handleSaveNotary}
                disabled={isSavingNotary}
              >
                {isSavingNotary ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Guardando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Guardar Información
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                Configuración de Archivos
              </CardTitle>
              <CardDescription>
                Límites y restricciones para la carga de archivos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmitFileConfig)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="maxPdfSizeMb">Tamaño máximo de PDF (MB)</Label>
                  <Input
                    id="maxPdfSizeMb"
                    type="number"
                    min={1}
                    max={500}
                    disabled={isLoading}
                    {...register("maxPdfSizeMb", { valueAsNumber: true })}
                  />
                  {errors.maxPdfSizeMb && (
                    <p className="text-xs text-destructive">{errors.maxPdfSizeMb.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Los archivos PDF que superen este límite serán rechazados al subirse.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="maxPdfImages">Máximo de imágenes por PDF generado</Label>
                  <Input
                    id="maxPdfImages"
                    type="number"
                    min={1}
                    max={5000}
                    disabled={isLoading}
                    {...register("maxPdfImages", { valueAsNumber: true })}
                  />
                  {errors.maxPdfImages && (
                    <p className="text-xs text-destructive">{errors.maxPdfImages.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Límite de imágenes al generar un PDF desde fotos (máx. 5000).
                  </p>
                </div>

                <Button
                  type="submit"
                  className="text-primary-foreground cursor-pointer"
                  disabled={isLoading || isSubmittingFiles || !isDirty}
                >
                  {isSubmittingFiles ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Guardando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Guardar Configuración
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                Versión del Sistema
              </CardTitle>
              <CardDescription>
                Etiqueta de versión visible en el footer de la aplicación.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitVersion(onSubmitVersion)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="systemVersion">Versión actual</Label>
                  <Input
                    id="systemVersion"
                    placeholder="Ej: 1.0.0, v2.3.1-beta"
                    maxLength={30}
                    disabled={isLoading}
                    onKeyDown={handleVersionKeyDown}
                    onPaste={handleVersionPaste}
                    {...registerVersion("systemVersion")}
                  />
                  {versionErrors.systemVersion && (
                    <p className="text-xs text-destructive">{versionErrors.systemVersion.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Se muestra en el footer del dashboard para todos los usuarios.
                  </p>
                </div>
                <Button
                  type="submit"
                  className="text-primary-foreground cursor-pointer"
                  disabled={isLoading || isSubmittingVersion || !isVersionDirty}
                >
                  {isSubmittingVersion ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Guardando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Guardar Versión
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                Zona Peligrosa
              </CardTitle>
              <CardDescription>
                Acciones irreversibles que afectan al sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Separator className="border-destructive/20" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Limpiar registros de auditoría</p>
                  <p className="text-xs text-muted-foreground">Elimina logs de más de 90 días</p>
                </div>
                <Button variant="destructive" size="sm" className="text-primary-foreground cursor-pointer">
                  Limpiar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
