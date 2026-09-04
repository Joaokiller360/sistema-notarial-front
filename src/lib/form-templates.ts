// Plantillas de formularios notariales. Al crear un nuevo formulario el usuario
// elige una plantilla; cada plantilla arma un `UafeFormData` inicial.
// Hoy todas comparten el mismo componente (UafeForm); las plantillas se
// diferencian por valores por defecto y metadatos.

import { emptyUafeData, type UafeFormData } from "@/lib/uafe-forms";

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  /** Marca la plantilla base recomendada. */
  principal?: boolean;
  build: () => UafeFormData;
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "uafe-principal",
    name: "UAFE — Conozca a su cliente",
    description:
      "Política de la debida diligencia (UAFE) — formulario completo de la Notaría Pública Primera del Cantón Esmeraldas. Incluye datos del trámite, compareciente, representante, bien, origen de fondos, declaración PEP y licitud de fondos.",
    principal: true,
    build: () => emptyUafeData(),
  },
];

export function getTemplate(id: string): FormTemplate | undefined {
  return FORM_TEMPLATES.find((t) => t.id === id);
}

export function principalTemplate(): FormTemplate {
  return FORM_TEMPLATES.find((t) => t.principal) ?? FORM_TEMPLATES[0];
}
