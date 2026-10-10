const lectureDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Zurich",
});

export function formatDate(date: string | Date | null | undefined): string {
  if (date == null) return "";

  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "";

  return lectureDateFormat.format(value);
}
