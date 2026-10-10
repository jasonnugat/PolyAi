"use client";

import { useState } from "react";
import type { Comment } from "@/lib/db/actions/getcomments";

// "2026-10-10T16:22:00+00:00" -> "10.10.2026, 18:22"
// Feste Zeitzone, damit Server und Browser dasselbe anzeigen
function formatDate(iso: string) {
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Zurich",
  }).format(new Date(iso));
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
  initialComments,
}: {
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [input, setInput] = useState("");

  // Nur lokal, wird noch nicht in Supabase gespeichert
  function addComment(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setComments([
      {
        id: -Date.now(), // temporär, bis es einen echten INSERT gibt
        summary: comments[0]?.summary ?? 0,
        text,
        username: "Du",
        timestamp: new Date().toISOString(),
      },
      ...comments,
    ]);
    setInput("");
  }

  return (
    <section className="rounded-lg border border-gray-300 p-4">
      <h2 className="mb-4 font-semibold">
        Kommentare <span className="font-normal text-gray-500">({comments.length})</span>
      </h2>

      {/* Eingabe */}
      <form onSubmit={addComment} className="mb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Kommentar schreiben …"
          className="w-full rounded-full border border-gray-300 px-4 py-2 outline-none focus:border-gray-500"
        />
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
                  <span className="text-xs text-gray-400">{formatDate(c.timestamp)}</span>
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
