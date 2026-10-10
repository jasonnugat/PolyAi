"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

// Springt im Video (id="lecture-video") an die Stelle und spielt ab
function seekTo(seconds: number) {
  const video = document.getElementById("lecture-video") as HTMLVideoElement | null;
  if (!video) return;
  video.currentTime = seconds;
  video.play().catch(() => {});
  video.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Macht aus jedem [h:mm:ss] im Text einen klickbaren Button
function withTimestamps(text: string) {
  return text.split(/(\[\d+:\d{2}:\d{2}\])/g).map((part, i) => {
    const match = part.match(/^\[(\d+):(\d{2}):(\d{2})\]$/);
    if (!match) return part;

    const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    return (
      <button
        key={i}
        onClick={() => seekTo(seconds)}
        className="mx-0.5 rounded bg-blue-50 px-1.5 font-mono text-sm text-blue-700 hover:bg-blue-100"
      >
        ▶ {part.slice(1, -1)}
      </button>
    );
  });
}

export default function Chat({ videoId }: { videoId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Bei neuen Nachrichten automatisch nach unten scrollen
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: question }];
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
