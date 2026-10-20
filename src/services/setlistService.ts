// Setlists are rows in the shared `folders` table; their songs live in
// `folder_songs`. All of this is admin-only (enforced by RLS).
import { supabase } from '../lib/supabase';
import { generateToken } from '../lib/token';
import { uniqueSlug } from '../lib/slug';
import type { Setlist, SetlistInput, SetlistSong } from '../models/setlist';

const FOLDERS = 'folders';
const MEMBERS = 'folder_songs';

const COLUMNS = 'id, name, description, share_token, created_at, updated_at';

function friendly(message: string): Error {
  if (/row-level security|permission denied/i.test(message)) {
    return new Error('Only the admin can change setlists. Sign in again.');
  }
  return new Error(message);
}

export async function getSetlists(): Promise<Setlist[]> {
  const { data, error } = await supabase.from(FOLDERS).select(COLUMNS).order('name', { ascending: true });
  if (error) throw friendly(error.message);
  return (data ?? []) as Setlist[];
}

export async function getSetlistSongs(): Promise<SetlistSong[]> {
  const { data, error } = await supabase
    .from(MEMBERS)
    .select('folder_id, song_id, position')
    .order('position', { ascending: true });
  if (error) throw friendly(error.message);
  return (data ?? []) as SetlistSong[];
}

export async function createSetlist(input: SetlistInput): Promise<Setlist> {
  // is_public stays false: setlists here are only reachable through a share link
  const { data, error } = await supabase
    .from(FOLDERS)
    .insert({ ...input, slug: uniqueSlug(input.name), is_public: false })
    .select(COLUMNS)
    .single();
  if (error) throw friendly(error.message);
  return data as Setlist;
}

export async function updateSetlist(id: string, input: Partial<SetlistInput>): Promise<void> {
  const { data, error } = await supabase.from(FOLDERS).update(input).eq('id', id).select('id');
  if (error) throw friendly(error.message);
  if (!data || data.length === 0) throw new Error('Setlist not found, or you do not have permission to edit it.');
}

/** Deletes the setlist only. The songs themselves are never deleted. */
export async function deleteSetlist(id: string): Promise<void> {
  const { data, error } = await supabase.from(FOLDERS).delete().eq('id', id).select('id');
  if (error) throw friendly(error.message);
  if (!data || data.length === 0) throw new Error('Setlist not found, or you do not have permission to delete it.');
}

/* ----- songs inside a setlist ----- */

/** Appends songs to the end. Songs already in the setlist are skipped. */
export async function addSongsToSetlist(setlistId: string, songIds: string[], startPosition: number): Promise<void> {
  if (songIds.length === 0) return;
  const rows = songIds.map((song_id, i) => ({ folder_id: setlistId, song_id, position: startPosition + i }));
  const { error } = await supabase
    .from(MEMBERS)
    .upsert(rows, { onConflict: 'folder_id,song_id', ignoreDuplicates: true });
  if (error) throw friendly(error.message);
}

export async function removeSongFromSetlist(setlistId: string, songId: string): Promise<void> {
  const { error } = await supabase.from(MEMBERS).delete().eq('folder_id', setlistId).eq('song_id', songId);
  if (error) throw friendly(error.message);
}

/** Saves a new order in one request. */
export async function reorderSetlistSongs(setlistId: string, orderedSongIds: string[]): Promise<void> {
  const rows = orderedSongIds.map((song_id, position) => ({ folder_id: setlistId, song_id, position }));
  const { error } = await supabase.from(MEMBERS).upsert(rows, { onConflict: 'folder_id,song_id' });
  if (error) throw friendly(error.message);
}

/* ----- sharing ----- */

/** Creates a new random link. If one existed, the old link stops working. */
export async function createShareToken(setlistId: string): Promise<string> {
  const token = generateToken();
  const { data, error } = await supabase.from(FOLDERS).update({ share_token: token }).eq('id', setlistId).select('id');
  if (error) throw friendly(error.message);
  if (!data || data.length === 0) throw new Error('Could not create the link.');
  return token;
}

/** The link stops working immediately. */
export async function stopSharing(setlistId: string): Promise<void> {
  const { data, error } = await supabase.from(FOLDERS).update({ share_token: null }).eq('id', setlistId).select('id');
  if (error) throw friendly(error.message);
  if (!data || data.length === 0) throw new Error('Could not stop sharing.');
}
