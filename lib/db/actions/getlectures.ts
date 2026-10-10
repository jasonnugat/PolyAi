import { supabase } from '@/lib/db/supabase';

export async function getLectures() {
  const { data, error } = await supabase
    .from('summary')
    .select('*');

  if (error) {
    throw new Error(error.message);
  }

  return data;
}