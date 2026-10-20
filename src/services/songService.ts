// All access to the shared `songs` table. Writes are admin-only (enforced by RLS).
import { supabase } from '../lib/supabase';
import type { Song, SongInput } from '../models/song';

const TABLE = 'songs';

const normalize = (row: Song): Song => ({
  ...row,
  lyrics: row.lyrics ?? '',
  chords: row.chords ?? '',
  is_active: row.is_active ?? true,
});

export async function getSongs(): Promise<Song[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('title', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Song[]).map(normalize);
}

export async function getSong(id: string): Promise<Song | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalize(data as Song) : null;
}

export async function createSong(song: SongInput): Promise<Song> {
  const { data, error } = await supabase.from(TABLE).insert(song).select().single();
  if (error) throw new Error(error.message);
  return normalize(data as Song);
}

export async function updateSong(id: string, song: Partial<SongInput>): Promise<Song> {
  const { data, error } = await supabase.from(TABLE).update(song).eq('id', id).select().maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Song not found, or you do not have permission to edit it.');
  return normalize(data as Song);
}

export async function deleteSong(id: string): Promise<void> {
  const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Song not found, or you do not have permission to delete it.');
}
