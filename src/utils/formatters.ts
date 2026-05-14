/**
 * Normalises a role value that may arrive as a plain string ("NOTARIO")
 * or as a role object ({ type: "NOTARIO", name: "Notario", id: "..." }).
 * Always returns the UPPER_SNAKE_CASE type key used in ROLE_LABELS / ROLE_COLORS.
 */
export function extractRoleKey(role: unknown): string {
  if (typeof role === "string") return role;
  if (role && typeof role === "object") {
    const r = role as { type?: string; name?: string };
    return r.type ?? r.name ?? "";
  }
  return "";
}

export function toTitleCase(value: string): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
