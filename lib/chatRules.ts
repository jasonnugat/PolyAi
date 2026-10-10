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

// Verweise ohne neue Erklärung dazwischen bilden eine Gruppe: ein Beleg pro Video.
// Zusätzlich müssen Stellen im selben Video mindestens `minGapSeconds` auseinander liegen.
// Erkennt "[Video 2, 0:12:30]" und "[0:12:30]" (= aktuelles Video).
const TIMESTAMP = /[ \t]?\[(?:Video ([\w-]+), )?(\d+):(\d{2}):(\d{2})\]/g;
const CITATION_SEPARATOR = /^[\s,;:.!?()[\]/·•&–—-]*(?:(?:and|or|und|oder)[\s,;:.!?()[\]/·•&–—-]*)?$/i;

export function limitTimestamps(
  text: string,
  currentVideo: string,
  max = Infinity,
  minGapSeconds = 5 * 60,
): string {
  const kept: { video: string; seconds: number }[] = [];
  const groupVideos = new Set<string>();
  let cursor = 0;
  let result = "";
  let hasPreviousTimestamp = false;

  for (const match of text.matchAll(TIMESTAMP)) {
    const [full, video, h, m, s] = match;
    const between = text.slice(cursor, match.index);
    const sameGroup = hasPreviousTimestamp && CITATION_SEPARATOR.test(between);
    if (!sameGroup) groupVideos.clear();
    const v: string = video ?? currentVideo;
    const seconds = Number(h) * 3600 + Number(m) * 60 + Number(s);

    const tooMany = kept.length >= max;
    const duplicateContext = groupVideos.has(v);
    const tooClose = kept.some(
      (k) => k.video === v && Math.abs(k.seconds - seconds) < minGapSeconds,
    );
    let nextCursor = match.index + full.length;
    if (!tooMany && !duplicateContext && !tooClose) {
      kept.push({ video: v, seconds });
      groupVideos.add(v);
      result += between + full;
    } else if (!sameGroup) {
      // Preserve explanations; discard only citation-only separators with removed links.
      result += between;
    } else {
      // Remove a duplicate's own parentheses, but preserve sentence punctuation
      // and closing brackets that belong to the preceding, retained reference.
      const wrappers = between.match(/(?:[([]\s*)+$/)?.[0] ?? "";
      const openings = [...wrappers].filter((character) => character === "(" || character === "[");
      let closingCursor = nextCursor;
      let balanced = true;
      for (const opening of openings.reverse()) {
        while (/\s/.test(text[closingCursor] ?? "")) closingCursor++;
        if (text[closingCursor] !== (opening === "(" ? ")" : "]")) {
          balanced = false;
          break;
        }
        closingCursor++;
      }
      const punctuation = balanced ? between.slice(0, between.length - wrappers.length) : between;
      result += punctuation.replace(/[^.!?()[\]]/g, "");
      if (balanced) nextCursor = closingCursor;
      if (/[.!?]/.test(text[nextCursor] ?? "") && result.endsWith(text[nextCursor])) nextCursor++;
    }
    // Use original positions, including removed references, to handle longer groups.
    cursor = nextCursor;
    hasPreviousTimestamp = true;
  }
  return result + text.slice(cursor);
}
