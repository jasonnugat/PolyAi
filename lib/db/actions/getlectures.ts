import { supabase } from '@/lib/db/supabase';

export async function getLectures() {
  const { data, error } = await supabase
    .from('summary')
    .select('*')
    .order('date', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getLecture(id: number) {
  const { data, error } = await supabase
    .from('summary')
    .select('id,title,date')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
