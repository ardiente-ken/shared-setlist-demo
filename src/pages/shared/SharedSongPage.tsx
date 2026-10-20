import { Link, useOutletContext, useParams } from 'react-router-dom';
import SongViewer from '../../components/songs/SongViewer';
import '../../styles/viewer.css';
import type { SharedContext } from './SharedLayout';

/** One song as a chord sheet. Prev / Next / swipe move through the whole setlist. */
export default function SharedSongPage() {
  const { token, songId } = useParams();
  const { data, offline } = useOutletContext<SharedContext>();
  const index = data.songs.findIndex((s) => s.id === songId);

  if (index < 0) {
    return (
      <div className="reader">
        <p className="reader-msg">That song isn't in this setlist.</p>
        <p style={{ textAlign: 'center' }}><Link to={`/s/${token}`} className="btn">‹ Back to setlist</Link></p>
      </div>
    );
  }

  return (
    <SongViewer
      songs={data.songs}
      index={index}
      songPath={(id) => `/s/${token}/${id}`}
      backTo={`/s/${token}`}
      banner={offline ? <p className="banner">Offline: showing the last saved copy.</p> : null}
    />
  );
}
