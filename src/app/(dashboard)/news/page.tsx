"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Newspaper, Plus, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ButtonLink } from "@/components/ui/button-link";
import { useNews, usePermissions } from "@/hooks";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-EC", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function NewsPage() {
  const { news, isLoading, fetchNews } = useNews();
  const { canCreateNews } = usePermissions();

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
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted/50 rounded w-1/4 mt-4" />
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
              className="rounded-lg border border-border bg-card p-6 space-y-3 hover:border-primary/30 transition-colors"
            >
              <h2 className="text-base font-semibold text-foreground leading-snug">
                {item.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 pt-1">
                <CalendarDays className="w-3.5 h-3.5" />
                <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
