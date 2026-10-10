"use client";

import { useEffect, useState } from "react";
import type { Comment } from "@/lib/db/actions/getcomments";
import { addComment } from "@/lib/db/actions/putcomment";
import { formatAbsolute, timeAgo } from "@/lib/timeAgo";

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
      className="text-xs text-gray-400"
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
    <section className="rounded-lg border border-gray-300 p-4">
      <h2 className="mb-4 font-semibold">
        Kommentare <span className="font-normal text-gray-500">({comments.length})</span>
      </h2>

      {/* Eingabe */}
      <form onSubmit={handleSubmit} className="mb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Kommentar schreiben …"
          disabled={sending}
          className="w-full rounded-full border border-gray-300 px-4 py-2 outline-none focus:border-gray-500 disabled:bg-gray-50"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>

      {/* Liste */}
      {comments.length === 0 ? (
        <p className="text-sm text-gray-400">Noch keine Kommentare.</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <div
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-700"
              >
                {initials(c.username)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-semibold">{c.username}</span>
                  <TimeAgo iso={c.timestamp} />
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
