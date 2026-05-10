"use client";

import { Bell, Menu, LogOut, User, Settings } from "lucide-react";
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

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  NOTARIO: "Notario",
  MATRIZADOR: "Matrizador",
  ARCHIVADOR: "Archivador",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  NOTARIO: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  MATRIZADOR: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  ARCHIVADOR: "bg-amber-500/10 text-amber-400 border-amber-500/20",
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
    <header className="h-16 border-b border-border bg-sidebar backdrop-blur-sm flex items-center px-4 gap-4 sticky top-0 z-40">
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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
        </Button>

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
