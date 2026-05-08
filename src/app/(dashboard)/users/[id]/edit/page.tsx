"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { useUsers, usePermissions } from "@/hooks";
import { rolesService, type RoleItem } from "@/services";

const ROLE_TYPE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  NOTARIO: "Notario",
  MATRIZADOR: "Matrizador",
  ARCHIVADOR: "Archivador",
};

const userSchema = z.object({
  firstName: z.string().min(2, "Nombre requerido"),
  lastName: z.string().min(2, "Apellido requerido"),
  email: z.string().email("Correo electrónico inválido"),
  roleId: z.string().min(1, "Selecciona un rol"),
  isActive: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading, fetchUser, updateUser, isSubmitting } = useUsers();
  const { isSuperAdmin } = usePermissions();
  const [roles, setRoles] = useState<RoleItem[]>([]);

  useEffect(() => {
    rolesService.getAll().then(setRoles).catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { isActive: true, roleId: "" },
  });

  useEffect(() => {
    if (id) fetchUser(id);
  }, [id, fetchUser]);

  useEffect(() => {
    if (user && roles.length > 0) {
      // Encontrar el rol actual del usuario buscando por type
      const userRoleType = user.roles?.[0];
      const matchedRole = roles.find((r) => r.type === userRoleType);

      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roleId: matchedRole?.id || "",
        isActive: user.isActive,
      });
    }
  }, [user, roles, reset]);

  const onSubmit = async (data: UserFormData) => {
    await updateUser(id, {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      roleIds: [data.roleId],
      isActive: data.isActive,
    });
    router.push("/users");
  };

  if (isLoading) return <PageLoader />;

  // NOTARIO cannot edit SUPER_ADMIN users
  if (!isSuperAdmin() && user?.roles.includes("SUPER_ADMIN")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">No tienes permiso para editar este usuario.</p>
        <button
          className="text-sm text-primary underline"
          onClick={() => router.push("/users")}
        >
          Volver a Usuarios
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <PageHeader
        title={user ? `Editar: ${user.firstName} ${user.lastName}` : "Editar Usuario"}
        description="Modifica los datos del usuario"
      >
        <ButtonLink href="/users" variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Cancelar
        </ButtonLink>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Guardando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Guardar Cambios
            </span>
          )}
        </Button>
      </PageHeader>

      <div className="max-w-2xl">
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Datos del Usuario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Nombre</Label>
                <Input id="firstName" {...register("firstName")} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Apellido</Label>
                <Input id="lastName" {...register("lastName")} />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <Select
                  value={watch("roleId")}
                  onValueChange={(v) => setValue("roleId", v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {ROLE_TYPE_LABELS[role.type] || role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.roleId && (
                  <p className="text-xs text-destructive">{errors.roleId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select
                  value={watch("isActive") ? "true" : "false"}
                  onValueChange={(v) => setValue("isActive", v === "true")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Activo</SelectItem>
                    <SelectItem value="false">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
