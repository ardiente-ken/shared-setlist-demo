import { useCallback, useEffect, useState } from 'react';
import type { Song } from '../models/song';
import { getSong, getSongs } from '../services/songService';

export function useSongs() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setSongs(await getSongs());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load songs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { songs, loading, error, reload };
}

export function useSong(id: string | undefined) {
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getSong(id)
      .then((s) => !cancelled && setSong(s))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load song'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { song, loading, error };
}
