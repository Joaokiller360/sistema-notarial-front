"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderArchive,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Building2,
  ScrollText,
  UserRound,
  Newspaper,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store";
import { usePermissions, useNotifications } from "@/hooks";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Archivos", href: "/archives", icon: FolderArchive },
  { label: "Clientes", href: "/clients", icon: UserRound },
  { label: "Noticias", href: "/news", icon: Newspaper },
  { label: "Notificaciones", href: "/notifications", icon: Bell },
  { label: "Usuarios", href: "/users", icon: Users, roles: ["SUPER_ADMIN", "NOTARIO"] },
  { label: "Logs", href: "/logs", icon: ScrollText, roles: ["SUPER_ADMIN"] },
];

const settingsItems: NavItem[] = [
  { label: "Mi Perfil", href: "/settings/profile", icon: Settings },
  { label: "Seguridad", href: "/settings/security", icon: Shield },
  { label: "Sistema", href: "/settings/system", icon: Building2, roles: ["SUPER_ADMIN"] },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, isGeneratingPdf } = useUiStore();
  const { is } = usePermissions();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const filterByRole = (items: NavItem[]) =>
    items.filter(
      (item) => !item.roles || is(item.roles as Parameters<typeof is>[0])
    );

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <a href="/" className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border h-16">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border h-16">
          <div className="flex-shrink-0 p-2 w-14 h-10 rounded-lg bg-primary flex items-center justify-center">
            <img src="/logo-consejo-judicatura.png" alt="Logo" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                Sistema Notarial
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                Gestión de Archivos
              </p>
            </div>
          )}
        </div>
      </a>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        <div className="space-y-1">
          {!sidebarCollapsed && (
            <p className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Principal
            </p>
          )}
          {filterByRole(navItems).map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              collapsed={sidebarCollapsed}
              disabled={isGeneratingPdf}
              badge={item.href === "/notifications" && unreadCount > 0 ? unreadCount : undefined}
            />
          ))}
        </div>

        <div className="space-y-1 pt-4 mt-4 border-t border-sidebar-border">
          {!sidebarCollapsed && (
            <p className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Configuración
            </p>
          )}
          {filterByRole(settingsItems).map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              collapsed={sidebarCollapsed}
              disabled={isGeneratingPdf}
            />
          ))}
        </div>
      </nav>

      {/* Toggle */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "absolute -right-3 top-20 z-10 flex items-center justify-center",
          "w-6 h-6 rounded-full border border-sidebar-border bg-sidebar",
          "text-sidebar-foreground/60 hover:text-sidebar-foreground",
          "hover:bg-sidebar transition-colors shadow-md"
        )}
        aria-label={sidebarCollapsed ? "Expandir" : "Colapsar"}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
}

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  disabled?: boolean;
  badge?: number;
}

function NavLink({ item, isActive, collapsed, disabled, badge }: NavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      onClick={(e) => { if (disabled) e.preventDefault(); }}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
        disabled && "opacity-50 pointer-events-none cursor-not-allowed",
        isActive
          ? "bg-white text-sidebar border border-sidebar-primary/20"
          : "text-sidebar-foreground hover:bg-white hover:text-sidebar"
      )}
    >
      <span className="relative flex-shrink-0">
        <Icon
          className={cn(
            "w-4 h-4",
            isActive ? "text-sidebar" : "hover:text-sidebar-foreground"
          )}
        />
        {badge !== undefined && collapsed && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      {!collapsed && (
        <span className="flex-1 flex items-center justify-between truncate">
          <span className="truncate">{item.label}</span>
          {badge !== undefined && (
            <span className="ml-1.5 min-w-[18px] h-4.5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
