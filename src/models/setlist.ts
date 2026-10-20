/** A setlist is a row in the shared `folders` table. */
export interface Setlist {
  id: string;
  name: string;
  description: string;
  /** Null = not shared. Otherwise the secret in the share link. */
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

export type SetlistInput = Pick<Setlist, 'name' | 'description'>;

export interface SetlistSong {
  folder_id: string;
  song_id: string;
  position: number;
}

/** What a viewer receives through a share link. */
export interface SharedSong {
  id: string;
  title: string;
  artist: string;
  lyrics: string;
  chords: string;
  position: number;
}

export interface SharedSetlist {
  folder: { id: string; name: string; description: string };
  songs: SharedSong[];
}
