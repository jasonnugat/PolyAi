import { supabase } from '@/lib/db/supabase';

// Entspricht den Spalten der Tabelle "comment"
export type Comment = {
  id: number;
  summary: number; // Fremdschlüssel auf die Summary
  text: string;
  username: string;
  timestamp: string | null; // ISO-String
  rank: number;
};

export async function getComments(id: number): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comment')
    .select('id,summary,text,username,timestamp,rank')
    .eq('summary', id)
    .order('rank', { ascending: false, nullsFirst: false })
    .order('timestamp', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((comment) => ({ ...comment, rank: comment.rank ?? 0 }));
}
