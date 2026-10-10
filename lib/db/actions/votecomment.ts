"use server";

import { supabase } from "@/lib/db/supabase";

type Vote = -1 | 0 | 1;
type CommentVote = { id: number; rank: number; vote: Vote };

function validateId(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid comment or lecture.");
  }
}

function parseRank(row: { id: number; rank: number | null }): { id: number; rank: number } {
  if (!row || !Number.isSafeInteger(row.id) || !Number.isSafeInteger(row.rank ?? 0)) {
    throw new Error("Invalid vote response.");
  }
  return { id: row.id, rank: row.rank ?? 0 };
}

export async function voteComment(
  commentId: number,
  previousVote: Vote,
  nextVote: Vote,
): Promise<CommentVote> {
  validateId(commentId);
  if (![-1, 0, 1].includes(previousVote) || ![-1, 0, 1].includes(nextVote)) {
    throw new Error("Invalid vote direction.");
  }

  const delta = nextVote - previousVote;
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: current, error: readError } = await supabase
      .from("comment")
      .select("id,rank")
      .eq("id", commentId)
      .single();
    if (readError || !current) {
      throw new Error("The comment could not be loaded. Please try again.");
    }
    const { rank } = parseRank(current);
    if (delta === 0) return { id: commentId, rank, vote: nextVote };
    const nextRank = rank + delta;
    if (!Number.isSafeInteger(nextRank)) throw new Error("Invalid vote score.");

    // Apply only if the score still matches our read. Another visitor's vote
    // makes this update return no row; read the new score and retry that conflict.
    let update = supabase.from("comment").update({ rank: nextRank }).eq("id", commentId);
    update = current.rank === null
      ? update.is("rank", null)
      : update.eq("rank", current.rank);
    const { data, error } = await update.select("id,rank").maybeSingle();
    if (error) {
      // Never automatically retry a network failure: the write may have committed.
      console.error("Comment vote could not be saved:", error.code);
      throw new Error("Your vote could not be saved. Please try again.");
    }
    if (data) return { ...parseRank(data), vote: nextVote };
  }
  throw new Error("Your vote could not be saved. Please try again.");
}

export async function getCommentRanks(summaryId: number): Promise<{ id: number; rank: number }[]> {
  validateId(summaryId);
  const { data, error } = await supabase
    .from("comment")
    .select("id,rank")
    .eq("summary", summaryId);

  if (error) {
    console.error("Comment votes could not be loaded:", error.code);
    throw new Error("Votes could not be loaded. Please try again.");
  }
  return (data ?? []).map(parseRank);
}
