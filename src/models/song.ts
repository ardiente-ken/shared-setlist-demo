export interface Song {
  id: string;
  title: string;
  artist: string;
  /** Lyrics, optionally with chords: [Am]inline or on a line above. */
  lyrics: string;
  /** Quick reference shown above the lyrics, e.g. "Capo 2 · Am F C G". */
  chords: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SongInput = Pick<Song, 'title' | 'artist' | 'lyrics' | 'chords' | 'is_active'>;

export const EMPTY_SONG: SongInput = { title: '', artist: '', lyrics: '', chords: '', is_active: true };

export const toSongInput = ({ title, artist, lyrics, chords, is_active }: Song): SongInput => ({
  title, artist, lyrics, chords, is_active,
});
