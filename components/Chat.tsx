"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SendButton from "@/components/SendButton";

// error: true = Fehlermeldung, wird nicht an OpenAI mitgeschickt
type Message = { role: "user" | "assistant"; content: string; error?: boolean };

const STORAGE_KEY = "polyai-chat";

// Vorschläge für den leeren Chat
const SUGGESTIONS = [
  "Worum geht es in dieser Vorlesung?",
  "Was sind die wichtigsten Begriffe?",
  "Wo wird das erste Beispiel gerechnet?",
];

// Springt im Video (id="lecture-video") an die Stelle und spielt ab
function seekTo(seconds: number) {
  const video = document.getElementById(
    "lecture-video"
  ) as HTMLVideoElement | null;
  if (!video) return;
  video.currentTime = seconds;
  video.play().catch(() => {});
  video.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Findet "[Video 2, 0:12:30]" und auch das alte Format "[0:12:30]"
const TIMESTAMP = /(\[(?:Video [\w-]+, )?\d+:\d{2}:\d{2}\])/g;
const TIMESTAMP_PARTS = /^\[(?:Video ([\w-]+), )?(\d+):(\d{2}):(\d{2})\]$/;

const CHIP =
  "mx-0.5 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 align-baseline font-mono text-chip text-accent transition-colors duration-150 ease-out hover:bg-accent/15 focus-ring";

export default function Chat({ videoId }: { videoId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Chat aus dem Browser-Tab laden (bleibt beim Video-Wechsel und Neuladen erhalten,
  // ist weg, sobald der Tab geschlossen wird – keine Datenbank nötig)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {
      // z.B. privater Modus: dann startet der Chat einfach leer
    }
    setLoaded(true);
  }, []);

  // Bei jeder Änderung speichern (erst nach dem Laden, sonst würde [] drüberschreiben)
  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages, loaded]);

  function newChat() {
    setMessages([]);
  }

  // Kommt man über einen Verweis aus einem anderen Video (z.B. /video/2?t=752),
  // springt das Video an diese Stelle, sobald es auf der Seite ist.
  useEffect(() => {
    const t = Number(new URLSearchParams(window.location.search).get("t"));
    if (!t) return;

    const timer = setInterval(() => {
      if (!document.getElementById("lecture-video")) return; // Video noch nicht geladen
      clearInterval(timer);
      seekTo(t);
    }, 100);
    return () => clearInterval(timer);
  }, [videoId]);

  // Macht aus jeder Zeitangabe einen klickbaren Button
  function withTimestamps(text: string) {
    return text.split(TIMESTAMP).map((part, i) => {
      const match = part.match(TIMESTAMP_PARTS);
      if (!match) return part;

      const targetVideo = match[1] ?? videoId; // ohne "Video X" = aktuelles Video
      const seconds =
        Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4]);
      const time = `${match[2]}:${match[3]}:${match[4]}`;

      if (targetVideo === videoId) {
        return (
          <button key={i} onClick={() => seekTo(seconds)} className={CHIP}>
            <span aria-hidden="true">▶</span> {time}
          </button>
        );
      }

      // Verweis auf ein anderes Video: dorthin wechseln und an die Stelle springen
      return (
        <button
          key={i}
          onClick={() => router.push(`/video/${targetVideo}?t=${seconds}`)}
          className={CHIP}
        >
          <span aria-hidden="true">↗</span> Video {targetVideo} · {time}
        </button>
      );
    });
  }

  // Bei neuen Nachrichten die Chat-Liste nach unten scrollen (nur die Liste, nicht die Seite)
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(question: string) {
    if (!question || loading) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: question },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          // Fehlermeldungen nicht mitschicken, nur echte Fragen und Antworten
          messages: newMessages
            .filter((m) => !m.error)
            .map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json().catch(() => null); // null, falls keine JSON-Antwort
      if (res.ok) {
        setMessages([
          ...newMessages,
          { role: "assistant", content: data.answer },
        ]);
      } else {
        const error = `Fehler ${res.status}: ${
          data?.error ?? "Route nicht gefunden"
        }`;
        setMessages([
          ...newMessages,
          { role: "assistant", content: error, error: true },
        ]);
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Fehler: Server nicht erreichbar.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    send(input.trim());
  }

  return (
    <aside
      className="flex h-[32rem] flex-col overflow-hidden rounded-panel bg-raised ring-1 ring-hairline lg:sticky lg:top-20 lg:h-[calc(100vh-6.5rem)] lg:self-start"
      aria-labelledby="chat-heading"
    >
      {/* Kopfzeile */}
      <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
        <div>
          <h2 id="chat-heading" className="text-heading">
            Chat
          </h2>
          <p className="text-caption text-secondary">Antwortet mit Sprungmarken ins Video</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={newChat}
            disabled={loading}
            className="rounded-full px-3 py-1 text-small font-medium text-secondary transition-colors duration-150 ease-out hover:bg-background hover:text-foreground focus-ring disabled:opacity-50"
          >
            Neuer Chat
          </button>
        )}
      </div>

      {/* Nachrichten (scrollbar, wenn es viele werden) */}
      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-busy={loading}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4"
      >
        {messages.length === 0 && (
          <div className="m-auto flex w-full max-w-xs flex-col items-center gap-4 text-center">
            <p className="text-body text-secondary">Stell eine Frage zur Vorlesung.</p>
            <ul className="flex w-full flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => send(s)}
                    disabled={loading}
                    className="w-full rounded-full bg-background px-4 py-2 text-small text-foreground ring-1 ring-hairline transition-colors duration-150 ease-out hover:ring-secondary/60 focus-ring disabled:opacity-50"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "max-w-[85%] self-end whitespace-pre-wrap rounded-bubble rounded-br-md bg-foreground px-4 py-2.5 text-body text-background animate-rise"
                : m.error
                ? "max-w-[85%] self-start rounded-bubble rounded-bl-md bg-danger-soft px-4 py-2.5 text-body text-danger animate-rise"
                : "max-w-[92%] self-start whitespace-pre-wrap text-body animate-rise"
            }
          >
            {m.role === "assistant" ? withTimestamps(m.content) : m.content}
          </div>
        ))}

        {loading && (
          <div
            className="flex items-center gap-1 self-start px-1 py-2"
            aria-label="Wird geladen …"
          >
            {[0, 1, 2].map((n) => (
              <span
                key={n}
                className="h-1.5 w-1.5 rounded-full bg-secondary animate-dot"
                style={{ animationDelay: `${n * 0.15}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Eingabe */}
      <form onSubmit={sendMessage} className="border-t border-hairline p-3">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Frage stellen …"
            disabled={loading}
            aria-label="Frage stellen"
            className="w-full rounded-full bg-background py-2.5 pl-4 pr-12 text-body text-foreground ring-1 ring-hairline placeholder:text-secondary transition-shadow duration-150 ease-out focus:ring-secondary/60 focus:outline-none disabled:opacity-50"
          />
          <SendButton disabled={loading || !input.trim()} label="Frage senden" />
        </div>
      </form>
    </aside>
  );
}
