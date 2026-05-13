"use client";

import { useEffect } from "react";
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

export default function SystemSettingsPage() {
  const { config, isLoading, fetchConfig, updateConfig } = useSystemSettings();

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
    formState: { errors: versionErrors, isDirty: isVersionDirty, isSubmitting: isSubmittingVersion },
  } = useForm<VersionFormData>({
    resolver: zodResolver(versionSchema),
    defaultValues: { systemVersion: "1.0.0" },
  });

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

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
                <Input placeholder="Notaría Primera del Cantón..." />
              </div>
              <div className="space-y-1.5">
                <Label>Número de Notaría</Label>
                <Input placeholder="001" />
              </div>
              <div className="space-y-1.5">
                <Label>Notario Titular</Label>
                <Input placeholder="Dr. Juan Pérez" />
              </div>
              <Button className="text-primary-foreground cursor-pointer">Guardar Información</Button>
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
                    disabled={isLoading}
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
