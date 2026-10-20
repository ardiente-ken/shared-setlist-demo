import { Link, useNavigate, useParams } from 'react-router-dom';
import SongForm from '../../components/songs/SongForm';
import { useSong } from '../../hooks/useSongs';
import { toSongInput } from '../../models/song';
import { createSong, updateSong } from '../../services/songService';

/** /admin/songs/new adds a song; /admin/songs/:id edits it (same form). */
export default function SongEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { song, loading, error } = useSong(id);
  const back = () => navigate('/admin/songs');

  if (!id) {
    return (
      <>
        <div className="page-head"><h1>Add song</h1></div>
        <SongForm submitLabel="Add song" onSubmit={async (v) => { await createSong(v); back(); }} onCancel={back} />
      </>
    );
  }

  if (loading) return <p className="spinner-text">Loading…</p>;
  if (error || !song) {
    return (
      <>
        <p className="error">{error ?? 'Song not found.'}</p>
        <Link to="/admin/songs" className="btn">← Back</Link>
      </>
    );
  }

  return (
    <>
      <div className="page-head"><h1>Edit song</h1></div>
      <SongForm
        initial={toSongInput(song)}
        submitLabel="Save changes"
        onSubmit={async (v) => { await updateSong(song.id, v); back(); }}
        onCancel={back}
      />
    </>
  );
}
