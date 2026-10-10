// Datum im Schweizer Kurzformat: 10.10.2026
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ISO-String für <time dateTime>, undefined bei ungültigem Datum
export function toDateTime(date: string | Date | null | undefined): string | undefined {
  if (!date) return undefined;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

// Sekunden -> "1 h 30 min" bzw. "45 min"
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
