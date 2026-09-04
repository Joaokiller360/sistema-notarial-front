"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { UafeForm } from "@/components/forms/UafeForm";
import { useAuthStore } from "@/store";
import { type UafeFormData } from "@/lib/uafe-forms";
import { uafeFormsService } from "@/services";
import { getTemplate } from "@/lib/form-templates";

export default function NuevoFormularioPage() {
  const router = useRouter();
  const params = useParams<{ templateId: string }>();
  const template = params?.templateId ? getTemplate(params.templateId) : undefined;
  const [submitting, setSubmitting] = useState(false);

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

  const handleSave = async (data: UafeFormData) => {
    setSubmitting(true);
    try {
      // filledByName/Email/Role los completa el backend a partir del token.
      const created = await uafeFormsService.create({
        templateId: template.id,
        templateName: template.name,
        data,
      });
      toast.success("Formulario guardado");
      // ?edit=1 abre el detalle ya en modo edición para poder adjuntar comprobantes.
      router.push(`/forms/uafe/${created.id}?edit=1`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "No se pudo guardar el formulario");
    } finally {
      setSubmitting(false);
    }
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
        submitting={submitting}
        headerNote={`Plantilla: ${template.name} — llenado por: ${fullName}`}
        onSave={handleSave}
      />
    </div>
  );
}
