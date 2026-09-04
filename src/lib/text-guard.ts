/**
 * Guardas de entrada de texto reutilizables.
 *
 * Regla del proyecto: NUNCA se debe poder ingresar `< > { } [ ] @` (ni
 * `" ' ; & # / \``) en campos de texto. El `@` solo se permite en campos de
 * correo electrónico.
 *
 * Se aplica en varias capas (onKeyDown para UX, onChange/onPaste para limpiar
 * autocompletado / pegado / IME, y validación final antes de enviar).
 */

// Caracteres bloqueados en texto general.
const GENERAL_BLOCKED = "<>{}[]@\"';&#/\\";
// En correos se permite `@` (y `.`), pero no espacios ni el resto.
const EMAIL_BLOCKED = "<>{}[]\"';&#/\\";

const GENERAL_RE = /[<>{}[\]@"';&#/\\]/;
const EMAIL_RE = /[<>{}[\]"';&#/\\\s]/;
// Caracteres invisibles / de control: control ASCII (0x00-0x1F, 0x7F),
// zero-width space/joiners (200B-200D), word joiner (2060) y BOM (FEFF).
const INVISIBLE_RE = /[\u0000-\u001F\u007F\u200B-\u200D\u2060\uFEFF]/g;

export interface CleanTextOpts {
  email?: boolean;
  max?: number;
  /** Colapsa espacios múltiples y recorta extremos. Por defecto true en texto no-email. */
  collapseSpaces?: boolean;
}

/** Limpia un valor de texto quitando caracteres bloqueados e invisibles. */
export function cleanText(value: string, opts: CleanTextOpts = {}): string {
  let s = (value ?? "").replace(INVISIBLE_RE, "");
  s = s.replace(new RegExp(opts.email ? EMAIL_RE.source : GENERAL_RE.source, "g"), "");
  const collapse = opts.collapseSpaces ?? !opts.email;
  if (opts.email) s = s.replace(/\s+/g, "");
  else if (collapse) s = s.replace(/\s{2,}/g, " ");
  if (typeof opts.max === "number") s = s.slice(0, opts.max);
  return s;
}

/** ¿La tecla pulsada es un carácter bloqueado? (para onKeyDown). */
export function isBlockedKey(key: string, email = false): boolean {
  if (key.length !== 1) return false;
  const set = email ? EMAIL_BLOCKED : GENERAL_BLOCKED;
  if (set.includes(key)) return true;
  if (email && key === " ") return true;
  return false;
}

/** ¿El string contiene algún carácter bloqueado? (validación final). */
export function hasBlockedChars(value: string, email = false): boolean {
  return (email ? EMAIL_RE : GENERAL_RE).test(value ?? "");
}

/** Solo dígitos, recortado a `max`. */
export function digitsOnly(value: string, max?: number): string {
  const s = (value ?? "").replace(/\D/g, "");
  return typeof max === "number" ? s.slice(0, max) : s;
}

/** Teléfono: dígitos, `+`, espacios y guiones. */
export function cleanPhone(value: string, max = 15): string {
  return (value ?? "").replace(/[^\d+\s-]/g, "").slice(0, max);
}

/** Monto: dígitos y un único punto decimal (sin negativos). */
export function cleanMoney(value: string): string {
  let s = (value ?? "").replace(/[^\d.]/g, "");
  const i = s.indexOf(".");
  if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "");
  return s;
}

const EMAIL_FORMAT = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export function isValidEmail(value: string): boolean {
  return EMAIL_FORMAT.test((value ?? "").trim());
}

/** Cédula (10) o RUC (13) — solo longitud + dígitos (sin dígito verificador). */
export function isValidCedulaOrRuc(value: string): boolean {
  const s = (value ?? "").replace(/\D/g, "");
  return s.length === 10 || s.length === 13;
}

/** Teléfono Ecuador: 7 a 13 dígitos (fijo/celular, con o sin 0 / +593). */
export function isValidPhone(value: string): boolean {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 13;
}
