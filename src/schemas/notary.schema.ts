import { z } from "zod";

const FORBIDDEN_CHARS = /[<>"\\&;(){}\[\]/=%+#$@!*^|`]/g; // ' allowed — valid in names
const INJECTION_PATTERNS = [/<script/i, /javascript:/i, /onerror=/i, /onload=/i, /alert\(/i, /eval\(/i];

// notaryName: letters, digits, spaces, . , - '
const NOTARY_NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,'\-]+$/;
// notaryOfficerName: letters, spaces, - '
const OFFICER_NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'\-]+$/;

export function sanitizeText(value: string): string {
  if (!value) return "";
  if (INJECTION_PATTERNS.some((p) => p.test(value))) {
    throw new Error("Contenido potencialmente peligroso detectado");
  }
  return value.replace(FORBIDDEN_CHARS, "").replace(/\s+/g, " ").trim();
}

function makeNameField(regex: RegExp, regexMsg: string) {
  return z
    .string({ error: "Este campo es requerido" })
    .min(3, "Mínimo 3 caracteres")
    .max(100, "Máximo 100 caracteres")
    .refine(
      (val) => !INJECTION_PATTERNS.some((p) => p.test(val)),
      "Contenido no permitido"
    )
    .transform((val, ctx) => {
      try {
        return sanitizeText(val);
      } catch (e) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: (e as Error).message,
        });
        return z.NEVER;
      }
    })
    .refine((val) => regex.test(val), { message: regexMsg });
}

export const notarySchema = z.object({
  notaryName: makeNameField(
    NOTARY_NAME_REGEX,
    "Solo se permiten letras, números, espacios y los signos . , - '"
  ),
  notaryNumber: z
    .number({ error: "Debe ser un número válido" })
    .int("Debe ser un número entero")
    .min(1, "Mínimo 1")
    .max(999, "Máximo 3 dígitos"),
  notaryOfficerName: makeNameField(
    OFFICER_NAME_REGEX,
    "Solo se permiten letras, tildes, espacios, guión y apóstrofo"
  ),
});

export type NotaryFormData = z.infer<typeof notarySchema>;
