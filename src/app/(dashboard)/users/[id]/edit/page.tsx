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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const NOMBRE_MAX = 60;

const forbiddenChars = /[<>"';&#/\\]/;
const onlyLetters    = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'-]+$/;

const userNameField = z
  .string()
  .min(2, { message: "Mínimo 2 caracteres" })
  .max(NOMBRE_MAX, { message: `Máximo ${NOMBRE_MAX} caracteres` })
  .transform((val) => val.replace(/\s+/g, " ").trim())
  .refine((val) => !forbiddenChars.test(val), {
    message: "No se permiten caracteres especiales ni etiquetas HTML",
  })
  .refine((val) => !/<[^>]*>/g.test(val), {
    message: "No se permiten etiquetas HTML",
  })
  .refine((val) => onlyLetters.test(val), {
    message: "Solo se permiten letras, tildes, espacios y guiones",
  });

const userSchema = z.object({
  firstName: userNameField,
  lastName:  userNameField,
  email: z
    .string()
    .email("Correo electrónico inválido")
    .refine((val) => !/[<>]/.test(val), {
      message: "El correo no puede contener caracteres HTML",
    }),
  roleId: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: targetUser, isLoading, fetchUser, updateUser, isSubmitting } = useUsers();
  const { isSuperAdmin, user: me } = usePermissions();
  const [roles, setRoles] = useState<RoleItem[]>([]);

  const isSelf = id === me?.id;
  const isTargetSuperAdmin = targetUser?.roles?.includes("SUPER_ADMIN") ?? false;
  const showDisabledStatus = isSuperAdmin() && isSelf;
  const showRoleSelector = isSuperAdmin() && !isSelf && !isTargetSuperAdmin;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitted, isValid },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { firstName: "", lastName: "", email: "", roleId: "" },
  });

  const firstNameValue = watch("firstName") || "";
  const lastNameValue = watch("lastName") || "";

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const blocked = ["<", ">", '"', "'", ";", "&", "#", "/", "\\"];
    if (blocked.includes(e.key)) e.preventDefault();
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "<" || e.key === ">") e.preventDefault();
  };

  const handleEmailPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const clean = pasted
      .replace(/<[^>]*>/g, "")
      .replace(/[<>]/g, "")
      .trim();
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end   = el.selectionEnd   ?? 0;
    const newVal = el.value.slice(0, start) + clean + el.value.slice(end);
    setValue("email", newVal, { shouldValidate: true });
  };

  const makePasteHandler =
    (field: "firstName" | "lastName") =>
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text");
      const clean = pasted
        .replace(/<[^>]*>/g, "")
        .replace(/[<>"';&#/\\]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, NOMBRE_MAX);
      const el = e.currentTarget;
      const start = el.selectionStart ?? 0;
      const end   = el.selectionEnd   ?? 0;
      const newVal = (el.value.slice(0, start) + clean + el.value.slice(end))
        .slice(0, NOMBRE_MAX);
      setValue(field, newVal, { shouldValidate: true });
    };

  useEffect(() => {
    if (id) fetchUser(id);
  }, [id, fetchUser]);

  useEffect(() => {
    rolesService.getAll().then(setRoles).catch(() => {});
  }, []);

  useEffect(() => {
    if (targetUser) {
      const currentRoleType = targetUser.roles?.[0];
      const matchedRole = roles.find((r) => r.type === currentRoleType);
      reset({
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        email: targetUser.email,
        roleId: matchedRole?.id ?? "",
      });
    }
  }, [targetUser, roles, reset]);

  const onSubmit = async (data: UserFormData) => {
    await updateUser(id, {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      ...(showRoleSelector && data.roleId ? { roleIds: [data.roleId] } : {}),
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
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  maxLength={NOMBRE_MAX}
                  onKeyDown={handleNameKeyDown}
                  onPaste={makePasteHandler("firstName")}
                  {...register("firstName")}
                />
                <p className="text-xs text-muted-foreground text-right mt-1">
                  {firstNameValue.length} / {NOMBRE_MAX}
                </p>
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Apellido</Label>
                <Input
                  id="lastName"
                  maxLength={NOMBRE_MAX}
                  onKeyDown={handleNameKeyDown}
                  onPaste={makePasteHandler("lastName")}
                  {...register("lastName")}
                />
                <p className="text-xs text-muted-foreground text-right mt-1">
                  {lastNameValue.length} / {NOMBRE_MAX}
                </p>
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                onKeyDown={handleEmailKeyDown}
                onPaste={handleEmailPaste}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {showRoleSelector && (
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <Select
                  value={watch("roleId") ?? ""}
                  onValueChange={(v) => setValue("roleId", v ?? undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {ROLE_TYPE_LABELS[role.type] ?? role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
