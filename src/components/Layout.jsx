import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">🐎</span>
          <h1>Planificación de prácticas</h1>
        </div>
        <nav className="header-nav">
          <Link to="/horses" className="nav-link">Caballos</Link>
          <Link to="/players" className="nav-link">Jugadores</Link>
          <Link to="/practices" className="nav-link">Prácticas</Link>
          <Link to="/proximas" className="nav-link nav-link-public">📅 Próximas</Link>
        </nav>
        <div className="header-user">
          <span className="user-email">{user?.email}</span>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm">
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
