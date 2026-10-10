import OpenAI from "openai";
import { loadAllTranscripts } from "@/lib/transcript";
import { limitAnswerTimestamps, wantsDetails } from "@/lib/chatRules";

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
    library = all
      .map((v) => `=== Video ${v.id} ===\n${v.transcript}`)
      .join("\n\n");
  } catch {
    return Response.json(
      { error: "Transcript not found" },
      { status: 404 }
    );
  }

  // Kurz-Modus (Standard) oder ausführlich, je nach letzter Frage
  const question = messages.at(-1)?.content ?? "";
  const detailed = wantsDetails(question);

  const style = detailed
    ? `- Die Frage verlangt ausdrücklich eine ausführliche Antwort: Erkläre gründlich,
  Aufzählungen sind erlaubt, nenne die wichtigsten passenden Stellen zuerst.`
    : `- Antworte KNAPP: Bei gezielten Einzelfragen reichen normalerweise 2-3 kurze Sätze.
- Bei Zusammenfassungen beschreibe die wesentlichen Themen jeweils kurz in einem
  eigenen Absatz mit dem passenden Zeitverweis. Decke die Vorlesung ab, statt nur
  eine einzige Stelle zu nennen.
- Wenn es deutlich mehr zum Thema gibt, biete am Ende in einem kurzen Satz an,
  ausführlicher zu werden.`;

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
- Beziehe dich zuerst auf das aktuelle Video ${videoId}. Wenn ein anderes Video
  die Frage besser beantwortet, wähle stattdessen die passende Stelle dort.
- Mehrere Zeitverweise und Verweise auf andere Videos sind auch bei kurzen
  Antworten erlaubt, wenn sie unterschiedliche relevante Themen oder Aussagen
  belegen. Setze jeden Verweis direkt zum zugehörigen Inhalt.
- Wähle für dieselbe Aussage die eine aussagekräftigste Stelle, statt mehrere
  ähnliche Belege anzuhängen. Die Zahl der Verweise richtet sich nach den
  relevanten Inhalten, nicht nach der Antwortlänge.
- Belege deine Antwort mit passenden Stellen, IMMER exakt im Format
  [Video <Nummer>, h:mm:ss], z.B. [Video ${videoId}, 0:08:52].
  Verwende nur Videos und Zeitangaben, die in den Transkripten vorkommen.
- Fasse nahe beieinanderliegende Stellen im selben Video zu EINEM Zeitverweis
  zusammen: Wähle die aussagekräftigste Stelle. Zwischen zwei Zeitangaben im
  selben Video müssen mindestens 5 Minuten liegen. Das gilt auch bei ausführlichen
  Antworten; wiederhole einen Zeitverweis nicht für jede einzelne Aussage.
- Wenn etwas in keinem Transkript vorkommt, sag das ehrlich.
- Verwende KEIN LaTeX und kein Markdown. Schreib Formeln als einfachen Text,
  z.B. F(n) = F(n-1) + F(n-2) oder A^99.
- Antworte verständlich, in der Sprache der Frage.
${style}`,
      input: messages,
    });

    // Mehrere relevante Verweise behalten; nahe Stellen im selben Video bündeln.
    const answer = limitAnswerTimestamps(res.output_text, videoId);

    return Response.json({ answer });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Could not get a response. Please try again." },
      { status: 500 }
    );
  }
}
