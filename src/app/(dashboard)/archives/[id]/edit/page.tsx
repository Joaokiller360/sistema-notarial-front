"use client";

import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
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
import { CharCounter } from "@/components/common/CharCounter";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { useArchives, useSystemSettings } from "@/hooks";
import type { ArchiveType } from "@/types";

const ARCHIVE_TYPES: { value: ArchiveType; label: string }[] = [
  { value: "A", label: "Arrendamientos" },
  { value: "C", label: "Certificación" },
  { value: "D", label: "Diligencia" },
  { value: "P", label: "Protocolo" },
  { value: "O", label: "Otro" },
];

const OBSERVATIONS_MAX = 500;
const NOMBRE_MAX = 250;

const OBS_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]*$/;

const personSchema = z
  .object({
    nombresCompletos: z
      .string()
      .min(2, "Nombre requerido")
      .max(NOMBRE_MAX, "No puede superar los 250 caracteres"),
    isPasaporte: z.boolean().optional(),
    cedulaORuc: z
      .string()
      .refine((v) => !v || /^\d+$/.test(v), "La cédula/RUC debe contener solo números")
      .refine(
        (v) => !v || v.length === 10 || v.length === 13,
        "Cédula: 10 dígitos / RUC: 13 dígitos"
      ),
    pasaporte: z
      .string()
      .refine((v) => !v || /^[a-zA-Z0-9]+$/.test(v), "El pasaporte debe ser alfanumérico")
      .refine(
        (v) => !v || (v.length >= 5 && v.length <= 20),
        "El pasaporte debe tener entre 5 y 20 caracteres"
      )
      .optional(),
    nacionalidad: z
      .string()
      .min(1, "Debe seleccionar una nacionalidad")
      .max(100),
  })
  .superRefine((data, ctx) => {
    if (data.isPasaporte && !data.pasaporte) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pasaporte requerido",
        path: ["pasaporte"],
      });
    }
  });

const archiveSchema = z.object({
  type: z.enum(["A", "C", "D", "O", "P"]),
  code: z
    .string()
    .min(1, "El código es requerido")
    .max(17, "Máximo 17 caracteres")
    .regex(/^[a-zA-Z0-9]*$/, "Solo letras y números, sin espacios ni caracteres especiales"),
  documentDate: z
    .string()
    .optional()
    .refine((v) => {
      if (!v) return true;
      const today = new Date().toISOString().split("T")[0];
      return v <= today;
    }, "La fecha no puede ser mayor a la fecha actual"),
  observations: z
    .string()
    .max(OBSERVATIONS_MAX, "No puede superar los 500 caracteres")
    .refine(
      (v) => !v || OBS_REGEX.test(v),
      "El campo Observaciones solo acepta letras y números"
    )
    .optional(),
  grantors: z.array(personSchema),
  beneficiaries: z.array(personSchema),
  pdf: z.custom<File | null>().optional(),
});

type ArchiveFormData = z.infer<typeof archiveSchema>;

export default function EditArchivePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    archive,
    isLoading,
    fetchArchive,
    updateArchive,
    isSubmitting,
    pdfUploadProgress,
  } = useArchives();
  const { config, fetchConfig } = useSystemSettings();

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const todayStr = new Date().toISOString().split("T")[0];

  const methods = useForm<ArchiveFormData>({
    resolver: zodResolver(archiveSchema),
    defaultValues: {
      type: "A",
      code: "",
      documentDate: "",
      observations: "",
      grantors: [],
      beneficiaries: [],
      pdf: null,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitted, isValid },
  } = methods;

  useEffect(() => {
    if (id) fetchArchive(id);
  }, [id, fetchArchive]);

  useEffect(() => {
    if (archive) {
      reset({
        type: archive.type || "A",
        code: archive.code,
        documentDate: archive.documentDate
          ? new Date(archive.documentDate).toISOString().split("T")[0]
          : "",
        observations: archive.observations || "",
        grantors: archive.grantors.map((g) => ({
          nombresCompletos: g.nombresCompletos,
          cedulaORuc: g.cedulaORuc,
          isPasaporte: false,
          pasaporte: "",
          nacionalidad: g.nacionalidad,
        })),
        beneficiaries: archive.beneficiaries.map((b) => ({
          nombresCompletos: b.nombresCompletos,
          cedulaORuc: b.cedulaORuc,
          isPasaporte: false,
          pasaporte: "",
          nacionalidad: b.nacionalidad,
        })),
        pdf: null,
      });
    }
  }, [archive, reset]);

  const pdf = watch("pdf");
  const observationsValue = watch("observations") ?? "";
  const codeValue = watch("code") ?? "";

  // Block non-alphanumeric keys in the code field
  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter", "Home", "End"];
    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/^[a-zA-Z0-9]$/.test(e.key)) e.preventDefault();
  };

  // Block special chars in observations (archive-only rule)
  const handleObsKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Tab", "Enter", "Home", "End", "Shift", "Control", "Meta", "Alt"];
    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!OBS_REGEX.test(e.key)) e.preventDefault();
  };

  const onSubmit = async (data: ArchiveFormData) => {
    const cleanPerson = (p: {
      nombresCompletos: string;
      isPasaporte?: boolean;
      cedulaORuc: string;
      pasaporte?: string;
      nacionalidad: string;
    }) => ({
      nombresCompletos: p.nombresCompletos,
      ...(p.isPasaporte && p.pasaporte
        ? { cedulaORuc: p.pasaporte }
        : p.cedulaORuc
        ? { cedulaORuc: p.cedulaORuc }
        : {}),
      nacionalidad: p.nacionalidad,
    });

    const result = await updateArchive(id, {
      type: data.type,
      code: data.code,
      documentDate: data.documentDate
        ? new Date(data.documentDate).toISOString()
        : undefined,
      observations: data.observations,
      grantors: data.grantors.map(cleanPerson),
      beneficiaries: data.beneficiaries.map(cleanPerson),
      pdf: (data.pdf as File) || undefined,
    });
    if (result) router.push(`/archives/${id}`);
  };

  if (isLoading) return <PageLoader />;
  if (!archive) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Archivo no encontrado</p>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <PageHeader
          title={`Editar ${archive.code}`}
          description="Modifica los datos del archivo notarial"
        >
          <ButtonLink href={`/archives/${id}`} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Cancelar
          </ButtonLink>
          <Button
            className="cursor-pointer"
            type="submit"
            disabled={isSubmitting || (isSubmitted && !isValid)}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Guardando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Guardar Cambios
              </span>
            )}
          </Button>
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Información General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Tipo de Documento</Label>
                    <Select
                      value={watch("type") || ""}
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
                      max={todayStr}
                      {...register("documentDate")}
                    />
                    {errors.documentDate && (
                      <p className="text-xs text-destructive">{errors.documentDate.message}</p>
                    )}
                  </div>
                </div>

                {/* Código — solo alfanumérico */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="code">Código del Archivo</Label>
                    <CharCounter current={codeValue.length} max={17} warnAt={3} />
                  </div>
                  <Input
                    id="code"
                    className="font-mono"
                    maxLength={17}
                    placeholder="Ingresa el código (máx. 17 caracteres)"
                    onKeyDown={handleCodeKeyDown}
                    {...register("code")}
                  />
                  {errors.code && (
                    <p className="text-xs text-destructive">{errors.code.message}</p>
                  )}
                </div>

                {/* Observaciones — max 500 + solo letras/números/espacios */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="observations">Observaciones</Label>
                    <CharCounter
                      current={observationsValue.length}
                      max={OBSERVATIONS_MAX}
                      warnAt={50}
                    />
                  </div>
                  <Textarea
                    id="observations"
                    rows={3}
                    className="resize-none"
                    maxLength={OBSERVATIONS_MAX}
                    onKeyDown={handleObsKeyDown}
                    {...register("observations")}
                  />
                  {errors.observations && (
                    <p className="text-xs text-destructive">{errors.observations.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

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

          <div className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Reemplazar PDF
                </CardTitle>
              </CardHeader>
              <CardContent>
                {archive.pdfUrl && (
                  <div className="mb-3 rounded border border-border bg-muted/30 p-2">
                    <p className="text-xs text-muted-foreground">
                      Actual:{" "}
                      <span className="font-medium text-foreground">documento.pdf</span>
                    </p>
                  </div>
                )}
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
                  <span className="text-muted-foreground">Código</span>
                  <span className="font-mono font-bold text-primary text-xs">
                    {archive.code}
                  </span>
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
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
