import { Link } from 'react-router-dom';
import '../styles/admin.css';

export default function NotFoundPage() {
  return (
    <main className="home">
      <div>
        <h1>Page not found</h1>
        <p>That page doesn't exist.</p>
        <Link to="/" className="btn">‹ Home</Link>
      </div>
    </main>
  );
}
