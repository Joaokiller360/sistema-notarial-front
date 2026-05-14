"use client";

import { useEffect } from "react";

export function PdfGeneratingOverlay({ isGenerating }: { isGenerating: boolean }) {
  useEffect(() => {
    if (!isGenerating) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isGenerating]);

  if (!isGenerating) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
      <p className="text-white text-lg font-medium">
        Generando PDF, por favor espera...
      </p>
      <p className="text-white/70 text-sm">No cierres ni recargues la página</p>
    </div>
  );
}
