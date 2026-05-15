"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Newspaper,
  ImagePlus,
  X,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { PageHeader } from "@/components/common/PageHeader";
import { useNews, usePermissions } from "@/hooks";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/* Título: letras (incluyendo acentos y ñ), números, espacios, guion, guion bajo */
const TITLE_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜñÑüÜ0-9\s\-_.,;:¿?¡!()'"/]+$/;

const newsSchema = z.object({
  title: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(200, "Máximo 200 caracteres")
    .regex(TITLE_REGEX, "Solo se permiten letras, números, espacios y guiones"),
});

type NewsFormData = z.infer<typeof newsSchema>;

function validateImage(file: File): string | null {
  if (file.size > MAX_SIZE_BYTES) return `La imagen no puede superar ${MAX_SIZE_MB} MB`;
  if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number]))
    return "Solo se permiten imágenes JPEG, PNG o WebP";
  return null;
}

export default function NewNewsPage() {
  const router = useRouter();
  const { isSuperAdmin } = usePermissions();
  const { createNews, isSubmitting } = useNews();

  const [content, setContent] = useState("");
  const [contentError, setContentError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isSuperAdmin()) {
      toast.error("No tienes permiso para acceder a esta sección");
      router.replace("/news");
    }
  }, [isSuperAdmin, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted, isValid },
  } = useForm<NewsFormData>({
    resolver: zodResolver(newsSchema),
    defaultValues: { title: "" },
  });

  const handleFile = useCallback((file: File) => {
    setImageError(null);
    const err = validateImage(file);
    if (err) {
      setImageError(err);
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (data: NewsFormData) => {
    const plainText = content.replace(/<[^>]*>/g, "").trim();
    if (plainText.length < 10) {
      setContentError("El contenido debe tener al menos 10 caracteres");
      return;
    }
    setContentError(null);
    const result = await createNews({
      title: data.title,
      description: content,
      image: imageFile ?? undefined,
    });
    if (result) router.push("/news");
  };

  if (!isSuperAdmin()) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <PageHeader
        title="Nueva Noticia"
        description="Publica una actualización o novedad del sistema"
      >
        <ButtonLink href="/news" variant="default" size="sm" className="border-border">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Volver
        </ButtonLink>
        <Button
          type="submit"
          className="cursor-pointer"
          disabled={isSubmitting || (isSubmitted && !isValid)}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Publicando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Publicar Noticia
            </span>
          )}
        </Button>
      </PageHeader>

      <div className="space-y-4 max-w-3xl">
        {/* Título */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-primary" />
              Título
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              id="title"
              placeholder="Ej: COMUNICADO 020 - PUBLICACIÓN DE SORTEO PARA EL ENCARGO NOTARÍA"
              className="font-medium"
              onKeyDown={(e) => {
                if (e.key === "<" || e.key === ">") e.preventDefault();
              }}
              {...register("title")}
            />
            {errors.title && (
              <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.title.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Contenido */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Contenido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RichTextEditor
              value={content}
              onChange={(html) => {
                setContent(html);
                if (contentError) setContentError(null);
              }}
              placeholder="Escribe el contenido de la noticia. Puedes usar títulos, listas, negritas, alineación..."
              minHeight={320}
            />
            {contentError && (
              <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {contentError}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Imagen */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-primary" />
              Imagen de portada
              <span className="text-xs font-normal text-muted-foreground ml-1">(opcional)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <Image
                  src={imagePreview}
                  alt="Vista previa"
                  width={672}
                  height={240}
                  className="w-full h-60 object-cover"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 border border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-background/70 backdrop-blur-sm px-3 py-1.5 text-xs text-muted-foreground truncate">
                  {imageFile?.name} · {((imageFile?.size ?? 0) / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={[
                  "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed h-48 cursor-pointer transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30",
                ].join(" ")}
              >
                <ImagePlus className="w-8 h-8 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    Arrastra una imagen o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    JPEG, PNG, WebP · Máx. {MAX_SIZE_MB} MB
                  </p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleInputChange}
            />
            {imageError && (
              <p className="mt-2 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {imageError}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
