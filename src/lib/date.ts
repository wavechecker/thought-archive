// src/lib/date.ts
export function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(+v) ? null : v;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(+d) ? null : d;
  }
  return null;
}

export function isValidDate(v: unknown): boolean {
  return toDate(v) !== null;
}

export function fmt(v: unknown, locale = "en-GB"): string {
  const d = toDate(v);
  if (!d) return ""; // <- prevent "Invalid time value"
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}
