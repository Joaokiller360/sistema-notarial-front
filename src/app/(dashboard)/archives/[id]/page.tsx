"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  FileText,
  Calendar,
  User,
  Users,
  UserCheck,
  Download,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { useArchives, usePermissions } from "@/hooks";
import { archivesService } from "@/services";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { ArchiveType } from "@/types";

const TYPE_LABELS: Record<ArchiveType, string> = {
  A: "Arrendamientos",
  C: "Certificación",
  D: "Diligencia",
  P: "Protocolo",
  O: "Otro",
};

const TYPE_COLORS: Record<ArchiveType, string> = {
  A: "bg-primary/10 text-primary border-primary/20",
  C: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  D: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  P: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  O: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function ArchiveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { archive, isLoading, fetchArchive } = useArchives();
  const { canEditArchive } = usePermissions();
  const [pdfLoading, setPdfLoading] = useState<"view" | "download" | null>(null);

  const handlePdf = async (mode: "view" | "download") => {
    if (!archive?.pdfUrl) return;
    setPdfLoading(mode);
    try {
      const url = await archivesService.getPdfUrl(archive.pdfUrl);
      if (mode === "view") {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = archive.pdfFileName || "documento.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ? `Error ${status ?? ""}: ${msg}` : "No se pudo obtener el documento");
    } finally {
      setPdfLoading(null);
    }
  };

  useEffect(() => {
    if (id) fetchArchive(id);
  }, [id, fetchArchive]);

  if (isLoading) return <PageLoader />;

  if (!archive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Archivo no encontrado</p>
        <Button variant="outline" onClick={() => router.push("/archives")}>
          Volver a Archivos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Archivo ${archive.code}`}
        description={`Creado el ${format(new Date(archive.createdAt), "dd/MM/yyyy")}`}
      >
        <ButtonLink href="/archives" variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Volver
        </ButtonLink>
        {canEditArchive() && (
          <ButtonLink href={`/archives/${id}/edit`} size="sm">
            <Pencil className="w-4 h-4 mr-1.5" />
            Editar
          </ButtonLink>
        )}
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Código</p>
                  <p className="font-mono text-sm font-bold text-primary">{archive.code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                  {archive.type && (
                    <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[archive.type])}>
                      {TYPE_LABELS[archive.type]}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Estado</p>
                  <StatusBadge status={archive.status} />
                </div>
              </div>
              {archive.observations && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Observaciones</p>
                    <p className="text-sm">{archive.observations}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Otorgantes ({archive.grantors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {archive.grantors.map((g, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border bg-muted/20">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Nombre</p>
                        <p className="text-sm font-medium">{g.nombresCompletos}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cédula/RUC</p>
                        <p className="text-sm font-mono">{g.cedulaORuc}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Nacionalidad</p>
                        <p className="text-sm">{g.nacionalidad}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                A Favor De ({archive.beneficiaries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {archive.beneficiaries.map((b, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border bg-muted/20">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Nombre</p>
                        <p className="text-sm font-medium">{b.nombresCompletos}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cédula/RUC</p>
                        <p className="text-sm font-mono">{b.cedulaORuc}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Nacionalidad</p>
                        <p className="text-sm">{b.nacionalidad}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Documento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {archive.pdfUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                    <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {archive.pdfFileName || "documento.pdf"}
                      </p>
                      <p className="text-xs text-muted-foreground">PDF · URL temporal</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 cursor-pointer"
                      disabled={pdfLoading !== null}
                      onClick={() => handlePdf("view")}
                    >
                      {pdfLoading === "view" ? (
                        <span className="w-3.5 h-3.5 mr-1.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 cursor-pointer"
                      disabled={pdfLoading !== null}
                      onClick={() => handlePdf("download")}
                    >
                      {pdfLoading === "download" ? (
                        <span className="w-3.5 h-3.5 mr-1.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                      ) : (
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Descargar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin documento adjunto
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Metadatos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {archive.createdBy && (
                <div className="flex items-start gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Creado por</p>
                    <p className="text-sm">
                      {archive.createdBy.firstName} {archive.createdBy.lastName}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Creado</p>
                  <p className="text-sm">
                    {format(new Date(archive.createdAt), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Actualizado</p>
                  <p className="text-sm">
                    {format(new Date(archive.updatedAt), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
