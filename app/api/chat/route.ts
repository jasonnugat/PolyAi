import OpenAI from "openai";
import { loadTranscript } from "@/lib/transcript";

type Message = { role: "user" | "assistant"; content: string };

// POST /api/chat
// Body: { "videoId": "1", "messages": [{ "role": "user", "content": "..." }] }
export async function POST(req: Request) {
  const { videoId, messages } = (await req.json()) as {
    videoId: string;
    messages: Message[];
  };

  let transcript: string;
  try {
    transcript = await loadTranscript(videoId);
  } catch {
    return Response.json({ error: "Transkript nicht gefunden" }, { status: 404 });
  }

  try {
    // Erst hier erstellen, damit "npm run build" auch ohne Key funktioniert
    const client = new OpenAI(); // liest OPENAI_API_KEY aus .env.local
    const res = await client.responses.create({
      model: "gpt-6-luna",
      // Transkript zuerst: bleibt bei jeder Frage gleich -> OpenAI cached es automatisch
      instructions: `Transkript der Vorlesung (Format: [h:mm:ss] Text):

${transcript}

---
Du bist ein Lernassistent für diese Vorlesung.
- Beantworte Fragen nur auf Grundlage des Transkripts oben.
- Gib zu jeder Aussage die passende Stelle an, exakt im Format [h:mm:ss], z.B. [0:08:52].
  Verwende nur Zeitangaben, die im Transkript vorkommen.
- Wenn etwas nicht im Transkript vorkommt, sag das ehrlich.
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
