"use client";

import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <TooltipProvider>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: "bg-zinc-900 border border-zinc-700 text-zinc-100",
            title: "text-zinc-100",
            description: "text-zinc-400",
          },
        }}
      />
    </TooltipProvider>
  );
}
