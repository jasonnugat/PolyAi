"use server";

import { supabase } from '@/lib/db/supabase';
import type { Comment } from '@/lib/db/actions/getcomments';

export async function addComment(summary: number, text: string): Promise<Comment> {
  if (!text.trim()) {
    throw new Error('Text darf nicht leer sein.');
  }

  const { data, error } = await supabase
    .from('comment')
    .insert({
      summary,
      text,
      username: "Anonymous"
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}