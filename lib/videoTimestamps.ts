export type TimestampPart =
  | { type: "text"; text: string }
  | { type: "timestamp"; videoId: string; time: string; seconds: number };

const TIMESTAMP = /\[(?:Video ([\w-]+), )?(\d+):([0-5]\d):([0-5]\d)\]/g;

export function splitVideoTimestamps(text: string, currentVideo: string): TimestampPart[] {
  const parts: TimestampPart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(TIMESTAMP)) {
    const [, targetVideo, hours, minutes, seconds] = match;
    const totalSeconds = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
    if (!Number.isSafeInteger(totalSeconds)) continue;
    if (match.index > cursor) parts.push({ type: "text", text: text.slice(cursor, match.index) });
    parts.push({
      type: "timestamp",
      videoId: targetVideo ?? currentVideo,
      time: `${hours}:${minutes}:${seconds}`,
      seconds: totalSeconds,
    });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push({ type: "text", text: text.slice(cursor) });
  return parts;
}
