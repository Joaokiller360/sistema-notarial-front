"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { useNews, usePermissions } from "@/hooks";

const newsSchema = z.object({
  title: z
    .string()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(150, "El título no puede superar los 150 caracteres"),
  description: z
    .string()
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(1000, "La descripción no puede superar los 1000 caracteres"),
});

type NewsFormData = z.infer<typeof newsSchema>;

export default function NewNewsPage() {
  const router = useRouter();
  const { isSuperAdmin } = usePermissions();
  const { createNews, isSubmitting } = useNews();

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
    defaultValues: { title: "", description: "" },
  });

  const onSubmit = async (data: NewsFormData) => {
    const result = await createNews(data);
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

      <Card className="border-border bg-card max-w-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-primary" />
            Contenido de la Noticia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Escribe el título de la noticia..."
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Escribe el contenido de la noticia..."
              rows={6}
              className="resize-none"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
