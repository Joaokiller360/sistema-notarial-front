"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Save, User, Eye, EyeOff, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { toTitleCase } from "@/utils/formatters";
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
import { useUsers } from "@/hooks";
import { rolesService, type RoleItem } from "@/services";
import { cn } from "@/lib/utils";

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
  .transform((val) => toTitleCase(val))
  .refine((val) => !forbiddenChars.test(val), {
    message: "No se permiten caracteres especiales ni etiquetas HTML",
  })
  .refine((val) => !/<[^>]*>/g.test(val), {
    message: "No se permiten etiquetas HTML",
  })
  .refine((val) => onlyLetters.test(val), {
    message: "Solo se permiten letras, tildes, espacios y guiones",
  });

const passwordRules = [
  { id: "length",  label: "Mínimo 8 caracteres",          test: (v: string) => v.length >= 8 },
  { id: "upper",   label: "Al menos 1 letra mayúscula",   test: (v: string) => /[A-Z]/.test(v) },
  { id: "number",  label: "Al menos 1 número",            test: (v: string) => /\d/.test(v) },
  { id: "special", label: "Al menos 1 carácter especial (@$!%*?&)", test: (v: string) => /[@$!%*?&]/.test(v) },
];

const userSchema = z
  .object({
    firstName: userNameField,
    lastName:  userNameField,
    email: z
      .string()
      .email("Correo electrónico inválido")
      .refine((val) => !/[<>]/.test(val), {
        message: "El correo no puede contener caracteres HTML",
      }),
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

type UserFormData = z.infer<typeof userSchema>;

export default function NewUserPage() {
  const router = useRouter();
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
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { roleId: "", firstName: "", lastName: "" },
  });

  const passwordValue = watch("password") || "";
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

  const onSubmit = async (data: UserFormData) => {
    await createUser({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
      roleIds: [data.roleId],
    });
    router.push("/users");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <PageHeader title="Nuevo Usuario" description="Agrega un nuevo usuario al sistema">
        <ButtonLink href="/users" variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Volver
        </ButtonLink>
        <Button
          className="cursor-pointer"
          type="submit"
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
      </PageHeader>

      <div className="max-w-2xl space-y-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Datos Personales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  placeholder="Juan"
                  maxLength={NOMBRE_MAX}
                  onKeyDown={handleNameKeyDown}
                  onPaste={makePasteHandler("firstName")}
                  onBlur={(e) => setValue("firstName", toTitleCase(e.target.value), { shouldValidate: true })}
                  {...(({ onBlur: _b, ...r }) => r)(register("firstName"))}
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
                  placeholder="Pérez"
                  maxLength={NOMBRE_MAX}
                  onKeyDown={handleNameKeyDown}
                  onPaste={makePasteHandler("lastName")}
                  onBlur={(e) => setValue("lastName", toTitleCase(e.target.value), { shouldValidate: true })}
                  {...(({ onBlur: _b, ...r }) => r)(register("lastName"))}
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
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Contraseña de Acceso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

              <div className="mt-2 space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
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
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
