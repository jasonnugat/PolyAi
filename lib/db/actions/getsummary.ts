import { supabase } from '@/lib/db/supabase';

export async function getSummary(id: number) {
    const { data, error } = await supabase
        .from('summary')
        .select('text')
        .eq('id', id);

    if (error) {
        throw new Error(error.message);
    }

    return data[0]?.text ?? null;
}