"use client";

import { useEffect, useState } from "react";
import type { Comment } from "@/lib/db/actions/getcomments";
import { addComment } from "@/lib/db/actions/putcomment";
import { formatAbsolute, timeAgo } from "@/lib/timeAgo";
import SendButton from "@/components/SendButton";

// Shows "5 minutes ago" and refreshes itself every 30 seconds
function TimeAgo({ iso }: { iso: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!iso) return null;

  return (
    // suppressHydrationWarning: server and browser can differ by a few seconds
    <time
      dateTime={iso}
      title={formatAbsolute(iso)}
      suppressHydrationWarning
      className="text-caption text-secondary"
    >
      {timeAgo(iso, now)}
    </time>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Comments({
  summaryId,
  initialComments,
}: {
  summaryId: number;
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Speichert den Kommentar in Supabase und zeigt ihn danach oben in der Liste
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    try {
      const saved = await addComment(summaryId, text);
      setComments((prev) => [
        { ...saved, timestamp: saved.timestamp ?? new Date().toISOString() },
        ...prev,
      ]);
      setInput("");
    } catch (err) {
      console.error("Kommentar konnte nicht gespeichert werden:", err);
      setError("Kommentar konnte nicht gespeichert werden.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-labelledby="comments-heading">
      <div className="flex items-baseline gap-2">
        <h2 id="comments-heading" className="text-title">
          Kommentare
        </h2>
        <span className="text-body tabular-nums text-secondary">{comments.length}</span>
      </div>

      {/* Eingabe */}
      <form onSubmit={handleSubmit} className="mt-6 max-w-[65ch]">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Kommentar schreiben …"
            aria-label="Kommentar schreiben"
            disabled={sending}
            className="w-full rounded-full bg-raised py-2.5 pl-4 pr-12 text-body text-foreground ring-1 ring-hairline placeholder:text-secondary transition-shadow duration-150 ease-out focus:ring-secondary/60 focus:outline-none disabled:opacity-50"
          />
          <SendButton disabled={sending || !input.trim()} label="Kommentar senden" />
        </div>
        {error && <p role="alert" className="mt-2 text-small text-danger">{error}</p>}
      </form>

      {/* Liste */}
      {comments.length === 0 ? (
        <p className="mt-8 text-body text-secondary">Noch keine Kommentare.</p>
      ) : (
        <ul className="mt-4 max-w-[65ch] divide-y divide-hairline">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3.5 py-5">
              <div
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised text-small font-medium text-foreground ring-1 ring-hairline"
              >
                {initials(c.username)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-small font-semibold">{c.username}</span>
                  <TimeAgo iso={c.timestamp} />
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-body">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
