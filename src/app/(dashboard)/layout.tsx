"use client";

import { AuthGuard } from "@/guards";
import { Sidebar, Navbar, Breadcrumbs, MobileSidebar } from "@/components/layout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar - Desktop */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Sidebar - Mobile */}
        <MobileSidebar />

        {/* Main Content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Navbar />

          {/* Breadcrumbs */}
          <div className="px-6 py-2 border-b border-border bg-background/50">
            <Breadcrumbs />
          </div>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="p-6">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
