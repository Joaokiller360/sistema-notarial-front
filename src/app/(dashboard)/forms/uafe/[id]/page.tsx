"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { UafeForm } from "@/components/forms/UafeForm";
import { useAuthStore } from "@/store";
import { type UafeFormData } from "@/lib/uafe-forms";
import { uafeFormsService, type UafeForm as UafeFormRecord, type UafeComprobante } from "@/services";

function UafeFormDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id;

  const user = useAuthStore((s) => s.user);
  const currentUserName = (
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "Usuario"
  ).toLocaleUpperCase("es");

  const [sub, setSub] = useState<UafeFormRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [editing, setEditing] = useState(searchParams?.get("edit") === "1");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    // Lectura async para no hacer setState síncrono dentro del efecto.
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setNotFound(false);
      setForbidden(false);
      uafeFormsService
        .getById(id)
        .then((data) => {
          if (cancelled) return;
          setSub(data);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 403) setForbidden(true);
          else setNotFound(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando formulario...</p>;
  }

  if (forbidden) {
    return (
      <div className="space-y-4">
        <PageHeader title="Sin acceso" />
        <p className="text-sm text-muted-foreground">
          No tienes permiso para ver este formulario.
        </p>
        <Button variant="outline" className="cursor-pointer" onClick={() => router.push("/forms")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a formularios
        </Button>
      </div>
    );
  }

  if (notFound || !sub) {
    return (
      <div className="space-y-4">
        <PageHeader title="Formulario no encontrado" />
        <p className="text-sm text-muted-foreground">Este formulario no existe.</p>
        <Button variant="outline" className="cursor-pointer" onClick={() => router.push("/forms")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a formularios
        </Button>
      </div>
    );
  }

  const handleSave = async (data: UafeFormData) => {
    setSubmitting(true);
    try {
      const updated = await uafeFormsService.update(sub.id, data);
      setSub(updated);
      setEditing(false);
      toast.success("Formulario UAFE actualizado");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "No se pudo actualizar el formulario");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComprobantesChange = (list: UafeComprobante[]) => {
    setSub((prev) => (prev ? { ...prev, comprobantes: list } : prev));
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
        initial={{
          ...sub.data,
          matrizadorNombre: sub.data.matrizadorNombre?.trim() || currentUserName,
        }}
        readOnly={!editing}
        submitting={submitting}
        headerNote={`Formulario llenado por: ${sub.filledByName}`}
        onSave={handleSave}
        uafeFormId={sub.id}
        comprobantes={sub.comprobantes}
        onComprobantesChange={handleComprobantesChange}
      />
    </div>
  );
}

export default function UafeFormDetailPage() {
  return (
    <Suspense>
      <UafeFormDetail />
    </Suspense>
  );
}
