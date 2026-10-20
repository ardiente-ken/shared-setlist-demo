import { useCallback, useEffect, useState } from 'react';
import type { SharedSetlist } from '../models/setlist';
import { getSharedSetlist } from '../services/sharedService';

const key = (token: string) => `shared-setlist.${token}.v1`;

function readCache(token: string | undefined): SharedSetlist | null {
  if (!token) return null;
  try {
    const raw = localStorage.getItem(key(token));
    return raw ? (JSON.parse(raw) as SharedSetlist) : null;
  } catch {
    return null;
  }
}

/**
 * The setlist behind a share link. The last good copy is cached on the device,
 * so a link that was opened once still works with a weak signal. If sharing is
 * turned off, the next successful load clears it.
 */
export function useSharedSetlist(token: string | undefined) {
  const [data, setData] = useState<SharedSetlist | null>(() => readCache(token));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await getSharedSetlist(token);
      setData(result);
      setError(null);
      try {
        if (result) localStorage.setItem(key(token), JSON.stringify(result));
        else localStorage.removeItem(key(token));
      } catch {
        /* storage unavailable: fine */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this setlist');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setData(readCache(token));
    void load();
  }, [token, load]);

  return { data, loading, error, reload: load };
}
