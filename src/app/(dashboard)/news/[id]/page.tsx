"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Trash2,
  ImageOff,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNews, usePermissions } from "@/hooks";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentNews, isLoadingOne, fetchNewsById, deleteNews } = useNews();
  const { canDeleteNews } = usePermissions();

  useEffect(() => {
    if (id) fetchNewsById(id);
  }, [id, fetchNewsById]);

  const handleDelete = async () => {
    const ok = await deleteNews(id);
    if (ok) router.push("/news");
  };

  if (isLoadingOne) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-72 bg-muted rounded-xl" />
        <div className="space-y-3">
          <div className="h-6 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!currentNews) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Noticia no encontrada
        </p>
        <ButtonLink href="/news" variant="default" size="sm" className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Volver a noticias
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <ButtonLink href="/news" variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Volver
        </ButtonLink>

        {canDeleteNews() && (
          <AlertDialog>
            <AlertDialogTrigger className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-4 h-4" />
              Eliminar
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar noticia?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. La noticia
                  &ldquo;{currentNews.title}&rdquo; será eliminada permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDelete}
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Image */}
      {currentNews.imageUrl ? (
        <div className="relative w-full h-72 rounded-xl overflow-hidden bg-muted border border-border">
          <Image
            src={currentNews.imageUrl}
            alt={currentNews.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
            unoptimized
          />
        </div>
      ) : (
        <div className="w-full h-40 rounded-xl bg-muted/40 border border-border flex items-center justify-center">
          <ImageOff className="w-10 h-10 text-muted-foreground/20" />
        </div>
      )}

      {/* Content */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground leading-tight">
          {currentNews.title}
        </h1>

        <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            <time dateTime={currentNews.createdAt}>
              {formatDate(currentNews.createdAt)}
            </time>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(currentNews.createdAt)}
          </span>
        </div>

        <div className="border-t border-border" />

        <div
          className="prose prose-sm dark:prose-invert max-w-none text-foreground/80"
          dangerouslySetInnerHTML={{ __html: currentNews.description }}
        />
      </div>
    </div>
  );
}
