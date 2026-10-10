import { supabase } from '@/lib/db/supabase';

// Entspricht den Spalten der Tabelle "comment"
export type Comment = {
  id: number;
  summary: number; // Fremdschlüssel auf die Summary
  text: string;
  username: string;
  timestamp: string; // ISO-String, z. B. "2026-10-10T16:22:00+00:00"
};

export async function getComments(id: number): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comment')
    .select('*')
    .eq('summary', id)
    .order('timestamp', { ascending: false }); // neueste zuerst
console.log(data)
  if (error) {
    throw new Error(error.message);
  }

  return data;
}
