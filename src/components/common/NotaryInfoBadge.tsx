"use client";

import { Building2 } from "lucide-react";
import { useNotaryStore } from "@/store/notary.store";

export function NotaryInfoBadge() {
  const { notaryData } = useNotaryStore();

  if (!notaryData) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 space-y-1">
      <p className="text-sm font-semibold flex items-center gap-1.5 text-primary">
        <Building2 className="w-3.5 h-3.5" />
        {`Notaría N.º ${notaryData.notaryNumber}`}
      </p>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">Notaria: </span>
        {notaryData.notaryName}
      </p>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">Notario(a): </span>
        {notaryData.notaryOfficerName}
      </p>
    </div>
  );
}
