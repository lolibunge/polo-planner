import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePlayers, updatePlayer } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const { user, logout, isAdmin } = useAuth();
  const { players, loading: playersLoading } = usePlayers();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [level, setLevel] = useState('0');
  const [notes, setNotes] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  if (!user) {
    return (
      <div className="public-practices-login">
        <h2>Mi perfil</h2>
        <p>Debes iniciar sesión para ver tu perfil.</p>
        <Link to="/login" state={{ from: location.pathname + location.search }} className="btn btn-primary">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  useEffect(() => {
    if (isAdmin) navigate('/horses');
  }, [isAdmin, navigate]);

  const normalizedUserEmail = (user?.email || '').trim().toLowerCase();
  const linkedPlayer = useMemo(() => {
    const uid = user?.uid || '';
    if (uid) {
      const byUid = players.find(p => p.uid === uid || p.id === uid);
      if (byUid) return byUid;
    }
    if (!normalizedUserEmail) return null;
    return (
      players.find(p => (p.emailLower || '').trim().toLowerCase() === normalizedUserEmail) ||
      players.find(p => (p.email || '').trim().toLowerCase() === normalizedUserEmail) ||
      null
    );
  }, [players, user?.uid, normalizedUserEmail]);

  useEffect(() => {
    if (!linkedPlayer) return;
    setLevel(String(typeof linkedPlayer.level === 'number' ? linkedPlayer.level : 0));
    setNotes(String(linkedPlayer.notes || ''));
  }, [linkedPlayer?.id]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      console.error('Error logging out:', e);
    }
  };

  const handleGoHome = () => {
    navigate('/proximas');
  };

  const handleSave = async () => {
    if (!linkedPlayer?.id) return;
    setSaving(true);
    setError('');
    try {
      const parsed = parseFloat(String(level).replace(',', '.'));
      const levelNumber = Number.isFinite(parsed) ? parsed : 0;
      await updatePlayer(linkedPlayer.id, {
        level: levelNumber,
        notes: String(notes || '').trim(),
      });
    } catch (e) {
      console.error('Error updating player profile:', e);
      setError('No se pudo guardar tu perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (playersLoading) {
    return (
      <div className="public-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      <header className="public-header">
        <h1>👤 Mi perfil</h1>
        <p>Actualiza tu handicap y descripción</p>

        <div className="public-user-info">
          <span className="user-email-badge">{user.email}</span>

          <div className="public-nav-icons">
            <button
              type="button"
              className="public-icon-btn"
              onClick={handleGoHome}
              aria-label="Ir al inicio"
              title="Inicio"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 3.172 2.636 10.3a1 1 0 0 0-.2 1.4 1 1 0 0 0 1.4.2L5 11.06V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-5h2v5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-8.94l1.164.84a1 1 0 1 0 1.2-1.6L12 3.172Z"
                />
              </svg>
            </button>
          </div>

          <button onClick={handleLogout} className="btn btn-sm btn-logout">
            Cerrar sesión
          </button>
        </div>
      </header>

      {!linkedPlayer ? (
        <div className="player-selector-container">
          <label>Jugador</label>
          <div className="player-selector">{user.email}</div>
          <p className="rsvp-hint">
            Tu usuario no está vinculado a un jugador. Pide al admin que agregue tu email en “Jugadores”.
          </p>
        </div>
      ) : (
        <div className="player-selector-container">
          <label>Mi perfil</label>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="profile-handicap">Handicap</label>
            <input
              type="number"
              id="profile-handicap"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              min={-2}
              max={10}
              step={0.5}
            />
          </div>

          <div className="form-group">
            <label htmlFor="profile-notes">Descripción (opcional)</label>
            <textarea
              id="profile-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <button className="btn btn-primary" onClick={handleSave} disabled={saving} type="button">
            {saving ? 'Guardando...' : 'Guardar perfil'}
          </button>
        </div>
      )}
    </div>
  );
}
