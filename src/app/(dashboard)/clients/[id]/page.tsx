"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, UserRound, FileText, Users, UserCheck, Calendar, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { archivesService } from "@/services";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Archive, ArchiveType } from "@/types";

const TYPE_LABELS: Record<ArchiveType, string> = {
  A: "Arrendamiento",
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

interface ClientInfo {
  nombresCompletos: string;
  cedulaORuc: string;
  nacionalidad?: string;
}

function ArchiveCard({ archive, onView }: { archive: Archive; onView: () => void }) {
  return (
    <div
      onClick={onView}
      className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-primary">{archive.code}</span>
            {archive.type && (
              <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[archive.type])}>
                {TYPE_LABELS[archive.type]}
              </Badge>
            )}
            <StatusBadge status={archive.status} />
          </div>
          {archive.observations && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{archive.observations}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 ml-4">
        <Calendar className="w-3 h-3" />
        {format(new Date(archive.createdAt), "dd MMM yyyy", { locale: es })}
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // The "id" param is the URL-encoded cedula
  const cedula = decodeURIComponent(id);

  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [grantorArchives, setGrantorArchives] = useState<Archive[]>([]);
  const [beneficiaryArchives, setBeneficiaryArchives] = useState<Archive[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!cedula) return;

    setIsLoading(true);
    (async () => {
      try {
        let collected: Archive[] = [];
        let currentPage = 1;
        let totalPages = 1;

        // Fetch all archives and extract this client's participation
        do {
          const result = await archivesService.getAll({ page: currentPage, limit: 50 });
          collected = collected.concat(result.data);
          totalPages = result.totalPages;
          currentPage++;
        } while (currentPage <= totalPages && collected.length < 500);

        const asGrantor: Archive[] = [];
        const asBeneficiary: Archive[] = [];
        let info: ClientInfo | null = null;

        for (const archive of collected) {
          const matchGrantor = archive.grantors.find((g) => g.cedulaORuc === cedula);
          const matchBeneficiary = archive.beneficiaries.find((b) => b.cedulaORuc === cedula);

          if (matchGrantor) {
            asGrantor.push(archive);
            if (!info) info = matchGrantor;
          }
          if (matchBeneficiary) {
            asBeneficiary.push(archive);
            if (!info) info = matchBeneficiary;
          }
        }

        setClientInfo(info);
        setGrantorArchives(asGrantor);
        setBeneficiaryArchives(asBeneficiary);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    })();
  }, [cedula]);

  if (isLoading) return <PageLoader />;

  if (!clientInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Cliente no encontrado</p>
        <Button variant="outline" onClick={() => router.push("/clients")}>
          Volver a Clientes
        </Button>
      </div>
    );
  }

  const total = grantorArchives.length + beneficiaryArchives.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={clientInfo.nombresCompletos}
        description={`Cédula / RUC: ${clientInfo.cedulaORuc}`}
      >
        <ButtonLink href="/clients" variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Volver
        </ButtonLink>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserRound className="w-4 h-4 text-primary" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <UserRound className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="text-sm font-medium">{clientInfo.nombresCompletos}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CreditCard className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Cédula / RUC</p>
                  <p className="text-sm font-mono font-medium">{clientInfo.cedulaORuc}</p>
                </div>
              </div>
              {clientInfo.nacionalidad && (
                <div className="flex items-start gap-2">
                  <div className="w-3.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nacionalidad</p>
                    <p className="text-sm">{clientInfo.nacionalidad}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm text-muted-foreground">Como Otorgante</span>
                </div>
                <span className="text-sm font-semibold">{grantorArchives.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-sm text-muted-foreground">A Favor De</span>
                </div>
                <span className="text-sm font-semibold">{beneficiaryArchives.length}</span>
              </div>
              <div className="border-t border-border pt-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Total trámites</span>
                <span className="text-lg font-bold text-primary">{total}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Archives */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Trámites como Otorgante
                <Badge variant="outline" className="ml-auto text-xs">{grantorArchives.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {grantorArchives.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No aparece como otorgante en ningún trámite
                </p>
              ) : (
                <div className="space-y-2">
                  {grantorArchives.map((a) => (
                    <ArchiveCard
                      key={a.id}
                      archive={a}
                      onView={() => router.push(`/archives/${a.id}`)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Trámites a Favor De
                <Badge variant="outline" className="ml-auto text-xs">{beneficiaryArchives.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {beneficiaryArchives.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No aparece como beneficiario en ningún trámite
                </p>
              ) : (
                <div className="space-y-2">
                  {beneficiaryArchives.map((a) => (
                    <ArchiveCard
                      key={a.id}
                      archive={a}
                      onView={() => router.push(`/archives/${a.id}`)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
