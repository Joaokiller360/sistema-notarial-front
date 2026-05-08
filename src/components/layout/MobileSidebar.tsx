"use client";

import { useUiStore } from "@/store";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";

export function MobileSidebar() {
  const { sidebarMobileOpen, closeMobileSidebar } = useUiStore();

  return (
    <Sheet open={sidebarMobileOpen} onOpenChange={closeMobileSidebar}>
      <SheetContent side="left" className="p-0 w-64">
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
}
