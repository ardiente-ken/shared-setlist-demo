import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSetlists } from '../../hooks/useSetlists';
import { copyText, shareUrl } from '../../lib/token';
import type { Setlist } from '../../models/setlist';
import { deleteSetlist } from '../../services/setlistService';

export default function SetlistsPage() {
  const { setlists, members, loading, error, reload } = useSetlists();
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const countFor = (id: string) => members.filter((m) => m.folder_id === id).length;

  const handleDelete = async (s: Setlist) => {
    if (!window.confirm(`Delete the setlist "${s.name}"? Its share link stops working. Your songs are NOT deleted.`)) return;
    setActionError(null);
    try {
      await deleteSetlist(s.id);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const copy = async (s: Setlist) => {
    if (!s.share_token) return;
    await copyText(shareUrl(s.share_token));
    setCopied(s.id);
    window.setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <div className="page-head">
        <h1>Setlists</h1>
        <div className="page-actions">
          <Link to="/admin/setlists/new" className="btn btn-primary">+ New setlist</Link>
        </div>
      </div>

      {(error || actionError) && <p className="error" role="alert">{actionError ?? error}</p>}
      {loading && <p className="spinner-text">Loading…</p>}
      {!loading && setlists.length === 0 && (
        <p className="muted">No setlists yet. Create one for an event, like "Christmas Event", then add songs and share the link.</p>
      )}

      <ul className="row-list">
        {setlists.map((s) => (
          <li className="row" key={s.id}>
            <div className="row-main">
              <div className="row-title">{s.name}</div>
              <div className="row-sub">
                <span>{countFor(s.id)} songs</span>
                <span className={`badge ${s.share_token ? 'badge-on' : ''}`}>{s.share_token ? 'Shared' : 'Not shared'}</span>
              </div>
            </div>
            <div className="row-actions">
              {s.share_token && (
                <button className="btn btn-sm" onClick={() => void copy(s)}>{copied === s.id ? 'Copied ✓' : 'Copy link'}</button>
              )}
              <Link to={`/admin/setlists/${s.id}`} className="btn btn-sm">Edit</Link>
              <button className="btn btn-sm btn-danger" onClick={() => void handleDelete(s)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
