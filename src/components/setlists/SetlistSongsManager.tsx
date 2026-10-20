import { useEffect, useMemo, useState } from 'react';
import SongSearch from '../songs/SongSearch';
import { useSongs } from '../../hooks/useSongs';
import { filterSongs } from '../../lib/filterSongs';
import { addSongsToSetlist, removeSongFromSetlist, reorderSetlistSongs } from '../../services/setlistService';

interface Props {
  setlistId: string;
  /** Song ids currently in the setlist, in order. */
  memberIds: string[];
  /** Called after any change so the page can reload from the database. */
  onChanged: () => Promise<void> | void;
}

/** Add many songs at once, remove, and reorder the songs inside one setlist. */
export default function SetlistSongsManager({ setlistId, memberIds, onChanged }: Props) {
  const { songs, loading } = useSongs();
  const [order, setOrder] = useState<string[]>(memberIds);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setOrder(memberIds), [memberIds]);

  const byId = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs]);
  const available = useMemo(
    () => filterSongs(songs.filter((s) => !order.includes(s.id)), query),
    [songs, order, query],
  );

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      await onChanged(); // resync with the database
    } finally {
      setBusy(false);
    }
  };

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next); // instant
    void run(() => reorderSetlistSongs(setlistId, next));
  };

  const remove = (songId: string) => {
    setOrder((o) => o.filter((id) => id !== songId));
    void run(() => removeSongFromSetlist(setlistId, songId));
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allShownSelected = available.length > 0 && available.every((s) => selected.has(s.id));
  const toggleAllShown = () =>
    setSelected((s) => {
      const next = new Set(s);
      if (allShownSelected) available.forEach((x) => next.delete(x.id));
      else available.forEach((x) => next.add(x.id));
      return next;
    });

  const addSelected = () => {
    const ids = [...selected].filter((id) => !order.includes(id));
    if (ids.length === 0) return;
    setSelected(new Set());
    void run(() => addSongsToSetlist(setlistId, ids, order.length));
  };

  return (
    <>
      {error && <p className="error" role="alert">{error}</p>}

      <section className="card">
        <h2>Songs in this setlist ({order.length})</h2>
        {order.length === 0 && <p className="muted" style={{ margin: 0 }}>No songs yet. Add some below.</p>}
        <ol className="fm-list">
          {order.map((id, i) => {
            const song = byId.get(id);
            return (
              <li className="fm-row" key={id}>
                <span className="fm-num">{i + 1}</span>
                <div className="fm-main">
                  <div className="row-title">{song?.title ?? 'Unknown song'}</div>
                  <div className="row-sub">
                    {song?.artist}
                    {song && !song.lyrics.trim() && <span className="badge badge-warn">no lyrics</span>}
                  </div>
                </div>
                <div className="fm-tools">
                  <button className="btn btn-sm" aria-label="Move up" disabled={busy || i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button className="btn btn-sm" aria-label="Move down" disabled={busy || i === order.length - 1} onClick={() => move(i, 1)}>↓</button>
                  <button className="btn btn-sm btn-danger" aria-label="Remove from setlist" disabled={busy} onClick={() => remove(id)}>✕</button>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="card">
        <h2>Add songs</h2>
        <SongSearch value={query} onChange={setQuery} placeholder="Search songs to add…" />
        <div className="bar">
          <button type="button" className="btn btn-sm" onClick={toggleAllShown} disabled={available.length === 0}>
            {allShownSelected ? 'Unselect all shown' : 'Select all shown'}
          </button>
        </div>
        {loading && <p className="muted">Loading songs…</p>}
        <ul className="fm-list">
          {available.map((s) => (
            <li key={s.id}>
              <label className="pick">
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                <span>
                  <strong>{s.title}</strong> <span className="muted">{s.artist}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {!loading && available.length === 0 && <p className="muted">No more songs to add.</p>}
        {selected.size > 0 && (
          <div className="addbar">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={addSelected}>
              Add {selected.size} {selected.size === 1 ? 'song' : 'songs'} to setlist
            </button>
          </div>
        )}
      </section>
    </>
  );
}
