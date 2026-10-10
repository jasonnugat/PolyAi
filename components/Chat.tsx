"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { limitAnswerTimestamps } from "@/lib/chatRules";

// error: true = Fehlermeldung, wird nicht an OpenAI mitgeschickt
type Message = { role: "user" | "assistant"; content: string; error?: boolean };

const STORAGE_KEY = "polyai-chat";

// Findet "[Video 2, 0:12:30]" und auch das alte Format "[0:12:30]"
const TIMESTAMP = /(\[(?:Video [\w-]+, )?\d+:\d{2}:\d{2}\])/g;
const TIMESTAMP_PARTS = /^\[(?:Video ([\w-]+), )?(\d+):(\d{2}):(\d{2})\]$/;

export default function Chat({ videoId }: { videoId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const seekTo = useCallback((seconds: number): boolean => {
    // Cached routes remain in the DOM, so only target this chat's own player.
    const video = listRef.current
      ?.closest(".video-page")
      ?.querySelector<HTMLVideoElement>("video.lecture-video");
    if (!video) return false;
    video.currentTime = seconds;
    video.play().catch(() => {});
    video.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return true;
  }, []);

  // Chat aus dem Browser-Tab laden (bleibt beim Video-Wechsel und Neuladen erhalten,
  // ist weg, sobald der Tab geschlossen wird – keine Datenbank nötig)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      // Restore browser-only session data after the server-rendered first paint.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      if (seekTo(t)) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, [videoId, seekTo]);

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
            type="button"
            onClick={() => seekTo(seconds)}
            className="timestamp"
            aria-label={`Jump to ${time} in the video`}
          >
            <Icon name="play" size={12} /> {time}
          </button>
        );
      }

      // Verweis auf ein anderes Video: dorthin wechseln und an die Stelle springen
      return (
        <button
          key={i}
          type="button"
          onClick={() => router.push(`/video/${targetVideo}?t=${seconds}`)}
          className="timestamp timestamp--external"
          aria-label={`Open video ${targetVideo} at ${time}`}
        >
          <Icon name="arrow-up-right" size={12} /> Video {targetVideo} · {time}
        </button>
      );
    });
  }

  // Bei neuen Nachrichten die Chat-Liste nach unten scrollen (nur die Liste, nicht die Seite)
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
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
        const error = `Error ${res.status}: ${
          data?.error ?? "Request failed."
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
          content: "Unable to reach the server. Please try again.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="panel chat-panel" aria-labelledby="chat-title">
      {/* Kopfzeile */}
      <div className="chat-header">
        <div className="panel-heading chat-heading">
          <span className="icon-tile"><Icon name="sparkle" /></span>
          <div>
            <h2 id="chat-title" className="panel-title">Lecture assistant</h2>
            <p className="muted chat-subtitle">Questions about your lecture</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={newChat}
            disabled={loading}
            className="icon-button"
            title="Clear chat"
            aria-label="Clear chat"
          >
            <Icon name="trash" size={18} />
          </button>
        )}
      </div>

      {/* Nachrichten (scrollbar, wenn es viele werden) */}
      <div
        ref={listRef}
        className="chat-messages"
        role="log"
        aria-label="Chat history"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 && (
          <div className="chat-empty">
            <span className="chat-empty-icon"><Icon name="sparkle" size={28} /></span>
            <h3>Ask about your lecture.</h3>
            <p>Explore concepts, examples, or key moments.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "chat-message chat-message--user"
                : m.error
                ? "chat-message chat-message--error"
                : "chat-message chat-message--assistant"
            }
          >
            {m.role === "assistant" && !m.error
              ? withTimestamps(
                  limitAnswerTimestamps(
                    m.content,
                    videoId,
                  ),
                )
              : m.content}
          </div>
        ))}

        {loading && (
          <div className="chat-message chat-message--assistant chat-loading" role="status">
            Thinking …
          </div>
        )}
      </div>

      {/* Eingabe */}
      <form onSubmit={sendMessage} className="composer chat-composer">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question …"
          aria-label="Question about the lecture"
          disabled={loading}
          className="composer-input"
        />
        <button
          type="submit"
          className="send-button"
          disabled={loading || !input.trim()}
          aria-label="Send question"
          title="Send question"
        >
          <Icon name="send" size={18} />
        </button>
      </form>
    </aside>
  );
}
