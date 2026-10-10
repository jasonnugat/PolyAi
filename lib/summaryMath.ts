type Delimiter = { open: string; close: string; display: boolean };
export type SummaryPart =
  | { type: "text"; text: string }
  | { type: "math"; tex: string; raw: string; display: boolean };

const DELIMITERS: Delimiter[] = [
  { open: "$$", close: "$$", display: true },
  { open: "\\[", close: "\\]", display: true },
  { open: "\\(", close: "\\)", display: false },
  { open: "$", close: "$", display: false },
];

function isEscaped(text: string, index: number): boolean {
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === "\\"; i--) backslashes++;
  return backslashes % 2 === 1;
}

function findEnd(text: string, start: number, delimiter: Delimiter): number {
  let braces = 0;
  for (let i = start; i < text.length; i++) {
    // A single-dollar formula cannot consume a following paragraph or price.
    if (delimiter.open === "$" && (text[i] === "\n" || text[i] === "\r")) return -1;
    if (isEscaped(text, i)) continue;
    if (braces === 0 && text.startsWith(delimiter.close, i)) {
      if (delimiter.open === "$" && (
        text[i - 1] === "$" || text[i + 1] === "$" ||
        /\s/.test(text[i - 1] ?? "") || /\d/.test(text[i + 1] ?? "")
      )) return -1;
      return i;
    }
    if (text[i] === "{") braces++;
    if (text[i] === "}") braces = Math.max(0, braces - 1);
  }
  return -1;
}

// Keep prose untouched and retain original delimiters for invalid expressions.
export function splitSummaryMath(text: string): SummaryPart[] {
  const parts: SummaryPart[] = [];
  let plainStart = 0;
  let index = 0;

  while (index < text.length) {
    const delimiter = isEscaped(text, index)
      ? undefined
      : DELIMITERS.find(({ open }) => text.startsWith(open, index));
    if (!delimiter) {
      index++;
      continue;
    }
    const start = index + delimiter.open.length;
    if (delimiter.open === "$" && /\s/.test(text[start] ?? "")) {
      index++;
      continue;
    }
    const end = findEnd(text, start, delimiter);
    if (end === -1) {
      index = start;
      continue;
    }
    if (index > plainStart) parts.push({ type: "text", text: text.slice(plainStart, index) });
    const next = end + delimiter.close.length;
    parts.push({
      type: "math",
      tex: text.slice(start, end),
      raw: text.slice(index, next),
      display: delimiter.display,
    });
    index = next;
    plainStart = next;
  }
  if (plainStart < text.length) parts.push({ type: "text", text: text.slice(plainStart) });
  return parts;
}
