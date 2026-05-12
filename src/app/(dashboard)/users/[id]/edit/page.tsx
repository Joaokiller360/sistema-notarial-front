"use client";

import { useEffect } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { CharCounter } from "@/components/common/CharCounter";
import { useUsers, usePermissions } from "@/hooks";

const NOMBRE_MAX = 250;

const userSchema = z.object({
  firstName: z
    .string()
    .min(2, "Nombre requerido")
    .max(NOMBRE_MAX, "No puede superar los 250 caracteres"),
  lastName: z
    .string()
    .min(2, "Apellido requerido")
    .max(NOMBRE_MAX, "No puede superar los 250 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
});

type UserFormData = z.infer<typeof userSchema>;

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: targetUser, isLoading, fetchUser, updateUser, isSubmitting } = useUsers();
  const { isSuperAdmin, user: me } = usePermissions();

  const isSelf = id === me?.id;
  const isTargetSuperAdmin = targetUser?.roles?.includes("SUPER_ADMIN") ?? false;
  // Show disabled status indicator only when super_admin edits their own profile
  const showDisabledStatus = isSuperAdmin() && isSelf;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitted, isValid },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { firstName: "", lastName: "", email: "" },
  });

  const firstNameValue = watch("firstName") || "";
  const lastNameValue = watch("lastName") || "";

  useEffect(() => {
    if (id) fetchUser(id);
  }, [id, fetchUser]);

  useEffect(() => {
    if (targetUser) {
      reset({
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        email: targetUser.email,
      });
    }
  }, [targetUser, reset]);

  const onSubmit = async (data: UserFormData) => {
    await updateUser(id, {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
    });
    router.push("/users");
  };

  if (isLoading) return <PageLoader />;

  if (!isSuperAdmin() && isTargetSuperAdmin) {
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
        title={targetUser ? `Editar: ${targetUser.firstName} ${targetUser.lastName}` : "Editar Usuario"}
        description="Modifica los datos del usuario"
      >
        <ButtonLink href="/users" variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Cancelar
        </ButtonLink>
        <Button
          type="submit"
          className="cursor-pointer"
          disabled={isSubmitting || (isSubmitted && !isValid)}
        >
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
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Datos del Usuario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="firstName">Nombre</Label>
                  <CharCounter current={firstNameValue.length} max={NOMBRE_MAX} warnAt={20} />
                </div>
                <Input
                  id="firstName"
                  maxLength={NOMBRE_MAX}
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lastName">Apellido</Label>
                  <CharCounter current={lastNameValue.length} max={NOMBRE_MAX} warnAt={20} />
                </div>
                <Input
                  id="lastName"
                  maxLength={NOMBRE_MAX}
                  {...register("lastName")}
                />
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

            {showDisabledStatus && (
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger render={<div className="cursor-not-allowed" />}>
                      <Select value={targetUser?.isActive ? "true" : "false"} disabled>
                        <SelectTrigger className="opacity-60 pointer-events-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Activo</SelectItem>
                          <SelectItem value="false">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </TooltipTrigger>
                    <TooltipContent>
                      No puedes desactivar tu propia cuenta
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
