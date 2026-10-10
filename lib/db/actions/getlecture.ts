import { supabase } from '@/lib/db/supabase';

export type Lecture = {
  id: number;
  title: string | null;
  date: string | null;
};

// Titel und Datum einer einzelnen Vorlesung (null, wenn es sie nicht gibt)
export async function getLecture(id: number): Promise<Lecture | null> {
  const { data, error } = await supabase
    .from('summary')
    .select('id, title, date')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
