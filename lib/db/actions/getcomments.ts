import { supabase } from '@/lib/db/supabase';

export type Comment = {
  id: number;
  summary: number;
  text: string;
  username: string;
  timestamp: string;
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
