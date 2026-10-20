import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SongSearch from '../../components/songs/SongSearch';
import { useSongs } from '../../hooks/useSongs';
import { filterSongs } from '../../lib/filterSongs';
import type { Song } from '../../models/song';
import { deleteSong } from '../../services/songService';

export default function SongsPage() {
  const { songs, loading, error, reload } = useSongs();
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => filterSongs(songs, query), [songs, query]);

  const handleDelete = async (song: Song) => {
    if (!window.confirm(`Delete "${song.title}"? It is removed from every setlist too. This can't be undone.`)) return;
    setBusyId(song.id);
    setActionError(null);
    try {
      await deleteSong(song.id);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Songs</h1>
        <div className="page-actions">
          <Link to="/admin/songs/new" className="btn btn-primary">+ Add song</Link>
        </div>
      </div>

      <SongSearch value={query} onChange={setQuery} />
      <p className="muted">{loading ? 'Loading…' : `${filtered.length} of ${songs.length} songs`}</p>
      {(error || actionError) && <p className="error" role="alert">{actionError ?? error}</p>}

      <ul className="row-list" style={{ marginTop: 0 }}>
        {filtered.map((song) => (
          <li className="row" key={song.id}>
            <div className="row-main">
              <div className="row-title">{song.title}</div>
              <div className="row-sub">
                <span>{song.artist}</span>
                {!song.is_active && <span className="badge">Inactive</span>}
                {!song.lyrics.trim() && <span className="badge badge-warn">No lyrics</span>}
              </div>
            </div>
            <div className="row-actions">
              <Link to={`/admin/songs/${song.id}`} className="btn btn-sm">Edit</Link>
              <button className="btn btn-sm btn-danger" disabled={busyId === song.id} onClick={() => void handleDelete(song)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
      {!loading && filtered.length === 0 && <p className="muted">No songs found.</p>}
    </>
  );
}
