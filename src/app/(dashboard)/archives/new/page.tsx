"use client";

export const dynamic = 'force-dynamic';

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, FileText, Users, UserCheck, ImagePlus, X, GripVertical } from "lucide-react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { FileUpload } from "@/components/common/FileUpload";
import { GrantorForm } from "@/components/common/GrantorForm";
import { CharCounter } from "@/components/common/CharCounter";
import { useArchives, useSystemSettings } from "@/hooks";
import { archivesService } from "@/services";
import { cn } from "@/lib/utils";
import type { ArchiveType } from "@/types";

const ARCHIVE_TYPES: { value: ArchiveType; label: string }[] = [
  { value: "A", label: "Arrendamiento" },
  { value: "C", label: "Certificación" },
  { value: "D", label: "Diligencia" },
  { value: "P", label: "Protocolo" },
  { value: "O", label: "Otro" },
];

const OBSERVATIONS_MAX = 500;
const NOMBRE_MAX = 250;
const OBS_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]*$/;
const PHOTO_ACCEPTED = ["image/jpeg", "image/png"];
const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

interface PhotoItem {
  id: string;
  file: File;
  preview: string;
}

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

// pdf is optional here — validated manually based on pdfMode
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
  pdf: z.custom<File | null | undefined>().optional(),
});

type ArchiveFormData = z.infer<typeof archiveSchema>;

function NewArchiveForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultType = searchParams.get("type") as ArchiveType | null;

  const { createArchive, isSubmitting, pdfUploadProgress } = useArchives();
  const { config, fetchConfig } = useSystemSettings();
  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const todayStr = new Date().toISOString().split("T")[0];

  // ── PDF mode ──────────────────────────────────────────────────────────────
  const [pdfMode, setPdfMode] = useState<"upload" | "photos">("upload");
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [photoDragIndex, setPhotoDragIndex] = useState<number | null>(null);
  const [photoOverIndex, setPhotoOverIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { photoItems.forEach((i) => URL.revokeObjectURL(i.preview)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxPhotos = config?.maxPdfImages ?? 20;

  const addPhotos = useCallback((fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const valid: PhotoItem[] = [];
    for (const file of incoming) {
      if (!PHOTO_ACCEPTED.includes(file.type)) {
        toast.error(`"${file.name}" no es una imagen válida (jpg, png).`);
        continue;
      }
      if (file.size > PHOTO_MAX_BYTES) {
        toast.error(`"${file.name}" supera el límite de 10 MB.`);
        continue;
      }
      valid.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }
    if (valid.length) {
      setPhotoItems((prev) => {
        const remaining = maxPhotos - prev.length;
        if (remaining <= 0) {
          toast.error(`Límite alcanzado: máximo ${maxPhotos} imágenes.`);
          return prev;
        }
        const toAdd = valid.slice(0, remaining);
        if (valid.length > remaining) {
          toast.warning(`Solo se agregaron ${remaining} de ${valid.length} imágenes (límite: ${maxPhotos}).`);
        }
        return [...prev, ...toAdd];
      });
    }
  }, [maxPhotos]);

  const removePhoto = (id: string) => {
    setPhotoItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handlePhotoDragStart = (e: React.DragEvent, index: number) => {
    setPhotoDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handlePhotoDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (index !== photoOverIndex) setPhotoOverIndex(index);
  };

  const handlePhotoDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (photoDragIndex === null || photoDragIndex === dropIndex) {
      setPhotoDragIndex(null);
      setPhotoOverIndex(null);
      return;
    }
    setPhotoItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(photoDragIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    setPhotoDragIndex(null);
    setPhotoOverIndex(null);
  };

  const switchMode = (mode: "upload" | "photos") => {
    if (mode === pdfMode) return;
    if (mode === "photos") {
      setValue("pdf", null, { shouldValidate: false });
    } else {
      photoItems.forEach((i) => URL.revokeObjectURL(i.preview));
      setPhotoItems([]);
    }
    setPdfMode(mode);
  };

  // ── Form ──────────────────────────────────────────────────────────────────
  const methods = useForm<ArchiveFormData>({
    resolver: zodResolver(archiveSchema),
    defaultValues: {
      type: defaultType || undefined,
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
    setError,
    formState: { errors, isSubmitted, isValid },
  } = methods;

  const pdf = watch("pdf");
  const typeValue = watch("type");
  const observationsValue = watch("observations") ?? "";
  const codeValue = watch("code") ?? "";

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter", "Home", "End"];
    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/^[a-zA-Z0-9]$/.test(e.key)) e.preventDefault();
  };

  const handleObsKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Tab", "Enter", "Home", "End", "Shift", "Control", "Meta", "Alt"];
    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!OBS_REGEX.test(e.key)) e.preventDefault();
  };

  const onSubmit = async (data: ArchiveFormData) => {
    // Manual validation for document mode
    if (pdfMode === "upload") {
      if (!(data.pdf instanceof File)) {
        setError("pdf", { message: "Debe adjuntar un archivo PDF para continuar" });
        return;
      }
    } else {
      if (photoItems.length === 0) {
        toast.error("Agrega al menos una imagen para generar el PDF.");
        return;
      }
    }

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

    let created;
    try {
      created = await createArchive({
        type: data.type,
        code: data.code,
        documentDate: data.documentDate
          ? new Date(data.documentDate).toISOString()
          : undefined,
        observations: data.observations || undefined,
        grantors: data.grantors.map(cleanPerson),
        beneficiaries: data.beneficiaries.map(cleanPerson),
        pdf: pdfMode === "upload" ? (data.pdf as File) : undefined,
      });
    } catch {
      return; // toast already shown by the hook
    }

    if (!created) return;

    if (pdfMode === "photos") {
      setIsGenerating(true);
      try {
        await archivesService.generatePdf(created.id, photoItems.map((i) => i.file));
        toast.success("PDF generado y adjuntado correctamente.");
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        if (status === 404) {
          toast.error("Archivo no encontrado.");
          router.push("/archives");
          return;
        }
        toast.warning(msg ?? "El PDF no se pudo generar. Puedes intentarlo desde el detalle del archivo.");
      } finally {
        setIsGenerating(false);
      }
    }

    router.push(`/archives?type=${data.type}`);
  };

  const isBusy = isSubmitting || isGenerating;

  // ── Render ────────────────────────────────────────────────────────────────
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
          <Button
            className="cursor-pointer"
            type="submit"
            disabled={isBusy || (isSubmitted && !isValid)}
          >
            {isBusy ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {isGenerating ? "Generando PDF..." : "Guardando..."}
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
          {/* ── Left column ── */}
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
                      max={todayStr}
                      {...register("documentDate")}
                    />
                    {errors.documentDate && (
                      <p className="text-xs text-destructive">{errors.documentDate.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="code">Código del Archivo</Label>
                    <CharCounter current={codeValue.length} max={17} warnAt={3} />
                  </div>
                  <Input
                    id="code"
                    placeholder="Ingresa el código (máx. 17 caracteres)"
                    className="font-mono"
                    maxLength={17}
                    onKeyDown={handleCodeKeyDown}
                    {...register("code")}
                  />
                  {errors.code && (
                    <p className="text-xs text-destructive">{errors.code.message}</p>
                  )}
                </div>

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
                    placeholder="Observaciones adicionales sobre el archivo..."
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

          {/* ── Right column ── */}
          <div className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Documento
                  <span className="text-destructive ml-0.5">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mode switcher */}
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => switchMode("upload")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
                      pdfMode === "upload"
                        ? "bg-primary text-primary-foreground"
                        : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Subir PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("photos")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors border-l border-border",
                      pdfMode === "photos"
                        ? "bg-primary text-primary-foreground"
                        : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    Generar desde fotos
                  </button>
                </div>

                {/* Upload PDF */}
                {pdfMode === "upload" && (
                  <>
                    <FileUpload
                      value={(pdf as File) || null}
                      onChange={(file) => setValue("pdf", file, { shouldValidate: true })}
                      maxSizeMB={config?.maxPdfSizeMb ?? 10}
                      uploadProgress={pdfUploadProgress}
                    />
                    {errors.pdf && (
                      <p className="text-xs text-destructive">{errors.pdf.message as string}</p>
                    )}
                  </>
                )}

                {/* Photos mode */}
                {pdfMode === "photos" && (
                  <div className="space-y-3">
                    {/* Drop zone */}
                    <div
                      onDragOver={(e) => { if (photoItems.length < maxPhotos) e.preventDefault(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files?.length) addPhotos(e.dataTransfer.files);
                      }}
                      onClick={() => photoItems.length < maxPhotos && photoInputRef.current?.click()}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed transition-colors",
                        photoItems.length >= maxPhotos
                          ? "border-border opacity-50 cursor-not-allowed"
                          : "border-border hover:border-primary/50 hover:bg-muted/20 cursor-pointer"
                      )}
                    >
                      <ImagePlus className="w-6 h-6 text-muted-foreground" />
                      <p className="text-xs text-center text-muted-foreground">
                        {photoItems.length >= maxPhotos
                          ? `Límite alcanzado (${maxPhotos} imágenes)`
                          : <>Arrastra imágenes aquí o haz clic<br /><span className="text-[11px]">JPG · PNG · máx. 10 MB c/u · máx. {maxPhotos} imágenes</span></>
                        }
                      </p>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.length) addPhotos(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </div>

                    {/* Photo grid */}
                    {photoItems.length > 0 && (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-muted-foreground">
                            Arrastra para reordenar
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px]",
                              photoItems.length >= maxPhotos && "border-destructive/40 text-destructive"
                            )}
                          >
                            {photoItems.length} / {maxPhotos} imágenes
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {photoItems.map((item, index) => (
                            <div
                              key={item.id}
                              draggable
                              onDragStart={(e) => handlePhotoDragStart(e, index)}
                              onDragOver={(e) => handlePhotoDragOver(e, index)}
                              onDrop={(e) => handlePhotoDrop(e, index)}
                              onDragEnd={() => {
                                setPhotoDragIndex(null);
                                setPhotoOverIndex(null);
                              }}
                              className={cn(
                                "relative group rounded-md border overflow-hidden transition-all select-none",
                                photoDragIndex === index
                                  ? "opacity-40 border-primary/50"
                                  : photoOverIndex === index
                                  ? "border-primary ring-1 ring-primary scale-[1.02]"
                                  : "border-border hover:border-primary/40"
                              )}
                            >
                              {/* Order */}
                              <span className="absolute top-1 left-1 z-10 flex items-center justify-center w-4 h-4 rounded-full bg-background/90 border border-border text-[9px] font-bold text-foreground leading-none">
                                {index + 1}
                              </span>
                              {/* Drag handle */}
                              <div className="absolute top-1 right-5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="w-3 h-3 text-muted-foreground/70" />
                              </div>
                              {/* Remove */}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removePhoto(item.id); }}
                                className="absolute top-1 right-1 z-10 flex items-center justify-center w-4 h-4 rounded-full bg-background/90 border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.preview}
                                alt={item.file.name}
                                className="w-full aspect-[3/4] object-cover"
                                draggable={false}
                              />
                            </div>
                          ))}

                          {/* Add more */}
                          {photoItems.length < maxPhotos && (
                            <button
                              type="button"
                              onClick={() => photoInputRef.current?.click()}
                              className="flex flex-col items-center justify-center gap-1 aspect-[3/4] rounded-md border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/20 transition-colors text-muted-foreground hover:text-primary"
                            >
                              <ImagePlus className="w-4 h-4" />
                              <span className="text-[10px]">Añadir</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            photoItems.forEach((i) => URL.revokeObjectURL(i.preview));
                            setPhotoItems([]);
                          }}
                          className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Limpiar todo
                        </button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
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
                  <span className="font-mono font-semibold text-primary text-xs">
                    {watch("code") || "—"}
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
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Documento</span>
                  {pdfMode === "upload" ? (
                    <span className={cn("font-medium text-xs", !pdf && "text-destructive")}>
                      {pdf ? "PDF adjunto" : "Requerido"}
                    </span>
                  ) : (
                    <span className={cn("font-medium text-xs", photoItems.length === 0 && "text-destructive")}>
                      {photoItems.length > 0
                        ? `${photoItems.length} ${photoItems.length === 1 ? "foto" : "fotos"}`
                        : "Sin imágenes"}
                    </span>
                  )}
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
