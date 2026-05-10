"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, UserRound, Users, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Pagination } from "@/components/common/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { archivesService } from "@/services";
import type { Archive } from "@/types";

interface DerivedClient {
  id: string; // cedula como ID único
  nombresCompletos: string;
  cedulaORuc: string;
  nacionalidad?: string;
  asGrantor: number;
  asBeneficiary: number;
}

function extractClients(archives: Archive[]): DerivedClient[] {
  const map = new Map<string, DerivedClient>();

  for (const archive of archives) {
    for (const g of archive.grantors) {
      const key = g.cedulaORuc;
      const cur = map.get(key);
      if (cur) {
        cur.asGrantor++;
      } else {
        map.set(key, {
          id: g.cedulaORuc,
          nombresCompletos: g.nombresCompletos,
          cedulaORuc: g.cedulaORuc,
          nacionalidad: g.nacionalidad,
          asGrantor: 1,
          asBeneficiary: 0,
        });
      }
    }
    for (const b of archive.beneficiaries) {
      const key = b.cedulaORuc;
      const cur = map.get(key);
      if (cur) {
        cur.asBeneficiary++;
      } else {
        map.set(key, {
          id: b.cedulaORuc,
          nombresCompletos: b.nombresCompletos,
          cedulaORuc: b.cedulaORuc,
          nacionalidad: b.nacionalidad,
          asGrantor: 0,
          asBeneficiary: 1,
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.nombresCompletos.localeCompare(b.nombresCompletos)
  );
}

const PAGE_LIMIT = 15;

export default function ClientsPage() {
  const router = useRouter();

  const [allArchives, setAllArchives] = useState<Archive[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all archives in batches to extract clients
      let collected: Archive[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const result = await archivesService.getAll({ page: currentPage, limit: 50 });
        collected = collected.concat(result.data);
        totalPages = result.totalPages;
        currentPage++;
      } while (currentPage <= totalPages && collected.length < 500);

      setAllArchives(collected);
    } catch {
      // silent — archives may be empty
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clients = useMemo(() => extractClients(allArchives), [allArchives]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.nombresCompletos.toLowerCase().includes(q) ||
        c.cedulaORuc.includes(q)
    );
  }, [clients, search]);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_LIMIT;
    return filtered.slice(start, start + PAGE_LIMIT);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PAGE_LIMIT);

  const columns: Column<DerivedClient>[] = [
    {
      key: "name",
      label: "Cliente",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {row.nombresCompletos
                .split(" ")
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{row.nombresCompletos}</p>
            <p className="text-xs text-muted-foreground font-mono">{row.cedulaORuc}</p>
          </div>
        </div>
      ),
    },
    {
      key: "nacionalidad",
      label: "Nacionalidad",
      render: (row) =>
        row.nacionalidad ? (
          <span className="text-sm">{row.nacionalidad}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "asGrantor",
      label: "Como Otorgante",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
            {row.asGrantor} trámite{row.asGrantor !== 1 ? "s" : ""}
          </Badge>
        </div>
      ),
    },
    {
      key: "asBeneficiary",
      label: "Como A Favor De",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            {row.asBeneficiary} trámite{row.asBeneficiary !== 1 ? "s" : ""}
          </Badge>
        </div>
      ),
    },
    {
      key: "actions",
      label: "Trámites",
      className: "text-right",
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => router.push(`/clients/${encodeURIComponent(row.cedulaORuc)}`)}
        >
          Ver trámites
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Otorgantes y beneficiarios que han participado en trámites"
      >
        {!isLoading && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sidebar/80 border border-primary/20">
            <UserRound className="w-3.5 h-3.5 text-primary" />
            <span className="text-md font-medium text-primary">
              {filtered.length} clientes
            </span>
          </div>
        )}
      </PageHeader>

      <div className="relative max-w-sm bg-sidebar/80 rounded-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o cédula..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <DataTable
            columns={columns}
            data={paged}
            isLoading={false}
            keyExtractor={(row) => row.id}
            emptyTitle="No hay clientes"
            emptyDescription={
              search
                ? "No se encontraron clientes con ese nombre o cédula."
                : "Los clientes aparecen al crear archivos con otorgantes y beneficiarios."
            }
          />
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              limit={PAGE_LIMIT}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
