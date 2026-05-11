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
            toast: "bg-[#1D2C49] border border-white/10 text-white",
            title: "text-white",
            description: "text-white/70",
          },
        }}
      />
    </TooltipProvider>
  );
}
