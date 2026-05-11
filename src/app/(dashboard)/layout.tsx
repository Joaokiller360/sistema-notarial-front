"use client";

import { AuthGuard } from "@/guards";
import { Sidebar, Navbar, Breadcrumbs, MobileSidebar } from "@/components/layout";
import { useTokenRefresh } from "@/hooks";

function DashboardContent({ children }: { children: React.ReactNode }) {
  useTokenRefresh();
  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <MobileSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar />
        <div className="px-6 py-2 border-b border-border bg-background">
          <Breadcrumbs />
        </div>
        <main className="flex-1 overflow-y-auto scrollbar-thin bg-muted">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardContent>{children}</DashboardContent>
    </AuthGuard>
  );
}
