"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Pagination } from "@/components/common/Pagination";
import { useUsers, usePermissions } from "@/hooks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { User, Role } from "@/types";
import { usersService } from "@/services";
import { toast } from "sonner";

const ROLE_OPTIONS: { value: Role | ""; label: string }[] = [
  { value: "", label: "Todos los roles" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "NOTARIO", label: "Notario" },
  { value: "MATRIZADOR", label: "Matrizador" },
  { value: "ARCHIVADOR", label: "Archivador" },
];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  NOTARIO: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  MATRIZADOR: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  ARCHIVADOR: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  NOTARIO: "Notario",
  MATRIZADOR: "Matrizador",
  ARCHIVADOR: "Archivador",
};

export default function UsersPage() {
  const router = useRouter();
  const { users, isLoading, fetchUsers, deleteUser } = useUsers();
  const { isSuperAdmin } = usePermissions();

  // NOTARIO cannot act on SUPER_ADMIN users
  const canActOn = (target: User) =>
    isSuperAdmin() || !target.roles.includes("SUPER_ADMIN");

  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchUsers({ search: search || undefined, role: role || undefined, page, limit: 10 });
  }, [fetchUsers, search, role, page]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const handleToggleActive = async (user: User) => {
    try {
      await usersService.toggleActive(user.id);
      toast.success(`Usuario ${user.isActive ? "desactivado" : "activado"}`);
      load();
    } catch {
      toast.error("Error al actualizar el estado");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteUser(deleteId);
    setDeleteId(null);
    load();
  };

  const columns: Column<User>[] = [
    {
      key: "name",
      label: "Usuario",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {row.firstName[0]}{row.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{row.firstName} {row.lastName}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Rol",
      render: (row) => (
        <Badge variant="outline" className={`text-xs ${ROLE_COLORS[row.roles?.[0]]}`}>
          {ROLE_LABELS[row.roles?.[0]] || row.roles?.[0]}
        </Badge>
      ),
    },
    {
      key: "isActive",
      label: "Estado",
      render: (row) => (
        <Badge
          variant="outline"
          className={row.isActive
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
          }
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 inline-block" />
          {row.isActive ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      className: "text-right",
      render: (row) => {
        const allowed = canActOn(row);
        return (
          <div className="flex items-center justify-end gap-1">
            {allowed ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleToggleActive(row)}
                  title={row.isActive ? "Desactivar" : "Activar"}
                >
                  {row.isActive
                    ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                    : <ToggleLeft className="w-4 h-4" />
                  }
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => router.push(`/users/${row.id}/edit`)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => setDeleteId(row.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground pr-2">Sin permisos</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" description="Gestión de usuarios y permisos del sistema">
        <ButtonLink href="/users/new">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </ButtonLink>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o correo..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select
          value={role || "__all__"}
          onValueChange={(v) => { setRole(v === "__all__" ? "" : v as Role); setPage(1); }}
        >
          <SelectTrigger className="w-48">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <DataTable
          columns={columns}
          data={users?.data || []}
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          emptyTitle="No hay usuarios"
          emptyDescription="Agrega el primer usuario al sistema."
        />
        {users && users.totalPages > 1 && (
          <Pagination
            page={users.page}
            totalPages={users.totalPages}
            total={users.total}
            limit={users.limit}
            onPageChange={setPage}
          />
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al usuario del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
