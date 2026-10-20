import { useCallback, useEffect, useState } from 'react';
import type { Setlist, SetlistSong } from '../models/setlist';
import { getSetlists, getSetlistSongs } from '../services/setlistService';

/** All setlists plus which songs are in each (admin data). */
export function useSetlists() {
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [members, setMembers] = useState<SetlistSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([getSetlists(), getSetlistSongs()]);
      setSetlists(s);
      setMembers(m);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load setlists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { setlists, members, loading, error, reload };
}
