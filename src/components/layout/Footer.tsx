"use client";

import { useEffect } from "react";
import { useSystemSettings } from "@/hooks";

export function Footer() {
  const { config, fetchConfig } = useSystemSettings();

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const version = config?.systemVersion ?? "—";

  return (
    <footer className="shrink-0 border-t border-border bg-background px-6 py-2 flex items-center justify-between">
      <span className="text-xs text-muted-foreground">
        Sistema Notarial
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        v{version}
      </span>
    </footer>
  );
}
