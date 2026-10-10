const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// Ordered from largest to smallest unit (seconds per unit)
const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

// "2026-10-10T16:22:00+00:00" -> "just now", "5 minutes ago", "yesterday", "3 weeks ago" ...
export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  // Missing or invalid timestamp: show nothing (new Date(null) would be 1970 -> "56 years ago")
  if (!iso) return "";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";

  // max(0, ...) so slightly-future timestamps (clock skew) show "just now"
  const seconds = Math.max(0, Math.floor((now - time) / 1000));

  if (seconds < 60) return "just now";

  for (const [unit, unitSeconds] of units) {
    if (seconds >= unitSeconds) {
      return rtf.format(-Math.floor(seconds / unitSeconds), unit);
    }
  }
  return "just now";
}

// Full date for the tooltip, e.g. "10 Oct 2026, 18:22" (fixed time zone: same on server and client)
export function formatAbsolute(iso: string | null | undefined): string {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Zurich",
  }).format(new Date(iso));
}
