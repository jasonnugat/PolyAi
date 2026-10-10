"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Message = { role: "user" | "assistant"; content: string };

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

export default function Chat({ videoId }: { videoId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
          <button
            key={i}
            onClick={() => seekTo(seconds)}
            className="mx-0.5 rounded bg-blue-50 px-1.5 font-mono text-sm text-blue-700 hover:bg-blue-100"
          >
            ▶ {time}
          </button>
        );
      }

      // Verweis auf ein anderes Video: dorthin wechseln und an die Stelle springen
      return (
        <button
          key={i}
          onClick={() => router.push(`/video/${targetVideo}?t=${seconds}`)}
          className="mx-0.5 rounded bg-purple-50 px-1.5 font-mono text-sm text-purple-700 hover:bg-purple-100"
        >
          ↗ Video {targetVideo} · {time}
        </button>
      );
    });
  }

  // Bei neuen Nachrichten automatisch nach unten scrollen
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
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
        body: JSON.stringify({ videoId, messages: newMessages }),
      });
      const data = await res.json().catch(() => null); // null, falls keine JSON-Antwort
      const answer = res.ok
        ? data.answer
        : `Fehler ${res.status}: ${data?.error ?? "Route nicht gefunden"}`;
      setMessages([...newMessages, { role: "assistant", content: answer }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Fehler: Server nicht erreichbar." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="flex h-[32rem] flex-col rounded-lg border border-gray-300 p-4 lg:h-[calc(100vh-7rem)]">
      {/* Nachrichten (scrollbar, wenn es viele werden) */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="m-auto text-center text-sm text-gray-400">
            Stell eine Frage zur Vorlesung.
          </p>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "max-w-[80%] self-end rounded-2xl bg-gray-200 px-4 py-2"
                : "max-w-[80%] self-start whitespace-pre-wrap rounded-2xl border border-gray-300 px-4 py-2"
            }
          >
            {m.role === "assistant" ? withTimestamps(m.content) : m.content}
          </div>
        ))}

        {loading && (
          <div className="self-start rounded-2xl border border-gray-300 px-4 py-2 text-gray-400">
            …
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Eingabe */}
      <form onSubmit={sendMessage} className="mt-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Frage stellen …"
          disabled={loading}
          className="w-full rounded-full border border-gray-300 px-4 py-2 outline-none focus:border-gray-500 disabled:bg-gray-50"
        />
      </form>
    </aside>
  );
}
