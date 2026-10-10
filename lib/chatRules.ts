// Regeln, damit der Chat nicht mit Infos überflutet

// Will die Frage ausdrücklich eine ausführliche Antwort?
// Liste bei Bedarf einfach erweitern.
const DETAIL_WORDS =
  /ausführlich|detailliert|im detail|genauer|vollständig|alle (stellen|themen|zeitangaben|timestamps)|mehr (dazu|infos|details)|bombardier|in detail|detailed/i;

export function wantsDetails(question: string): boolean {
  return DETAIL_WORDS.test(question);
}

// Gemeinsame Regel für neue Antworten und bereits gespeicherte Chat-Nachrichten.
// Auch kurze Antworten dürfen mehrere relevante Stellen belegen.
export function limitAnswerTimestamps(
  text: string,
  currentVideo: string,
): string {
  return limitTimestamps(text, currentVideo);
}

// Lässt höchstens `max` Zeitangaben stehen. Zwei Zeitangaben im selben Video
// müssen mindestens `minGapSeconds` auseinander liegen, sonst fliegt die spätere raus.
// Erkennt "[Video 2, 0:12:30]" und "[0:12:30]" (= aktuelles Video).
const TIMESTAMP = /[ \t]?\[(?:Video ([\w-]+), )?(\d+):(\d{2}):(\d{2})\]/g;

export function limitTimestamps(
  text: string,
  currentVideo: string,
  max = Infinity,
  minGapSeconds = 5 * 60,
): string {
  const kept: { video: string; seconds: number }[] = [];

  return text.replace(TIMESTAMP, (full, video, h, m, s) => {
    const v: string = video ?? currentVideo;
    const seconds = Number(h) * 3600 + Number(m) * 60 + Number(s);

    const tooMany = kept.length >= max;
    const tooClose = kept.some(
      (k) => k.video === v && Math.abs(k.seconds - seconds) < minGapSeconds,
    );
    if (tooMany || tooClose) return ""; // Zeitangabe entfernen

    kept.push({ video: v, seconds });
    return full;
  });
}
