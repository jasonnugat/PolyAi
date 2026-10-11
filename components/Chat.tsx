"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { limitAnswerTimestamps } from "@/lib/chatRules";
import TimestampText from "@/components/TimestampText";

// error: true = Fehlermeldung, wird nicht an OpenAI mitgeschickt
type Message = { role: "user" | "assistant"; content: string; error?: boolean };

const STORAGE_KEY = "polyai-chat";

export default function Chat({ videoId }: { videoId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

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
              ? <TimestampText text={limitAnswerTimestamps(m.content, videoId)} videoId={videoId} />
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
