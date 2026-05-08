export { tokenUtils } from "./token";

export function formatDate(date: string | Date, locale = "es-EC") {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date, locale = "es-EC") {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
}

export function truncate(str: string, maxLength: number) {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}
