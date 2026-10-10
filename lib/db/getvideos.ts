import { supabase } from '@/lib/db/supabase';

export async function getVideos() {
  const { data, error, status, statusText } = await supabase
    .from('summary')
    .select('*');

    console.log('Data:', data);
console.log('Error:', error);
console.log('Status:', status, statusText);
console.log('Anzahl:', data?.length);
  if (error) {
    throw new Error(error.message);
  }

  return data;
}