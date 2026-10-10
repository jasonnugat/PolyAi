import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

type Cue = { start: number; text: string };

// "01:02:03.456" oder "02:03.456" -> Sekunden
function toSeconds(time: string): number {
  const parts = time.trim().split(":").map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
}

// Sekunden -> "1:02:03" (immer Stunden:Minuten:Sekunden)
export function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// Liest die einzelnen Untertitel ("Cues") aus einer .vtt-Datei
function parseVtt(vtt: string): Cue[] {
  const cues: Cue[] = [];
  const blocks = vtt.replace(/\r/g, "").split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split("\n");
    const timeIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeIndex === -1) continue; // Kopfzeile, NOTE, STYLE usw.

    const start = toSeconds(lines[timeIndex].split("-->")[0]);
    const text = lines
      .slice(timeIndex + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "") // Tags wie <v Sprecher> oder <c> entfernen
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();

    if (text) cues.push({ start, text });
  }
  return cues;
}

// Fasst die kurzen Untertitel zu Abschnitten von ca. 30 Sekunden zusammen.
// Das spart Tokens und gibt dem Chatbot sinnvolle Sprungmarken.
export function vttToTranscript(vtt: string, blockSeconds = 30): string {
  const cues = parseVtt(vtt);
  const lines: string[] = [];
  let blockStart = -Infinity;
  let blockText: string[] = [];
  let lastText = "";

  const flush = () => {
    if (blockText.length) {
      lines.push(`[${formatTime(blockStart)}] ${blockText.join(" ")}`);
    }
  };

  for (const cue of cues) {
    if (cue.text === lastText) continue; // doppelte Zeilen überspringen
    lastText = cue.text;

    if (cue.start - blockStart >= blockSeconds) {
      flush();
      blockStart = cue.start;
      blockText = [];
    }
    blockText.push(cue.text);
  }
  flush();

  return lines.join("\n");
}

// Lädt public/videos/<id>.vtt und gibt das Transkript zurück
export async function loadTranscript(id: string): Promise<string> {
  if (!/^[\w-]+$/.test(id)) throw new Error("Ungültige Video-ID");

  const file = path.join(process.cwd(), "public", "videos", `${id}.vtt`);
  const vtt = await readFile(file, "utf-8");
  return vttToTranscript(vtt);
}

// Lädt die Transkripte ALLER Videos in public/videos/ (sortiert nach ID: 1, 2, 3, ..., 10)
export async function loadAllTranscripts(): Promise<
  { id: string; transcript: string }[]
> {
  const dir = path.join(process.cwd(), "public", "videos");
  const ids = (await readdir(dir))
    .filter((file) => file.endsWith(".vtt"))
    .map((file) => file.slice(0, -".vtt".length))
    .filter((id) => /^[\w-]+$/.test(id))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return Promise.all(
    ids.map(async (id) => ({ id, transcript: await loadTranscript(id) }))
  );
}
