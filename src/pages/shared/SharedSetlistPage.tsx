import { useMemo, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import SongSearch from '../../components/songs/SongSearch';
import ThemeToggle from '../../components/ui/ThemeToggle';
import { filterSongs } from '../../lib/filterSongs';
import '../../styles/viewer.css';
import type { SharedContext } from './SharedLayout';

/** What a visitor sees first: the setlist. Tap a song to read its chords. */
export default function SharedSetlistPage() {
  const { token } = useParams();
  const { data, offline } = useOutletContext<SharedContext>();
  const [query, setQuery] = useState('');
  const { folder, songs } = data;

  const filtered = useMemo(() => filterSongs(songs, query), [songs, query]);

  return (
    <div className="reader">
      <header className="topbar">
        <span className="topbar-title">{folder.name}</span>
        <ThemeToggle />
      </header>
      {offline && <p className="banner">Offline: showing the last saved copy.</p>}

      <main className="content">
        <div className="reader-head">
          <h1>{folder.name}</h1>
          {folder.description && <p>{folder.description}</p>}
        </div>

        {songs.length > 6 && <SongSearch value={query} onChange={setQuery} />}
        <p className="count">{songs.length} {songs.length === 1 ? 'song' : 'songs'}</p>

        <ul className="song-list">
          {filtered.map((song) => (
            <li key={song.id}>
              <Link to={`/s/${token}/${song.id}`} className="song-link">
                {/* position in the real setlist, even while searching */}
                <span className="song-num">{songs.indexOf(song) + 1}</span>
                <span className="song-main">
                  <span className="song-name">{song.title}</span>
                  <span className="song-by">{song.artist}</span>
                </span>
                <span className="chev" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
        {songs.length === 0 && <p className="reader-msg">No songs in this setlist yet.</p>}
        {songs.length > 0 && filtered.length === 0 && <p className="reader-msg">No songs match.</p>}
      </main>
    </div>
  );
}
