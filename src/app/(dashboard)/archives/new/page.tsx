"use client";

import { useEffect, Suspense } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, FileText, Users, UserCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/common/PageHeader";
import { FileUpload } from "@/components/common/FileUpload";
import { GrantorForm } from "@/components/common/GrantorForm";
import { useArchives } from "@/hooks";
import type { ArchiveType } from "@/types";

const ARCHIVE_TYPES: { value: ArchiveType; label: string }[] = [
  { value: "A", label: "Arrendamiento" },
  { value: "C", label: "Certificación" },
  { value: "D", label: "Diligencia" },
  { value: "P", label: "Protocolo" },
  { value: "O", label: "Otro" },
];

const personSchema = z.object({
  nombresCompletos: z.string().min(2, "Nombre requerido").max(200),
  cedulaORuc: z.string().min(10, "Mínimo 10 dígitos").max(13, "Máximo 13 dígitos"),
  nacionalidad: z.string().min(2, "Nacionalidad requerida").max(100),
});

const archiveSchema = z.object({
  type: z.enum(["A", "C", "D", "O", "P"]),
  code: z.string().min(3, "Mínimo 3 caracteres").max(20, "Máximo 20 caracteres"),
  observations: z.string().max(2000).optional(),
  grantors: z.array(personSchema).min(1, "Agrega al menos un otorgante"),
  beneficiaries: z.array(personSchema).min(1, "Agrega al menos un beneficiario"),
  pdf: z.custom<File | null>().optional(),
});

type ArchiveFormData = z.infer<typeof archiveSchema>;

function NewArchiveForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultType = searchParams.get("type") as ArchiveType | null;

  const { createArchive, isSubmitting, generateCode } = useArchives();

  const methods = useForm<ArchiveFormData>({
    resolver: zodResolver(archiveSchema),
    defaultValues: {
      type: defaultType || undefined,
      code: "",
      grantors: [{ nombresCompletos: "", cedulaORuc: "", nacionalidad: "" }],
      beneficiaries: [{ nombresCompletos: "", cedulaORuc: "", nacionalidad: "" }],
      pdf: null,
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = methods;
  const pdf = watch("pdf");
  const typeValue = watch("type");

  useEffect(() => {
    setValue("code", generateCode(defaultType || undefined));
  }, [generateCode, setValue, defaultType]);

  const handleRegenCode = () => {
    setValue("code", generateCode(typeValue as ArchiveType | undefined));
  };

  const onSubmit = async (data: ArchiveFormData) => {
    const result = await createArchive({
      type: data.type,
      code: data.code,
      observations: data.observations,
      grantors: data.grantors,
      beneficiaries: data.beneficiaries,
      pdf: (data.pdf as File) || undefined,
    });
    if (result) router.push(`/archives?type=${data.type}`);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <PageHeader
          title="Nuevo Archivo"
          description="Registra un nuevo archivo notarial en el sistema"
        >
          <ButtonLink href="/archives" variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Volver
          </ButtonLink>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Guardando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Guardar Archivo
              </span>
            )}
          </Button>
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Información general */}
            <Card className="border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Información General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tipo */}
                <div className="space-y-1.5">
                  <Label>Tipo de Documento</Label>
                  <Select
                    value={typeValue || ""}
                    onValueChange={(v) => {
                      setValue("type", v as ArchiveType);
                      setValue("code", generateCode(v as ArchiveType));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo de documento" />
                    </SelectTrigger>
                    <SelectContent>
                      {ARCHIVE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && (
                    <p className="text-xs text-destructive">{errors.type.message}</p>
                  )}
                </div>

                {/* Código */}
                <div className="space-y-1.5">
                  <Label htmlFor="code">Código del Archivo</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      placeholder="ARQ-2025-00001"
                      className="font-mono"
                      {...register("code")}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleRegenCode}
                      title="Regenerar código"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  {errors.code && (
                    <p className="text-xs text-destructive">{errors.code.message}</p>
                  )}
                </div>

                {/* Observaciones */}
                <div className="space-y-1.5">
                  <Label htmlFor="observations">Observaciones</Label>
                  <Textarea
                    id="observations"
                    placeholder="Observaciones adicionales sobre el archivo..."
                    rows={3}
                    className="resize-none"
                    {...register("observations")}
                  />
                  {errors.observations && (
                    <p className="text-xs text-destructive">{errors.observations.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Otorgantes */}
            <Card className="border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Otorgantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GrantorForm fieldName="grantors" title="Lista de Otorgantes" />
                {errors.grantors?.root?.message && (
                  <p className="text-xs text-destructive mt-2">{errors.grantors.root.message}</p>
                )}
              </CardContent>
            </Card>

            {/* A favor de */}
            <Card className="border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  A Favor De
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GrantorForm
                  fieldName="beneficiaries"
                  title="Lista de Beneficiarios"
                  icon={<UserCheck className="w-4 h-4 text-muted-foreground" />}
                />
                {errors.beneficiaries?.root?.message && (
                  <p className="text-xs text-destructive mt-2">{errors.beneficiaries.root.message}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna lateral */}
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Documento PDF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload
                  value={(pdf as File) || null}
                  onChange={(file) => setValue("pdf", file)}
                  maxSizeMB={10}
                />
              </CardContent>
            </Card>

            <Card className="border-border bg-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-medium text-xs">
                    {typeValue
                      ? ARCHIVE_TYPES.find((t) => t.value === typeValue)?.label
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Código</span>
                  <span className="font-mono font-semibold text-primary text-xs">{watch("code")}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Otorgantes</span>
                  <span className="font-medium">{watch("grantors")?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Beneficiarios</span>
                  <span className="font-medium">{watch("beneficiaries")?.length || 0}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">PDF</span>
                  <span className="font-medium">{pdf ? "Adjunto" : "Sin adjunto"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

export default function NewArchivePage() {
  return (
    <Suspense>
      <NewArchiveForm />
    </Suspense>
  );
}
