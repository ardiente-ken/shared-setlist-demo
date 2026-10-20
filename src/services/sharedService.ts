// Public (no sign-in). Calls a database function that returns ONE setlist and
// its active songs for an exact share token, and nothing else.
import { supabase } from '../lib/supabase';
import type { SharedSetlist } from '../models/setlist';

/** null = the link is invalid, or sharing was turned off. */
export async function getSharedSetlist(token: string): Promise<SharedSetlist | null> {
  const { data, error } = await supabase.rpc('get_shared_setlist', { p_token: token });
  if (error) throw new Error(error.message);
  return (data as SharedSetlist | null) ?? null;
}
