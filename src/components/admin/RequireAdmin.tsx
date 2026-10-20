import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import ThemeToggle from '../ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { signOut } from '../../services/authService';
import '../../styles/admin.css';
import LoginForm from './LoginForm';

/** Layout route: everything under /admin needs a signed-in admin. */
export default function RequireAdmin() {
  const { session, isAdmin, loading } = useAuth();
  const { pathname } = useLocation();
  const wide = /^\/admin\/songs\/(new|[^/]+)$/.test(pathname); // song editor: form + live preview side by side

  if (loading) return <p className="spinner-text">Loading…</p>;
  if (!session) return <LoginForm />;

  if (!isAdmin) {
    return (
      <div className="center">
        <div className="login">
          <h1>Not authorized</h1>
          <p className="muted" style={{ margin: 0 }}>{session.user.email} is signed in but isn't listed as an admin.</p>
          <button className="btn" onClick={() => void signOut()}>Sign out</button>
          <Link to="/" className="muted">‹ Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin">
      <header className="topbar">
        <Link to="/admin" className="brand">Shared Setlist</Link>
        <ThemeToggle />
        <button className="btn btn-sm" onClick={() => void signOut()}>Sign out</button>
      </header>
      <nav className="tabs" aria-label="Admin">
        <NavLink to="/admin" end>Setlists</NavLink>
        <NavLink to="/admin/songs">Songs</NavLink>
      </nav>
      <main className={`admin-main ${wide ? 'wide' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}
