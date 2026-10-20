import { Route, Routes } from 'react-router-dom';
import RequireAdmin from './components/admin/RequireAdmin';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import SetlistEditorPage from './pages/admin/SetlistEditorPage';
import SetlistsPage from './pages/admin/SetlistsPage';
import SongEditorPage from './pages/admin/SongEditorPage';
import SongsPage from './pages/admin/SongsPage';
import SharedLayout from './pages/shared/SharedLayout';
import SharedSetlistPage from './pages/shared/SharedSetlistPage';
import SharedSongPage from './pages/shared/SharedSongPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* Actor 2: anyone with a share link (no sign-in) */}
      <Route path="/s/:token" element={<SharedLayout />}>
        <Route index element={<SharedSetlistPage />} />
        <Route path=":songId" element={<SharedSongPage />} />
      </Route>

      {/* Actor 1: the admin (signed in) */}
      <Route path="/admin" element={<RequireAdmin />}>
        <Route index element={<SetlistsPage />} />
        <Route path="setlists/new" element={<SetlistEditorPage />} />
        <Route path="setlists/:id" element={<SetlistEditorPage />} />
        <Route path="songs" element={<SongsPage />} />
        <Route path="songs/new" element={<SongEditorPage />} />
        <Route path="songs/:id" element={<SongEditorPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
