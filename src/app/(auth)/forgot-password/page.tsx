"use client";

import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Recuperar contraseña
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Contacta a tu administrador del sistema para restablecer tu contraseña.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4 flex items-start gap-3">
        <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          El restablecimiento de contraseñas es gestionado por el administrador del sistema. Si no puedes iniciar sesión, comunícate con un usuario con rol{" "}
          <strong className="text-foreground">Super Admin</strong> o{" "}
          <strong className="text-foreground">Notario</strong>.
        </p>
      </div>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Volver al inicio de sesión
      </Link>
    </div>
  );
}
