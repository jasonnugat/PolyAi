import OpenAI from "openai";
import { loadAllTranscripts } from "@/lib/transcript";

type Message = { role: "user" | "assistant"; content: string };

// POST /api/chat
// Body: { "videoId": "1", "messages": [{ "role": "user", "content": "..." }] }
export async function POST(req: Request) {
  const { videoId, messages } = (await req.json()) as {
    videoId: string;
    messages: Message[];
  };

  // Alle Transkripte laden, jedes mit "=== Video X ===" gekennzeichnet
  let library: string;
  try {
    const all = await loadAllTranscripts();
    if (!all.some((v) => v.id === videoId)) throw new Error();
    library = all.map((v) => `=== Video ${v.id} ===\n${v.transcript}`).join("\n\n");
  } catch {
    return Response.json({ error: "Transkript nicht gefunden" }, { status: 404 });
  }

  try {
    // Erst hier erstellen, damit "npm run build" auch ohne Key funktioniert
    const client = new OpenAI(); // liest OPENAI_API_KEY aus .env.local
    const res = await client.responses.create({
      model: "gpt-6-luna",
      // Die Transkripte stehen zuerst und sind für jedes Video gleich
      // -> OpenAI cached diesen Teil automatisch über alle Videos hinweg.
      // Erst danach kommt, welches Video gerade läuft.
      instructions: `Transkripte aller Vorlesungen (Format: [h:mm:ss] Text):

${library}

---
Du bist ein Lernassistent für diese Vorlesungsreihe.
Der/die Studierende schaut gerade Video ${videoId}.

- Beantworte Fragen nur auf Grundlage der Transkripte oben.
- Beziehe dich zuerst auf das aktuelle Video ${videoId}. Wenn ein Thema in einem
  anderen Video (auch oder ausführlicher) behandelt wird, verweise zusätzlich darauf.
- Gib zu jeder Aussage die passende Stelle an, IMMER exakt im Format
  [Video <Nummer>, h:mm:ss], z.B. [Video ${videoId}, 0:08:52].
  Verwende nur Videos und Zeitangaben, die in den Transkripten vorkommen.
- Wenn etwas in keinem Transkript vorkommt, sag das ehrlich.
- Verwende KEIN LaTeX und kein Markdown. Schreib Formeln als einfachen Text,
  z.B. F(n) = F(n-1) + F(n-2) oder A^99.
- Antworte kurz und verständlich, in der Sprache der Frage.`,
      input: messages,
    });

    return Response.json({ answer: res.output_text });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Fehler bei der Anfrage an OpenAI" }, { status: 500 });
  }
}
