import { supabase } from '@/lib/db/supabase';

export async function addComment(summary: number, text: string): Promise<Comment> {
  if (!text) {
    throw new Error('Text und Benutzername dürfen nicht leer sein.');
  }

  const { data, error } = await supabase
    .from('comment')
    .insert({
      summary: summary,
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