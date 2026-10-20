import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SetlistForm from '../../components/setlists/SetlistForm';
import SetlistSongsManager from '../../components/setlists/SetlistSongsManager';
import SharePanel from '../../components/setlists/SharePanel';
import { useSetlists } from '../../hooks/useSetlists';
import { createSetlist, updateSetlist } from '../../services/setlistService';

/** /admin/setlists/new creates a setlist; /admin/setlists/:id edits it, manages its songs and its share link. */
export default function SetlistEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setlists, members, loading, reload } = useSetlists();

  const setlist = id ? (setlists.find((s) => s.id === id) ?? null) : null;
  const memberIds = useMemo(
    () => members.filter((m) => m.folder_id === id).sort((a, b) => a.position - b.position).map((m) => m.song_id),
    [members, id],
  );

  if (!id) {
    return (
      <>
        <div className="page-head"><h1>New setlist</h1></div>
        <SetlistForm
          submitLabel="Create setlist"
          onSubmit={async (values) => {
            const created = await createSetlist(values);
            navigate(`/admin/setlists/${created.id}`); // straight on to adding songs
          }}
          onCancel={() => navigate('/admin')}
        />
      </>
    );
  }

  if (!setlist) {
    return loading ? (
      <p className="spinner-text">Loading…</p>
    ) : (
      <>
        <p className="error">Setlist not found.</p>
        <Link to="/admin" className="btn">← Back</Link>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1>{setlist.name}</h1>
        <div className="page-actions">
          <Link to="/admin" className="btn">← Setlists</Link>
        </div>
      </div>

      <SetlistForm
        key={setlist.updated_at}
        initial={{ name: setlist.name, description: setlist.description }}
        submitLabel="Save details"
        onSubmit={async (values) => {
          await updateSetlist(setlist.id, values);
          await reload();
        }}
        onCancel={() => navigate('/admin')}
      />

      <SharePanel setlist={setlist} onChanged={reload} />
      <SetlistSongsManager setlistId={setlist.id} memberIds={memberIds} onChanged={reload} />
    </>
  );
}
