"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/common/PageHeader";
import { CharCounter } from "@/components/common/CharCounter";
import { useAuth } from "@/hooks";
import { extractRoleKey, toTitleCase } from "@/utils/formatters";

const NAME_MAX = 60;
const NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const profileSchema = z.object({
  firstName: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(NAME_MAX, `No puede superar los ${NAME_MAX} caracteres`)
    .transform((val) => toTitleCase(val))
    .refine((val) => NAME_REGEX.test(val), "El nombre solo puede contener letras"),
  lastName: z
    .string()
    .min(1, "El apellido es obligatorio")
    .max(NAME_MAX, `No puede superar los ${NAME_MAX} caracteres`)
    .transform((val) => toTitleCase(val))
    .refine((val) => NAME_REGEX.test(val), "El apellido solo puede contener letras"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  NOTARIO: "Notario",
  MATRIZADOR: "Matrizador",
  ARCHIVADOR: "Archivador",
};

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [emailError, setEmailError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty, isValid, isSubmitted },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName || "", lastName: user?.lastName || "" },
  });

  const firstNameValue = watch("firstName") ?? "";
  const lastNameValue = watch("lastName") ?? "";

  const validateEmail = useCallback((email: string | undefined) => {
    if (!email) {
      setEmailError("El correo es obligatorio");
      return false;
    }
    if (!EMAIL_REGEX.test(email)) {
      setEmailError("Ingresa un correo electrónico válido");
      return false;
    }
    setEmailError(null);
    return true;
  }, []);

  useEffect(() => {
    if (user) {
      reset({ firstName: user.firstName, lastName: user.lastName });
      validateEmail(user.email);
    }
  }, [user, reset, validateEmail]);

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const control = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Home", "End", "Tab"];
    if (control.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!NAME_REGEX.test(e.key)) e.preventDefault();
  };

  const makeNamePasteHandler =
    (field: "firstName" | "lastName") =>
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text");
      const clean = pasted
        .replace(/<[^>]*>/g, "")
        .replace(/[<>"';&#/\\]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, NAME_MAX);
      const el = e.currentTarget;
      const start = el.selectionStart ?? 0;
      const end   = el.selectionEnd   ?? 0;
      const newVal = (el.value.slice(0, start) + clean + el.value.slice(end))
        .slice(0, NAME_MAX);
      setValue(field, newVal, { shouldValidate: true });
    };

  const onSubmit = async (data: ProfileFormData) => {
    if (!validateEmail(user?.email)) return;
    try {
      await updateProfile({ firstName: data.firstName, lastName: data.lastName });
      reset({ firstName: data.firstName, lastName: data.lastName });
    } catch {
      // toast already shown by the hook
    }
  };

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "?";

  const hasErrors = !!emailError || (isSubmitted && !isValid);
  const saveDisabled = isSubmitting || !isDirty || hasErrors;

  return (
    <div className="space-y-6">
      <PageHeader title="Mi Perfil" description="Gestiona tu información personal" />

      <div className="max-w-2xl space-y-6">
        {/* Avatar card */}
        <Card className="border-border bg-background">
          <CardContent className="py-2">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="text-xl font-bold bg-white border-foreground border-4 text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-base font-semibold text-foreground">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-sm text-foreground/60">{user?.email}</p>
                {user?.roles?.[0] && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">Rol asignado</span>
                    <Badge variant="secondary" className="text-xs">
                      {ROLE_LABELS[user.roles[0]] ?? user.roles[0]}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit form */}
        <Card className="border-border bg-background">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <User className="w-4 h-4 text-foreground" />
              Información Personal
            </CardTitle>
            <CardDescription className="text-foreground/60">
              Actualiza tu nombre y apellido. El correo electrónico no puede modificarse desde aquí.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Nombre — editable */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="firstName" className="text-foreground">Nombre</Label>
                    <CharCounter current={firstNameValue.length} max={NAME_MAX} warnAt={10} />
                  </div>
                  <Input
                    id="firstName"
                    placeholder="Tu nombre"
                    maxLength={NAME_MAX}
                    onKeyDown={handleNameKeyDown}
                    onPaste={makeNamePasteHandler("firstName")}
                    onBlur={(e) => setValue("firstName", toTitleCase(e.target.value), { shouldValidate: true })}
                    {...(({ onBlur: _b, ...r }) => r)(register("firstName"))}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName.message}</p>
                  )}
                </div>

                {/* Apellido — editable */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="lastName" className="text-foreground">Apellido</Label>
                    <CharCounter current={lastNameValue.length} max={NAME_MAX} warnAt={10} />
                  </div>
                  <Input
                    id="lastName"
                    placeholder="Tu apellido"
                    maxLength={NAME_MAX}
                    onKeyDown={handleNameKeyDown}
                    onPaste={makeNamePasteHandler("lastName")}
                    onBlur={(e) => setValue("lastName", toTitleCase(e.target.value), { shouldValidate: true })}
                    {...(({ onBlur: _b, ...r }) => r)(register("lastName"))}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              {/* Correo — solo lectura, validado como guarda */}
              <div className="space-y-1.5">
                <Label className="text-foreground">Correo Electrónico</Label>
                <Input
                  type="email"
                  value={user?.email || ""}
                  readOnly
                  disabled
                  className="opacity-60 cursor-not-allowed"
                />
                {emailError ? (
                  <p className="text-xs text-destructive">{emailError}</p>
                ) : (
                  <p className="text-xs text-sidebar-foreground/50">
                    El correo no puede cambiarse desde el perfil.
                  </p>
                )}
              </div>

              <Separator className="bg-white/10" />

              <Button
                type="submit"
                className="cursor-pointer"
                disabled={saveDisabled}
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
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
