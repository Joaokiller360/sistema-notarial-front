"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { UafeForm } from "@/components/forms/UafeForm";
import { useAuthStore } from "@/store";
import { saveUafe, type UafeFormData } from "@/lib/uafe-forms";
import { getTemplate } from "@/lib/form-templates";

export default function NuevoFormularioPage() {
  const router = useRouter();
  const params = useParams<{ templateId: string }>();
  const template = params?.templateId ? getTemplate(params.templateId) : undefined;

  const user = useAuthStore((s) => s.user);
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "Usuario";
  // El nombre del matrizador va en MAYÚSCULAS como el resto de campos del formulario.
  const matrizadorNombre = fullName.toLocaleUpperCase("es");

  useEffect(() => {
    if (!template) router.replace("/forms/plantillas");
  }, [template, router]);

  const initial = useMemo<UafeFormData | null>(() => {
    if (!template) return null;
    const base = template.build();
    base.matrizadorNombre = matrizadorNombre;
    return base;
  }, [template, matrizadorNombre]);

  if (!template || !initial) return null;

  const handleSave = (data: UafeFormData) => {
    const sub = saveUafe({
      data,
      filledByName: fullName,
      filledByEmail: user?.email ?? "",
      filledByRole: user?.roles?.[0] ?? "",
      templateId: template.id,
      templateName: template.name,
    });
    toast.success("Formulario guardado");
    router.push(`/forms/uafe/${sub.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Nuevo formulario — ${template.name}`}
        description={`Plantilla: ${template.name} · llenado por ${fullName}`}
      >
        <Button
          variant="outline"
          className="cursor-pointer"
          onClick={() => router.push("/forms/plantillas")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cambiar plantilla
        </Button>
      </PageHeader>

      <UafeForm
        initial={initial}
        headerNote={`Plantilla: ${template.name} — llenado por: ${fullName}`}
        onSave={handleSave}
      />
    </div>
  );
}
