"use client";

import { useEffect } from "react";
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
import { useAuth } from "@/hooks";

const profileSchema = z.object({
  firstName: z.string().min(2, "Nombre requerido").max(100),
  lastName: z.string().min(2, "Apellido requerido").max(100),
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({ firstName: user.firstName, lastName: user.lastName });
    }
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormData) => {
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
                  <Badge variant="outline" className="mt-1 text-xs border-foreground/20 text-foreground/70">
                    {ROLE_LABELS[user.roles[0]] ?? user.roles[0]}
                  </Badge>
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
              Actualiza tu nombre. El correo electrónico no puede modificarse desde aquí.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-foreground">Nombre</Label>
                  <Input
                    id="firstName"
                    placeholder="Tu nombre"
                    {...register("firstName")}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-foreground">Apellido</Label>
                  <Input
                    id="lastName"
                    placeholder="Tu apellido"
                    {...register("lastName")}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-foreground">Correo Electrónico</Label>
                <Input
                  type="email"
                  value={user?.email || ""}
                  readOnly
                  disabled
                  className="opacity-60 cursor-not-allowed"
                />
                <p className="text-xs text-sidebar-foreground/50">
                  El correo no puede cambiarse desde el perfil.
                </p>
              </div>

              <Separator className="bg-white/10" />

              <Button
                type="submit"
                className="cursor-pointer"
                disabled={isSubmitting || !isDirty}
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
