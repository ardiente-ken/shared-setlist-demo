import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '../ui/ThemeToggle';
import { useFontSize } from '../../hooks/useFontSize';
import { useSwipe } from '../../hooks/useSwipe';
import { useWakeLock } from '../../hooks/useWakeLock';
import '../../styles/viewer.css';
import ChordLyrics from './ChordLyrics';

export interface ViewerSong {
  id: string;
  title: string;
  artist: string;
  lyrics: string;
  chords: string;
}

interface Props {
  songs: ViewerSong[];
  /** Index of the song being shown inside `songs`. */
  index: number;
  /** URL for a given song id (Prev / Next / swipe / arrow keys). */
  songPath: (id: string) => string;
  /** The setlist (song list). */
  backTo: string;
  banner?: ReactNode;
}

/** One song, read-only: chords over lyrics, Prev/Next, swipe, text size, chords on/off, light/dark. */
export default function SongViewer({ songs, index, songPath, backTo, banner }: Props) {
  const navigate = useNavigate();
  const font = useFontSize();
  const [showChords, setShowChords] = useState(true);
  const song = songs[index];

  const go = useCallback(
    (offset: number) => {
      const target = songs[index + offset];
      // replace: the browser Back button returns to the setlist, not through every song
      if (target) navigate(songPath(target.id), { replace: true });
    },
    [songs, index, navigate, songPath],
  );
  const next = useCallback(() => go(1), [go]);
  const prev = useCallback(() => go(-1), [go]);

  const swipe = useSwipe({ onSwipeLeft: next, onSwipeRight: prev });
  useWakeLock();

  const songId = song?.id;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [songId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  if (!song) return null;

  return (
    <div className="reader" {...swipe}>
      <header className="topbar">
        <Link to={backTo} className="tbtn" aria-label="Back to setlist">‹</Link>
        <span className="pos" aria-live="polite">{index + 1} / {songs.length}</span>
        <div className="tools">
          <button type="button" className="tbtn" aria-label="Smaller text" disabled={!font.canSmaller} onClick={font.smaller}>A−</button>
          <button type="button" className="tbtn" aria-label="Larger text" disabled={!font.canBigger} onClick={font.bigger}>A+</button>
          <button type="button" className="tbtn" aria-label="Show chords" aria-pressed={showChords} onClick={() => setShowChords((v) => !v)}>
            ♯<span className="lbl">Chords</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      {banner}

      <main className="content">
        <h1 className="song-title">{song.title}</h1>
        <p className="song-artist">{song.artist}</p>
        {showChords && song.chords.trim() && <p className="song-meta">{song.chords}</p>}
        <ChordLyrics source={song.lyrics} fontSize={font.size} showChords={showChords} />
      </main>

      <footer className="bottombar">
        <button type="button" className="tbtn" onClick={prev} disabled={index <= 0}>‹ Prev</button>
        <button type="button" className="tbtn" onClick={next} disabled={index >= songs.length - 1}>Next ›</button>
      </footer>
    </div>
  );
}
