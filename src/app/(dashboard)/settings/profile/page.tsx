"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, User, Shield, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/common/PageHeader";
import { CharCounter } from "@/components/common/CharCounter";
import { useAuth } from "@/hooks";
import { toTitleCase } from "@/utils/formatters";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

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

const PASSWORD_RULES = [
  { key: "len", label: "Mínimo 8 caracteres", test: (v: string) => v.length >= 8 },
  { key: "upper", label: "Una mayúscula", test: (v: string) => /[A-Z]/.test(v) },
  { key: "num", label: "Un número", test: (v: string) => /[0-9]/.test(v) },
  { key: "special", label: "Un carácter especial (@$!%*?&)", test: (v: string) => /[@$!%*?&]/.test(v) },
] as const;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Contraseña actual requerida"),
    newPassword: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
      .regex(/[0-9]/, "Debe contener al menos un número")
      .regex(/[@$!%*?&]/, "Debe contener al menos un carácter especial (@$!%*?&)"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
type PasswordFormData = z.infer<typeof passwordSchema>;

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  NOTARIO: "Notario",
  MATRIZADOR: "Matrizador",
  ARCHIVADOR: "Archivador",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AccountSettingsPage() {
  const { user, updateProfile, changePassword } = useAuth();
  const securityRef = useRef<HTMLDivElement>(null);

  // Deep-link: /settings/profile?tab=security scrolls to the password card.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("tab") === "security") {
      securityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  /* ---------- profile form ---------- */
  const [emailError, setEmailError] = useState<string | null>(null);
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    watch: watchProfile,
    setValue: setProfileValue,
    formState: {
      errors: profileErrors,
      isSubmitting: isProfileSubmitting,
      isDirty: isProfileDirty,
      isValid: isProfileValid,
      isSubmitted: isProfileSubmitted,
    },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName || "", lastName: user?.lastName || "" },
  });

  const firstNameValue = watchProfile("firstName") ?? "";
  const lastNameValue = watchProfile("lastName") ?? "";

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
      resetProfile({ firstName: user.firstName, lastName: user.lastName });
      validateEmail(user.email);
    }
  }, [user, resetProfile, validateEmail]);

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
      const end = el.selectionEnd ?? 0;
      const newVal = (el.value.slice(0, start) + clean + el.value.slice(end)).slice(0, NAME_MAX);
      setProfileValue(field, newVal, { shouldValidate: true });
    };

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!validateEmail(user?.email)) return;
    try {
      await updateProfile({ firstName: data.firstName, lastName: data.lastName });
      resetProfile({ firstName: data.firstName, lastName: data.lastName });
    } catch {
      /* toast handled by hook */
    }
  };

  const profileHasErrors = !!emailError || (isProfileSubmitted && !isProfileValid);
  const profileSaveDisabled = isProfileSubmitting || !isProfileDirty || profileHasErrors;

  /* ---------- password form ---------- */
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    watch: watchPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    mode: "onChange",
  });

  const newPasswordValue = watchPassword("newPassword") ?? "";
  const ruleState = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(newPasswordValue) })),
    [newPasswordValue]
  );

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      resetPassword();
    } catch {
      /* toast handled by hook */
    }
  };

  /* ---------- derived ---------- */
  const initials = user
    ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()
    : "?";
  const roleLabel = user?.roles?.[0]
    ? ROLE_LABELS[user.roles[0]] ?? user.roles[0]
    : null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-1 sm:px-0">
      <PageHeader
        title="Mi Cuenta"
        description="Gestiona tu información personal y la seguridad de tu cuenta"
      />

      <div className="space-y-6">
        {/* ---------- Identity summary ---------- */}
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 py-5">
            <Avatar className="w-14 h-14 shrink-0">
              <AvatarFallback className="text-lg font-bold bg-background border-2 border-border text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              {roleLabel && (
                <Badge variant="secondary" className="text-xs">
                  {roleLabel}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ---------- Información Personal ---------- */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Información Personal
            </CardTitle>
            <CardDescription>
              Actualiza tu nombre y apellido. El correo electrónico no puede modificarse desde aquí.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="firstName">Nombre</Label>
                    <CharCounter current={firstNameValue.length} max={NAME_MAX} warnAt={10} />
                  </div>
                  <Input
                    id="firstName"
                    placeholder="Tu nombre"
                    maxLength={NAME_MAX}
                    onKeyDown={handleNameKeyDown}
                    onPaste={makeNamePasteHandler("firstName")}
                    onBlur={(e) => setProfileValue("firstName", toTitleCase(e.target.value), { shouldValidate: true })}
                    {...(({ onBlur: _b, ...r }) => r)(registerProfile("firstName"))}
                  />
                  {profileErrors.firstName && (
                    <p className="text-xs text-destructive">{profileErrors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="lastName">Apellido</Label>
                    <CharCounter current={lastNameValue.length} max={NAME_MAX} warnAt={10} />
                  </div>
                  <Input
                    id="lastName"
                    placeholder="Tu apellido"
                    maxLength={NAME_MAX}
                    onKeyDown={handleNameKeyDown}
                    onPaste={makeNamePasteHandler("lastName")}
                    onBlur={(e) => setProfileValue("lastName", toTitleCase(e.target.value), { shouldValidate: true })}
                    {...(({ onBlur: _b, ...r }) => r)(registerProfile("lastName"))}
                  />
                  {profileErrors.lastName && (
                    <p className="text-xs text-destructive">{profileErrors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Correo Electrónico</Label>
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
                  <p className="text-xs text-muted-foreground">
                    El correo no puede cambiarse desde el perfil.
                  </p>
                )}
              </div>

              <Separator />

              <Button
                type="submit"
                className="text-primary-foreground cursor-pointer"
                disabled={profileSaveDisabled}
              >
                {isProfileSubmitting ? (
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

        {/* ---------- Cambiar Contraseña ---------- */}
        <Card ref={securityRef} className="border-border bg-card scroll-mt-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Cambiar Contraseña
            </CardTitle>
            <CardDescription>
              Usa una contraseña de al menos 8 caracteres, con mayúsculas y números.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
              <PasswordField
                id="currentPassword"
                label="Contraseña Actual"
                show={showCurrent}
                onToggle={() => setShowCurrent((v) => !v)}
                error={passwordErrors.currentPassword?.message}
                register={registerPassword("currentPassword")}
              />

              <PasswordField
                id="newPassword"
                label="Nueva Contraseña"
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
                error={passwordErrors.newPassword?.message}
                register={registerPassword("newPassword")}
              />

              {newPasswordValue.length > 0 && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                  {ruleState.map((r) => (
                    <li
                      key={r.key}
                      className={cn(
                        "flex items-center gap-1.5 text-xs",
                        r.ok ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      <Check className={cn("w-3.5 h-3.5 shrink-0", r.ok ? "opacity-100" : "opacity-30")} />
                      {r.label}
                    </li>
                  ))}
                </ul>
              )}

              <PasswordField
                id="confirmPassword"
                label="Confirmar Nueva Contraseña"
                show={showConfirm}
                onToggle={() => setShowConfirm((v) => !v)}
                error={passwordErrors.confirmPassword?.message}
                register={registerPassword("confirmPassword")}
              />

              <Separator />

              <Button
                type="submit"
                className="text-primary-foreground cursor-pointer"
                disabled={isPasswordSubmitting}
              >
                {isPasswordSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Actualizando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Actualizar Contraseña
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

/* ------------------------------------------------------------------ */
/*  Local components                                                   */
/* ------------------------------------------------------------------ */

interface PasswordFieldProps {
  id: string;
  label: string;
  show: boolean;
  onToggle: () => void;
  error?: string;
  register: UseFormRegisterReturn;
}

function PasswordField({ id, label, show, onToggle, error, register }: PasswordFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder="••••••••"
          className="pr-10"
          {...register}
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
