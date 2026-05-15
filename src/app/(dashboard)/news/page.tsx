"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Newspaper, Plus, CalendarDays, ImageOff, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function NewsPage() {
  const { news, isLoading, fetchNews, deleteNews } = useNews();
  const { canCreateNews, canDeleteNews } = usePermissions();

  useEffect(() => {
    fetchNews({ page: 1, limit: 50 });
  }, [fetchNews]);

  const items = news?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevas noticias sobre el sistema"
        description="Mantente informado sobre las últimas actualizaciones y novedades"
      >
        {canCreateNews() && (
          <ButtonLink href="/news/new">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Noticia
          </ButtonLink>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-6 space-y-3 animate-pulse"
            >
              <div className="h-44 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted/50 rounded w-1/4 mt-2" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Newspaper className="w-12 h-12 text-muted-foreground/25 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">
            No hay noticias disponibles aún
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Próximamente encontrarás actualizaciones del sistema aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors group"
            >
              <Link href={`/news/${item.id}`} className="block">
                {item.imageUrl ? (
                  <div className="relative w-full h-44 bg-muted">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-full h-28 bg-muted/40 flex items-center justify-center">
                    <ImageOff className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                )}
                <div className="p-6 space-y-2">
                  <h2 className="text-base font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {stripHtml(item.description)}
                  </p>
                </div>
              </Link>

              <div className="px-6 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                </div>

                {canDeleteNews() && (
                  <AlertDialog>
                    <AlertDialogTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar noticia?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. La noticia
                          &ldquo;{item.title}&rdquo; será eliminada permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteNews(item.id)}
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
