"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, User, Eye, EyeOff, Ban, CheckCircle, XCircle } from "lucide-react";
import { toTitleCase } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useUsers, usePermissions } from "@/hooks";
import { rolesService, type RoleItem } from "@/services";
import { cn } from "@/lib/utils";
import type { User as UserModel } from "@/types";

/* ------------------------------------------------------------------ */
/*  Shared validation / helpers                                        */
/* ------------------------------------------------------------------ */

const ROLE_TYPE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
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

const NOMBRE_MAX = 60;
const forbiddenChars = /[<>"';&#/\\]/;
const onlyLetters = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'-]+$/;

const userNameField = z
  .string()
  .min(2, { message: "Mínimo 2 caracteres" })
  .max(NOMBRE_MAX, { message: `Máximo ${NOMBRE_MAX} caracteres` })
  .transform((val) => toTitleCase(val))
  .refine((val) => !forbiddenChars.test(val), {
    message: "No se permiten caracteres especiales ni etiquetas HTML",
  })
  .refine((val) => !/<[^>]*>/g.test(val), { message: "No se permiten etiquetas HTML" })
  .refine((val) => onlyLetters.test(val), {
    message: "Solo se permiten letras, tildes, espacios y guiones",
  });

const emailField = z
  .string()
  .email("Correo electrónico inválido")
  .refine((val) => !/[<>]/.test(val), {
    message: "El correo no puede contener caracteres HTML",
  });

const passwordRules = [
  { id: "length", label: "Mínimo 8 caracteres", test: (v: string) => v.length >= 8 },
  { id: "upper", label: "Al menos 1 letra mayúscula", test: (v: string) => /[A-Z]/.test(v) },
  { id: "number", label: "Al menos 1 número", test: (v: string) => /\d/.test(v) },
  {
    id: "special",
    label: "Al menos 1 carácter especial (@$!%*?&)",
    test: (v: string) => /[@$!%*?&]/.test(v),
  },
];

function useNameGuards(
  setValue: (name: "firstName" | "lastName" | "email", value: string, opts?: object) => void
) {
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const blocked = ["<", ">", '"', "'", ";", "&", "#", "/", "\\"];
    if (blocked.includes(e.key)) e.preventDefault();
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "<" || e.key === ">") e.preventDefault();
  };

  const handleEmailPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const clean = e.clipboardData
      .getData("text")
      .replace(/<[^>]*>/g, "")
      .replace(/[<>]/g, "")
      .trim();
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    setValue("email", el.value.slice(0, start) + clean + el.value.slice(end), {
      shouldValidate: true,
    });
  };

  const makePasteHandler =
    (field: "firstName" | "lastName") =>
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const clean = e.clipboardData
        .getData("text")
        .replace(/<[^>]*>/g, "")
        .replace(/[<>"';&#/\\]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, NOMBRE_MAX);
      const el = e.currentTarget;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      setValue(
        field,
        (el.value.slice(0, start) + clean + el.value.slice(end)).slice(0, NOMBRE_MAX),
        { shouldValidate: true }
      );
    };

  return { handleNameKeyDown, handleEmailKeyDown, handleEmailPaste, makePasteHandler };
}

/* ------------------------------------------------------------------ */
/*  Crear                                                             */
/* ------------------------------------------------------------------ */

const createSchema = z
  .object({
    firstName: userNameField,
    lastName: userNameField,
    email: emailField,
    roleId: z.string().min(1, "Selecciona un rol"),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
      .regex(/\d/, "Debe incluir al menos un número")
      .regex(/[@$!%*?&]/, "Debe incluir al menos un carácter especial (@$!%*?&)"),
    confirmPassword: z.string().min(1, "Confirma la contraseña"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type CreateFormData = z.infer<typeof createSchema>;

function CreateUserForm({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const { createUser, isSubmitting } = useUsers();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [roles, setRoles] = useState<RoleItem[]>([]);

  useEffect(() => {
    rolesService.getAll().then(setRoles).catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitted, isValid },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { roleId: "", firstName: "", lastName: "" },
  });

  const { handleNameKeyDown, handleEmailKeyDown, handleEmailPaste, makePasteHandler } =
    useNameGuards(setValue as never);

  const passwordValue = watch("password") || "";
  const firstNameValue = watch("firstName") || "";
  const lastNameValue = watch("lastName") || "";

  const onSubmit = async (data: CreateFormData) => {
    await createUser({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
      roleIds: [data.roleId],
    });
    onDone();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-0">
      <div className="space-y-4 overflow-y-auto px-1 pb-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">Nombre</Label>
            <Input
              id="firstName"
              placeholder="Juan"
              maxLength={NOMBRE_MAX}
              onKeyDown={handleNameKeyDown}
              onPaste={makePasteHandler("firstName")}
              onBlur={(e) =>
                setValue("firstName", toTitleCase(e.target.value), { shouldValidate: true })
              }
              {...(({ onBlur: _b, ...r }) => r)(register("firstName"))}
            />
            <p className="text-xs text-muted-foreground text-right">
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
              placeholder="Pérez"
              maxLength={NOMBRE_MAX}
              onKeyDown={handleNameKeyDown}
              onPaste={makePasteHandler("lastName")}
              onBlur={(e) =>
                setValue("lastName", toTitleCase(e.target.value), { shouldValidate: true })
              }
              {...(({ onBlur: _b, ...r }) => r)(register("lastName"))}
            />
            <p className="text-xs text-muted-foreground text-right">
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
            placeholder="usuario@notaria.com"
            onKeyDown={handleEmailKeyDown}
            onPaste={handleEmailPaste}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Rol</Label>
          <Select value={watch("roleId")} onValueChange={(v) => setValue("roleId", v ?? "")}>
            <SelectTrigger className="w-full">
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
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="mt-1 space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              La contraseña debe cumplir:
            </p>
            {passwordRules.map((rule) => {
              const passes = rule.test(passwordValue);
              return (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-2 text-xs transition-colors",
                    passes ? "text-emerald-400" : "text-muted-foreground"
                  )}
                >
                  {passes ? (
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  {rule.label}
                </div>
              );
            })}
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              className="pr-10"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="cursor-pointer"
          disabled={isSubmitting || (isSubmitted && !isValid)}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Creando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Crear Usuario
            </span>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Editar                                                            */
/* ------------------------------------------------------------------ */

const editSchema = z.object({
  firstName: userNameField,
  lastName: userNameField,
  email: emailField,
  roleType: z.string().optional(),
  pdfDownloadDisabled: z.boolean().optional(),
});

type EditFormData = z.infer<typeof editSchema>;

function EditUserForm({
  userId,
  onDone,
  onCancel,
}: {
  userId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { user: targetUser, isLoading, fetchUser, updateUser, isSubmitting } = useUsers();
  const { isSuperAdmin, user: me } = usePermissions();
  const [roles, setRoles] = useState<RoleItem[]>([]);

  const isSelf = userId === me?.id;
  const isTargetSuperAdmin = (targetUser?.roles ?? []).includes("SUPER_ADMIN");
  const showDisabledStatus = isSuperAdmin() && isSelf;
  const showRoleSelector = isSuperAdmin() && !isSelf && !isTargetSuperAdmin;
  const showPdfRestriction = isSuperAdmin() && !isSelf && !isTargetSuperAdmin;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitted, isValid },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      roleType: "",
      pdfDownloadDisabled: false,
    },
  });

  const { handleNameKeyDown, handleEmailKeyDown, handleEmailPaste, makePasteHandler } =
    useNameGuards(setValue as never);

  const firstNameValue = watch("firstName") || "";
  const lastNameValue = watch("lastName") || "";

  useEffect(() => {
    fetchUser(userId);
  }, [userId, fetchUser]);

  useEffect(() => {
    rolesService.getAll().then(setRoles).catch(() => {});
  }, []);

  useEffect(() => {
    if (targetUser && targetUser.id === userId) {
      reset({
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        email: targetUser.email,
        roleType: targetUser.roles?.[0] ?? "",
        pdfDownloadDisabled: targetUser.pdfDownloadDisabled ?? false,
      });
    }
  }, [targetUser, userId, reset]);

  const onSubmit = async (data: EditFormData) => {
    const selectedRole = roles.find((r) => r.type === data.roleType);
    await updateUser(userId, {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      ...(showRoleSelector && selectedRole ? { roleIds: [selectedRole.id] } : {}),
      ...(showPdfRestriction ? { pdfDownloadDisabled: !!data.pdfDownloadDisabled } : {}),
    });
    onDone();
  };

  if (isLoading && (!targetUser || targetUser.id !== userId)) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuperAdmin() && isTargetSuperAdmin) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <p className="text-sm text-muted-foreground">
          No tienes permiso para editar este usuario.
        </p>
        <Button variant="outline" className="cursor-pointer" onClick={onCancel}>
          Cerrar
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-0">
      <div className="space-y-4 overflow-y-auto px-1 pb-2">
        {targetUser?.roles?.[0] && (
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <span className="text-sm text-muted-foreground">Rol actual</span>
            <Badge
              variant="outline"
              className={`text-xs ${ROLE_COLORS[targetUser.roles[0]] ?? ""}`}
            >
              {ROLE_TYPE_LABELS[targetUser.roles[0]] ?? targetUser.roles[0]}
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">Nombre</Label>
            <Input
              id="firstName"
              maxLength={NOMBRE_MAX}
              onKeyDown={handleNameKeyDown}
              onPaste={makePasteHandler("firstName")}
              onBlur={(e) =>
                setValue("firstName", toTitleCase(e.target.value), { shouldValidate: true })
              }
              {...(({ onBlur: _b, ...r }) => r)(register("firstName"))}
            />
            <p className="text-xs text-muted-foreground text-right">
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
              onBlur={(e) =>
                setValue("lastName", toTitleCase(e.target.value), { shouldValidate: true })
              }
              {...(({ onBlur: _b, ...r }) => r)(register("lastName"))}
            />
            <p className="text-xs text-muted-foreground text-right">
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
              value={watch("roleType") ?? ""}
              onValueChange={(v) => setValue("roleType", v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.type}>
                    {ROLE_TYPE_LABELS[role.type] ?? role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showPdfRestriction && (
          <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-border accent-primary cursor-pointer"
                checked={!!watch("pdfDownloadDisabled")}
                onChange={(e) =>
                  setValue("pdfDownloadDisabled", e.target.checked, { shouldDirty: true })
                }
              />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Ban className="w-3.5 h-3.5 text-destructive" />
                  Restringir descarga e impresión de PDF
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  El usuario podrá ver los PDF de archivos pero no descargarlos,
                  imprimirlos ni abrirlos en una pestaña nueva.
                </span>
              </span>
            </label>
          </div>
        )}

        {showDisabledStatus && (
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={targetUser?.isActive ? "true" : "false"} disabled>
              <SelectTrigger className="w-full opacity-60 pointer-events-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Activo</SelectItem>
                <SelectItem value="false">Inactivo</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              No puedes desactivar tu propia cuenta.
            </p>
          </div>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
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
      </DialogFooter>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Wrapper                                                           */
/* ------------------------------------------------------------------ */

export interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente = modo edición; ausente = modo creación. */
  editUser?: Pick<UserModel, "id" | "firstName" | "lastName"> | null;
  /** Se llama tras crear/editar con éxito (para refrescar la lista). */
  onSaved: () => void;
}

export function UserFormDialog({
  open,
  onOpenChange,
  editUser,
  onSaved,
}: UserFormDialogProps) {
  const isEdit = !!editUser;

  const handleDone = () => {
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            {isEdit
              ? `Editar: ${editUser!.firstName} ${editUser!.lastName}`
              : "Nuevo Usuario"}
          </DialogTitle>
        </DialogHeader>

        {open &&
          (isEdit ? (
            <EditUserForm
              userId={editUser!.id}
              onDone={handleDone}
              onCancel={() => onOpenChange(false)}
            />
          ) : (
            <CreateUserForm onDone={handleDone} onCancel={() => onOpenChange(false)} />
          ))}
      </DialogContent>
    </Dialog>
  );
}
