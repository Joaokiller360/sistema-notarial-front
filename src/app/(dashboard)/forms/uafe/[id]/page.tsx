"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { UafeForm } from "@/components/forms/UafeForm";
import { getUafe, saveUafe, type UafeFormData, type UafeSubmission } from "@/lib/uafe-forms";

export default function UafeFormDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [sub, setSub] = useState<UafeSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Lectura async para no hacer setState síncrono dentro del efecto.
    Promise.resolve().then(() => {
      if (cancelled || !id) return;
      setSub(getUafe(id) ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando formulario...</p>;
  }

  if (!sub) {
    return (
      <div className="space-y-4">
        <PageHeader title="Formulario no encontrado" />
        <p className="text-sm text-muted-foreground">
          Este formulario no existe o fue creado en otro navegador.
        </p>
        <Button variant="outline" className="cursor-pointer" onClick={() => router.push("/forms")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a formularios
        </Button>
      </div>
    );
  }

  const handleSave = (data: UafeFormData) => {
    const updated = saveUafe({
      id: sub.id,
      data,
      filledByName: sub.filledByName,
      filledByEmail: sub.filledByEmail,
      filledByRole: sub.filledByRole,
      templateId: sub.templateId,
      templateName: sub.templateName,
    });
    setSub(updated);
    setEditing(false);
    toast.success("Formulario UAFE actualizado");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Formulario UAFE"
        description={`${sub.templateName || "UAFE"} · llenado por ${sub.filledByName} · ${format(
          new Date(sub.createdAt),
          "dd MMM yyyy HH:mm",
          { locale: es }
        )}`}
      >
        <Button variant="outline" className="cursor-pointer" onClick={() => router.push("/forms")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <Button
          variant={editing ? "secondary" : "outline"}
          className="cursor-pointer"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? <X className="w-4 h-4 mr-2" /> : <Pencil className="w-4 h-4 mr-2" />}
          {editing ? "Cancelar edición" : "Editar"}
        </Button>
      </PageHeader>

      <UafeForm
        key={editing ? "edit" : "view"}
        initial={sub.data}
        readOnly={!editing}
        headerNote={`Formulario llenado por: ${sub.filledByName}`}
        onSave={handleSave}
      />
    </div>
  );
}
