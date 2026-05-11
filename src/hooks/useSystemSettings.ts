"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { systemService } from "@/services";
import type { SystemConfig } from "@/services/system.service";

export function useSystemSettings() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await systemService.getConfig();
      setConfig(data);
      return data;
    } catch {
      toast.error("Error al cargar la configuración del sistema");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateConfig = async (payload: Partial<SystemConfig>) => {
    setIsSubmitting(true);
    try {
      const updated = await systemService.updateConfig(payload);
      setConfig(updated);
      toast.success("Configuración guardada exitosamente");
      return updated;
    } catch (error: unknown) {
      const raw = (error as { response?: { data?: unknown } })?.response?.data;
      const message = extractErrorMessage(raw) || "Error al guardar la configuración";
      toast.error(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    config,
    isLoading,
    isSubmitting,
    fetchConfig,
    updateConfig,
  };
}

function extractErrorMessage(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  const r = raw as Record<string, unknown>;
  if (typeof r.message === "string") return r.message;
  if (Array.isArray(r.message)) return (r.message as string[]).join(" · ");
  return "";
}
