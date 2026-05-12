"use client";

export const dynamic = 'force-dynamic';

import { Suspense, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, FileText, Users, UserCheck } from "lucide-react";
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
import { useArchives, useSystemSettings } from "@/hooks";
import type { ArchiveType } from "@/types";

const ARCHIVE_TYPES: { value: ArchiveType; label: string }[] = [
  { value: "A", label: "Arrendamiento" },
  { value: "C", label: "Certificación" },
  { value: "D", label: "Diligencia" },
  { value: "P", label: "Protocolo" },
  { value: "O", label: "Otro" },
];

const personSchema = z
  .object({
    nombresCompletos: z.string().min(2, "Nombre requerido").max(200),
    isPasaporte: z.boolean().optional(),
    cedulaORuc: z
      .string()
      .refine((v) => !v || /^\d+$/.test(v), "La cédula/RUC debe contener solo números")
      .refine(
        (v) => !v || v.length === 10 || v.length === 13,
        "Cédula debe tener 10 dígitos o RUC 13 dígitos"
      ),
    pasaporte: z
      .string()
      .refine((v) => !v || /^[a-zA-Z0-9]+$/.test(v), "El pasaporte debe ser alfanumérico")
      .refine(
        (v) => !v || (v.length >= 5 && v.length <= 20),
        "El pasaporte debe tener entre 5 y 20 caracteres"
      )
      .optional(),
    nacionalidad: z.string().min(2, "Nacionalidad requerida").max(100),
  })
  .superRefine((data, ctx) => {
    if (data.isPasaporte && !data.pasaporte) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Pasaporte requerido", path: ["pasaporte"] });
    }
  });

const archiveSchema = z.object({
  type: z.enum(["A", "C", "D", "O", "P"]),
  code: z.string().min(1, "El código es requerido").max(17, "Máximo 17 caracteres"),
  documentDate: z.string().optional(),
  observations: z.string().max(2000).optional(),
  grantors: z.array(personSchema),
  beneficiaries: z.array(personSchema),
  pdf: z.custom<File | null>().optional(),
});

type ArchiveFormData = z.infer<typeof archiveSchema>;

function NewArchiveForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultType = searchParams.get("type") as ArchiveType | null;

  const { createArchive, isSubmitting, pdfUploadProgress } = useArchives();
  const { config, fetchConfig } = useSystemSettings();
  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const methods = useForm<ArchiveFormData>({
    resolver: zodResolver(archiveSchema),
    defaultValues: {
      type: defaultType || undefined,
      code: "",
      documentDate: "",
      grantors: [],
      beneficiaries: [],
      pdf: null,
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = methods;
  const pdf = watch("pdf");
  const typeValue = watch("type");

  const onSubmit = async (data: ArchiveFormData) => {
    const cleanPerson = (p: {
      nombresCompletos: string;
      isPasaporte?: boolean;
      cedulaORuc: string;
      pasaporte?: string;
      nacionalidad: string;
    }) => ({
      nombresCompletos: p.nombresCompletos,
      // Si es pasaporte, enviamos el número de pasaporte en el campo cedulaORuc (campo único del API)
      ...(p.isPasaporte && p.pasaporte
        ? { cedulaORuc: p.pasaporte }
        : p.cedulaORuc
        ? { cedulaORuc: p.cedulaORuc }
        : {}),
      nacionalidad: p.nacionalidad,
    });

    const result = await createArchive({
      type: data.type,
      code: data.code,
      documentDate: data.documentDate ? new Date(data.documentDate).toISOString() : undefined,
      observations: data.observations,
      grantors: data.grantors.map(cleanPerson),
      beneficiaries: data.beneficiaries.map(cleanPerson),
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
          <ButtonLink href="/archives" className="border-border" variant="default" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Volver
          </ButtonLink>
          <Button className="cursor-pointer" type="submit" disabled={isSubmitting}>
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
            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Información General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tipo + Fecha del documento */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Tipo de Documento</Label>
                    <Select
                      value={typeValue || ""}
                      onValueChange={(v) => setValue("type", v as ArchiveType)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
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

                  <div className="space-y-1.5">
                    <Label htmlFor="documentDate">Fecha del Escrito</Label>
                    <Input
                      id="documentDate"
                      type="date"
                      {...register("documentDate")}
                    />
                    {errors.documentDate && (
                      <p className="text-xs text-destructive">{errors.documentDate.message}</p>
                    )}
                  </div>
                </div>

                {/* Código */}
                <div className="space-y-1.5">
                  <Label htmlFor="code">Código del Archivo</Label>
                  <Input
                    id="code"
                    placeholder="Ingresa el código (máx. 17 caracteres)"
                    className="font-mono"
                    maxLength={17}
                    {...register("code")}
                  />
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

            {/* Otorgantes (opcional) */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Otorgantes
                  <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GrantorForm fieldName="grantors" title="Lista de Otorgantes" />
              </CardContent>
            </Card>

            {/* A favor de (opcional) */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  A Favor De
                  <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GrantorForm
                  fieldName="beneficiaries"
                  title="Lista de Beneficiarios"
                  icon={<UserCheck className="w-4 h-4 text-muted-foreground" />}
                />
              </CardContent>
            </Card>
          </div>

          {/* Columna lateral */}
          <div className="space-y-6">
            <Card className="border-border bg-card">
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
                  maxSizeMB={config?.maxPdfSizeMb ?? 10}
                  uploadProgress={pdfUploadProgress}
                />
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
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
                  <span className="font-mono font-semibold text-primary text-xs">{watch("code") || "—"}</span>
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
