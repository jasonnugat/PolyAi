"use server";

import { supabase } from '@/lib/db/supabase';
import type { Comment } from '@/lib/db/actions/getcomments';

export async function addComment(summary: number, text: string): Promise<Comment> {
  if (!Number.isSafeInteger(summary) || summary <= 0 || typeof text !== 'string' || !text.trim()) {
    throw new Error('A valid lecture and comment are required.');
  }

  const { data, error } = await supabase
    .from('comment')
    .insert({
      summary,
      text: text.trim(),
      username: "Anonymous",
      rank: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { ...data, rank: data.rank ?? 0 };
}
