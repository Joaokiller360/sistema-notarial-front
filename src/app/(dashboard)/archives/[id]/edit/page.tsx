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
import { PageLoader } from "@/components/common/LoadingSpinner";
import { useArchives } from "@/hooks";
import type { ArchiveType } from "@/types";

const ARCHIVE_TYPES: { value: ArchiveType; label: string }[] = [
  { value: "A", label: "Arrendamientos" },
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
  code: z.string().min(3).max(20),
  observations: z.string().max(2000).optional(),
  grantors: z.array(personSchema).min(1, "Agrega al menos un otorgante"),
  beneficiaries: z.array(personSchema).min(1, "Agrega al menos un beneficiario"),
  pdf: z.custom<File | null>().optional(),
});

type ArchiveFormData = z.infer<typeof archiveSchema>;

export default function EditArchivePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { archive, isLoading, fetchArchive, updateArchive, isSubmitting } = useArchives();

  const methods = useForm<ArchiveFormData>({
    resolver: zodResolver(archiveSchema),
    defaultValues: { type: "A", code: "", grantors: [], beneficiaries: [], pdf: null },
  });

  const { register, handleSubmit, setValue, watch, reset } = methods;

  useEffect(() => {
    if (id) fetchArchive(id);
  }, [id, fetchArchive]);

  useEffect(() => {
    if (archive) {
      reset({
        type: archive.type || "A",
        code: archive.code,
        observations: archive.observations || "",
        grantors: archive.grantors.map((g) => ({
          nombresCompletos: g.nombresCompletos,
          cedulaORuc: g.cedulaORuc,
          nacionalidad: g.nacionalidad,
        })),
        beneficiaries: archive.beneficiaries.map((b) => ({
          nombresCompletos: b.nombresCompletos,
          cedulaORuc: b.cedulaORuc,
          nacionalidad: b.nacionalidad,
        })),
        pdf: null,
      });
    }
  }, [archive, reset]);

  const pdf = watch("pdf");

  const onSubmit = async (data: ArchiveFormData) => {
    const result = await updateArchive(id, {
      type: data.type,
      code: data.code,
      observations: data.observations,
      grantors: data.grantors,
      beneficiaries: data.beneficiaries,
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
          <ButtonLink href={`/archives/${id}`} className="bg-sidebar/80 hover:bg-sidebar hover:text-sidebar" variant="default" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Cancelar
          </ButtonLink>
          <Button className="bg-sidebar hover:bg-sidebar/80 cursor-pointer" type="submit" disabled={isSubmitting}>
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
            <Card className="border-border bg-sidebar/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Información General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="code">Código del Archivo</Label>
                  <Input
                    id="code"
                    className="font-mono"
                    readOnly
                    {...register("code")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="observations">Observaciones</Label>
                  <Textarea
                    id="observations"
                    rows={3}
                    className="resize-none"
                    {...register("observations")}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-sidebar/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Otorgantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GrantorForm fieldName="grantors" title="Lista de Otorgantes" />
              </CardContent>
            </Card>

            <Card className="border-border bg-sidebar/50">
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
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border bg-sidebar/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Reemplazar PDF
                </CardTitle>
              </CardHeader>
              <CardContent>
                {archive.pdfUrl && (
                  <div className="mb-3 p-2 rounded bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground">
                      Actual: <span className="text-foreground font-medium">documento.pdf</span>
                    </p>
                  </div>
                )}
                <FileUpload
                  value={(pdf as File) || null}
                  onChange={(file) => setValue("pdf", file)}
                  maxSizeMB={10}
                />
              </CardContent>
            </Card>

            <Card className="border-border bg-sidebar/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Código</span>
                  <span className="font-mono font-bold text-primary text-xs">{archive.code}</span>
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
