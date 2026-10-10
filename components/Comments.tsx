"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Comment } from "@/lib/db/actions/getcomments";
import { addComment } from "@/lib/db/actions/putcomment";
import { getCommentRanks, voteComment } from "@/lib/db/actions/votecomment";
import { formatAbsolute, timeAgo } from "@/lib/timeAgo";
import {
  getBrowserVoterId, publishCommentRank, readCommentVote, rememberCommentVote,
  sortComments, subscribeCommentRanks, subscribeCommentVote, withCommentVoteLock,
  type CommentSort, type CommentVote, type ConfirmedCommentVote,
} from "@/lib/commentVotes";
import Icon from "@/components/Icon";

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
      className="muted comment-time"
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

function CommentVoting({ comment, voterId, onConfirmed }: {
  comment: Comment;
  voterId: string | null;
  onConfirmed: (confirmed: ConfirmedCommentVote) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const vote = useSyncExternalStore(
    useCallback((onChange) => subscribeCommentVote(voterId, comment.id, onChange), [voterId, comment.id]),
    useCallback(() => readCommentVote(voterId, comment.id), [voterId, comment.id]),
    () => 0 as CommentVote,
  );

  async function handleVote(direction: -1 | 1) {
    if (!voterId || pendingRef.current) return;
    const nextVote: CommentVote = vote === direction ? 0 : direction;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      await withCommentVoteLock(comment.id, async () => {
        const previousVote = readCommentVote(voterId, comment.id);
        const saved = await voteComment(comment.id, previousVote, nextVote);
        onConfirmed(saved);
        try {
          rememberCommentVote(voterId, comment.id, saved.vote);
        } catch {
          setError("Vote saved, but this browser could not remember your selection.");
        }
        publishCommentRank(saved);
      });
    } catch {
      setError("Your vote could not be saved. Please try again.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <div className="comment-vote-area">
      <div className="comment-voting" role="group" aria-label="Rate this comment" aria-busy={pending}>
        <button
          type="button"
          className="comment-vote-button"
          aria-label="Upvote comment"
          aria-pressed={vote === 1}
          title={vote === 1 ? "Remove upvote" : "Upvote"}
          disabled={pending || !voterId}
          onClick={() => handleVote(1)}
        >
          <Icon name="arrow-up" size={15} />
        </button>
        <span className="comment-score" role="status" aria-label={`Score: ${comment.rank}`}>
          {comment.rank}
        </span>
        <button
          type="button"
          className="comment-vote-button"
          aria-label="Downvote comment"
          aria-pressed={vote === -1}
          title={vote === -1 ? "Remove downvote" : "Downvote"}
          disabled={pending || !voterId}
          onClick={() => handleVote(-1)}
        >
          <Icon name="arrow-down" size={15} />
        </button>
      </div>
      {error && <p className="form-error comment-vote-error" role="alert">{error}</p>}
    </div>
  );
}

export default function Comments({
  summaryId,
  initialComments,
}: {
  summaryId: number;
  initialComments: Comment[];
}) {
  const [data, setData] = useState({ source: initialComments, comments: initialComments });
  const [sortOrder, setSortOrder] = useState<CommentSort>("top");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [voteSyncError, setVoteSyncError] = useState<string | null>(null);
  const voteRevision = useRef(0);

  // Accept fresh server snapshots without resetting on Activity re-show.
  // Keep locally submitted comments until they appear in a server snapshot.
  if (data.source !== initialComments) {
    const previousIds = new Set(data.source.map((comment) => comment.id));
    const incomingIds = new Set(initialComments.map((comment) => comment.id));
    const added = data.comments.filter((comment) => !previousIds.has(comment.id) && !incomingIds.has(comment.id));
    setData({ source: initialComments, comments: [...added, ...initialComments] });
  }

  const updateRank = useCallback((confirmed: ConfirmedCommentVote) => {
    voteRevision.current += 1;
    setData((current) => ({
      ...current,
      comments: current.comments.map((comment) => comment.id === confirmed.id
        ? { ...comment, rank: confirmed.rank }
        : comment),
    }));
  }, []);

  useEffect(() => subscribeCommentRanks(updateRank), [updateRank]);

  useEffect(() => {
    let active = true;
    let request = 0;
    async function refreshVotes() {
      const currentRequest = ++request;
      let id: string | null = null;
      try {
        id = await getBrowserVoterId();
      } catch {
        if (active) setVoteSyncError("Allow site storage to vote on comments.");
      }
      if (!active || currentRequest !== request) return;
      setVoterId(id);
      const revision = voteRevision.current;
      try {
        const confirmed = await getCommentRanks(summaryId);
        if (!active || currentRequest !== request || revision !== voteRevision.current) return;
        // The database stores aggregate scores; browser selections stay local.
        const ranks = new Map(confirmed.map((row) => [row.id, row.rank]));
        setData((current) => ({
          ...current,
          comments: current.comments.map((comment) => ranks.has(comment.id)
            ? { ...comment, rank: ranks.get(comment.id)! }
            : comment),
        }));
        if (id) setVoteSyncError(null);
      } catch {
        if (active && currentRequest === request) setVoteSyncError("Votes could not be refreshed. Please try again later.");
      }
    }
    function onVisible() {
      if (document.visibilityState === "visible") void refreshVotes();
    }
    void refreshVotes();
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [summaryId]);

  const comments = sortComments(data.comments, sortOrder);

  // Speichert den Kommentar in Supabase und zeigt ihn danach oben in der Liste
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    try {
      const saved = await addComment(summaryId, text);
      setData((current) => ({
        ...current,
        comments: [
          { ...saved, rank: saved.rank ?? 0, timestamp: saved.timestamp ?? new Date().toISOString() },
          ...current.comments,
        ],
      }));
      setInput("");
    } catch (err) {
      console.error("Kommentar konnte nicht gespeichert werden:", err);
      setError("Your comment could not be saved. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="panel comments-panel" aria-labelledby="comments-title">
      <div className="comments-toolbar">
        <div className="panel-heading">
          <span className="icon-tile"><Icon name="chat" /></span>
          <h2 id="comments-title" className="panel-title">Comments</h2>
          <span className="comment-count">{comments.length}</span>
        </div>
        <div className="lecture-sort comment-sort">
          <select
            aria-label="Sort comments"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as CommentSort)}
          >
            <option value="top">Top rated</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <Icon name="chevron-down" size={14} />
        </div>
      </div>

      {/* Eingabe */}
      <form onSubmit={handleSubmit} className="comment-form">
        <div className="composer">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Write a comment …"
            aria-label="Write a comment"
            disabled={sending}
            className="composer-input"
          />
          <button
            type="submit"
            className="send-button"
            disabled={sending || !input.trim()}
            aria-label={sending ? "Saving comment" : "Send comment"}
            title="Send comment"
          >
            <Icon name="send" size={18} />
          </button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>

      {voteSyncError && <p className="form-error comment-sync-error" role="status">{voteSyncError}</p>}

      {/* Liste */}
      {comments.length === 0 ? (
        <p className="muted comments-empty">No comments yet.</p>
      ) : (
        <ul className="comments-list">
          {comments.map((c) => (
            <li key={c.id} className="comment-item">
              <div
                aria-hidden
                className="comment-avatar"
              >
                {initials(c.username)}
              </div>

              <div className="comment-content">
                <div className="comment-meta">
                  <span className="comment-author">{c.username}</span>
                  <TimeAgo iso={c.timestamp} />
                </div>
                <p className="comment-text">{c.text}</p>
                <CommentVoting comment={c} voterId={voterId} onConfirmed={updateRank} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
