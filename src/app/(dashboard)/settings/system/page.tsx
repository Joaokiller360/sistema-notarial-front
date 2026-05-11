"use client";

import { Building2, Settings, Shield, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/common/PageHeader";
import { RoleGuard } from "@/guards";
import { EmptyState } from "@/components/common/EmptyState";

export default function SystemSettingsPage() {
  return (
    <RoleGuard
      roles={["SUPER_ADMIN"]}
      fallback={
        <EmptyState
          icon={Shield}
          title="Acceso Restringido"
          description="Solo el Super Administrador puede acceder a la configuración del sistema."
        />
      }
    >
      <div className="space-y-6">
        <PageHeader
          title="Configuración del Sistema"
          description="Ajustes globales del sistema notarial"
        />

        <div className="max-w-2xl space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Información de la Notaría
              </CardTitle>
              <CardDescription>
                Datos institucionales que aparecen en documentos y reportes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nombre de la Notaría</Label>
                <Input placeholder="Notaría Primera del Cantón..." />
              </div>
              <div className="space-y-1.5">
                <Label>Número de Notaría</Label>
                <Input placeholder="001" />
              </div>
              <div className="space-y-1.5">
                <Label>Notario Titular</Label>
                <Input placeholder="Dr. Juan Pérez" />
              </div>
              <Button className="text-primary-foreground cursor-pointer">Guardar Información</Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                Configuración de Archivos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tamaño máximo de PDF (MB)</Label>
                <Input type="number" defaultValue={10} />
              </div>
              <Button className="text-primary-foreground cursor-pointer">Guardar Configuración</Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                Zona Peligrosa
              </CardTitle>
              <CardDescription>
                Acciones irreversibles que afectan al sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Separator className="border-destructive/20" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Limpiar registros de auditoría</p>
                  <p className="text-xs text-muted-foreground">Elimina logs de más de 90 días</p>
                </div>
                <Button variant="destructive" size="sm" className="text-primary-foreground cursor-pointer">
                  Limpiar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
