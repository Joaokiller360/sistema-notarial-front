"use client";

import { Menu, LogOut, User, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUiStore } from "@/store";
import { useAuth } from "@/hooks";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/notifications";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  NOTARIO: "Notario",
  MATRIZADOR: "Matrizador",
  ARCHIVADOR: "Archivador",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-[#1D2C49] text-white border-[#1D2C49]",
  NOTARIO: "bg-[#1D2C49]/20 text-[#1D2C49] border-[#1D2C49]/30",
  MATRIZADOR: "bg-[#1D2C49]/12 text-[#1D2C49] border-[#1D2C49]/25",
  ARCHIVADOR: "bg-[#1D2C49]/8 text-[#1D2C49] border-[#1D2C49]/15",
};

export function Navbar() {
  const { toggleMobileSidebar } = useUiStore();
  const { user, logout } = useAuth();
  const router = useRouter();

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "?";

  const fullName = user ? `${user.firstName} ${user.lastName}` : "";

  return (
    <header className="h-16 border-b border-border bg-background backdrop-blur-sm flex items-center px-4 gap-4 sticky top-0 z-40">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggleMobileSidebar}
      >
        <Menu className="w-5 h-5" />
      </Button>

      <div id="breadcrumbs-portal" className="flex-1 hidden md:block" />

      <div className="flex items-center gap-2 ml-auto">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-accent transition-colors outline-none"
          >
            <Avatar className="w-7 h-7">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium leading-none">{fullName}</span>
              {user?.roles?.[0] && (
                <span className="text-xs text-muted-foreground">
                  {ROLE_LABELS[user.roles[0]] || user.roles[0]}
                </span>
              )}
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">{fullName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  {user?.roles?.[0] && (
                    <Badge
                      variant="outline"
                      className={`text-xs w-fit mt-1 ${ROLE_COLORS[user.roles[0]]}`}
                    >
                      {ROLE_LABELS[user.roles[0]]}
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
                <User className="w-4 h-4 mr-2" />
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings/security")}>
                <Settings className="w-4 h-4 mr-2" />
                Seguridad
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
