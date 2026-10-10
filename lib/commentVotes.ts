import type { Comment } from "@/lib/db/actions/getcomments";

export type CommentVote = -1 | 0 | 1;
export type CommentSort = "top" | "newest" | "oldest";
export type ConfirmedCommentVote = { id: number; rank: number; vote: CommentVote };

const VOTER_KEY = "poly-lectures-voter-id";
const VOTE_PREFIX = "poly-lectures-comment-vote:";
const VOTE_EVENT = "poly-lectures:comment-vote";
const RANK_EVENT = "poly-lectures:comment-rank";
const RANK_CHANNEL = "poly-lectures-comment-ranks";
const localLocks = new Map<string, Promise<void>>();
const memoryVotes = new Map<string, CommentVote>();

function voteKey(voterId: string, commentId: number) {
  return `${VOTE_PREFIX}${voterId}:${commentId}`;
}

async function withBrowserLock<T>(name: string, action: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(name, action);
  }

  // Keep requests in this tab sequential when Web Locks are unavailable.
  const previous = localLocks.get(name) ?? Promise.resolve();
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const queued = previous.then(() => held);
  localLocks.set(name, queued);
  await previous;
  try {
    return await action();
  } finally {
    release();
    if (localLocks.get(name) === queued) localLocks.delete(name);
  }
}

export function withCommentVoteLock<T>(commentId: number, action: () => Promise<T>) {
  return withBrowserLock(`poly-lectures:vote:${commentId}`, action);
}

export function getBrowserVoterId(): Promise<string> {
  return withBrowserLock("poly-lectures:voter-id", async () => {
    const saved = window.localStorage.getItem(VOTER_KEY);
    if (saved && /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(saved)) {
      return saved;
    }
    const id = crypto.randomUUID();
    window.localStorage.setItem(VOTER_KEY, id);
    return id;
  });
}

export function readCommentVote(voterId: string | null, commentId: number): CommentVote {
  if (!voterId) return 0;
  const key = voteKey(voterId, commentId);
  const remembered = memoryVotes.get(key);
  if (remembered !== undefined) return remembered;
  try {
    const value = window.localStorage.getItem(key);
    return value === "1" ? 1 : value === "-1" ? -1 : 0;
  } catch {
    return 0;
  }
}

export function rememberCommentVote(voterId: string, commentId: number, vote: CommentVote) {
  const key = voteKey(voterId, commentId);
  // Retain confirmed selections in this tab even if storage becomes unavailable.
  memoryVotes.set(key, vote);
  try {
    window.localStorage.setItem(key, String(vote));
    memoryVotes.delete(key);
  } finally {
    window.dispatchEvent(new CustomEvent(VOTE_EVENT, { detail: key }));
  }
}

export function subscribeCommentVote(voterId: string | null, commentId: number, onChange: () => void) {
  if (!voterId) return () => {};
  const key = voteKey(voterId, commentId);
  function onStorage(event: StorageEvent) {
    if (event.key !== null && event.key !== key) return;
    memoryVotes.delete(key);
    onChange();
  }
  function onVote(event: Event) {
    if ((event as CustomEvent<string>).detail === key) onChange();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener(VOTE_EVENT, onVote);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(VOTE_EVENT, onVote);
  };
}

function openRankChannel() {
  try {
    return typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(RANK_CHANNEL);
  } catch {
    return null;
  }
}

export function publishCommentRank(confirmed: ConfirmedCommentVote) {
  // Scores are transient notifications, never persisted as a browser authority.
  window.dispatchEvent(new CustomEvent(RANK_EVENT, { detail: confirmed }));
  const channel = openRankChannel();
  channel?.postMessage(confirmed);
  channel?.close();
}

export function subscribeCommentRanks(onChange: (confirmed: ConfirmedCommentVote) => void) {
  function receive(value: ConfirmedCommentVote) {
    if (value && Number.isSafeInteger(value.id) && Number.isSafeInteger(value.rank)
      && (value.vote === -1 || value.vote === 0 || value.vote === 1)) onChange(value);
  }
  function onRank(event: Event) {
    receive((event as CustomEvent<ConfirmedCommentVote>).detail);
  }
  const channel = openRankChannel();
  if (channel) channel.onmessage = (event: MessageEvent<ConfirmedCommentVote>) => receive(event.data);
  window.addEventListener(RANK_EVENT, onRank);
  return () => {
    window.removeEventListener(RANK_EVENT, onRank);
    channel?.close();
  };
}

export function sortComments(comments: readonly Comment[], order: CommentSort): Comment[] {
  return [...comments].sort((a, b) => {
    if (order === "top" && a.rank !== b.rank) return b.rank - a.rank;
    const dateA = Date.parse(a.timestamp ?? "");
    const dateB = Date.parse(b.timestamp ?? "");
    const validA = Number.isFinite(dateA);
    const validB = Number.isFinite(dateB);
    if (!validA || !validB) {
      if (validA !== validB) return validA ? -1 : 1;
      return b.id - a.id;
    }
    return (order === "oldest" ? dateA - dateB : dateB - dateA) || b.id - a.id;
  });
}
