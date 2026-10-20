import { Link } from 'react-router-dom';
import '../styles/admin.css';

export default function HomePage() {
  return (
    <main className="home">
      <div>
        <h1>Shared Setlist</h1>
        <p>Build a setlist, share one link, and everyone sees the songs and chords.</p>
        <Link to="/admin" className="btn btn-primary">Admin sign in</Link>
        <p className="muted" style={{ marginTop: 20 }}>Got a link from the band? Just open it.</p>
      </div>
    </main>
  );
}
