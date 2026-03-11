import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { usePractices, usePlayers, updatePractice } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';

const TEAM_COLORS = {
  A: { bg: '#3b6df6ff', name: 'Equipo Azul' },
  B: { bg: '#dc2626ff', name: 'Equipo Rojo' }
};

const USER_VISIBLE_STATUSES = ['planned', 'in-progress', 'cancelled-weather'];

export default function PublicPractices() {
  const { practices, loading: practicesLoading } = usePractices();
  const { players, loading: playersLoading } = usePlayers();
  const { user, logout, isAdmin, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const practiceIdFromLink = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('practice') || '';
  }, [location.search]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [savingPracticeId, setSavingPracticeId] = useState(null);

  const loading = authLoading || practicesLoading || playersLoading;

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
  const effectivePlayerId = isAdmin ? selectedPlayer : (linkedPlayer?.id || '');

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleGoHome = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoProfile = () => {
    navigate('/perfil');
  };

  // Show upcoming practices, including weather-cancelled ones, so players are informed.
  const upcomingPractices = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const filtered = practices
      .filter(p => USER_VISIBLE_STATUSES.includes(p.status))
      .filter(p => p.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (practiceIdFromLink) {
      return filtered.filter(p => p.id === practiceIdFromLink);
    }

    return filtered;
  }, [practices, practiceIdFromLink]);

  const getPlayer = (playerId) => players.find(p => p.id === playerId);

  const isPlayerConfirmed = (practice, playerId) => {
    return practice.confirmedPlayers?.includes(playerId);
  };

  const handleConfirmAttendance = async (practice) => {
    if (!effectivePlayerId) {
      alert(
        isAdmin
          ? 'Por favor selecciona un jugador'
          : 'Tu usuario no está vinculado a un jugador. Pide al admin que agregue tu email en Jugadores.'
      );
      return;
    }

    setSavingPracticeId(practice.id);
    try {
      const currentConfirmed = practice.confirmedPlayers || [];
      const isAlreadyConfirmed = currentConfirmed.includes(effectivePlayerId);
      
      let newConfirmed;
      if (isAlreadyConfirmed) {
        // Remove player
        newConfirmed = currentConfirmed.filter(id => id !== effectivePlayerId);
      } else {
        // Add player
        newConfirmed = [...currentConfirmed, effectivePlayerId];
      }

      await updatePractice(practice.id, { confirmedPlayers: newConfirmed });
    } catch (err) {
      console.error('Error updating attendance:', err);
      alert('Error al actualizar asistencia');
    } finally {
      setSavingPracticeId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="public-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando prácticas...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return (
    <div className="public-page">
      <header className="public-header">
        <h1>🏇 Próximas Prácticas</h1>
        <p>Confirma tu asistencia a las prácticas</p>
        
        {/* User session info */}
        {user && (
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

              <button
                type="button"
                className="public-icon-btn"
                onClick={handleGoProfile}
                aria-label="Ir a mi perfil"
                title="Mi perfil"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.505 4.505 0 0 0 12 12Zm0-7a2.5 2.5 0 1 1-2.5 2.5A2.503 2.503 0 0 1 12 5Zm0 9c-4.411 0-8 2.243-8 5a1 1 0 0 0 2 0c0-1.347 2.655-3 6-3s6 1.653 6 3a1 1 0 0 0 2 0c0-2.757-3.589-5-8-5Z"
                  />
                </svg>
              </button>
            </div>

            <button onClick={handleLogout} className="btn btn-sm btn-logout">
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      {/* Player selector (admin only). Non-admin users are auto-linked by email. */}
      {isAdmin ? (
        <div className="player-selector-container">
          <label htmlFor="player-select">¿Quién eres?</label>
          <select 
            id="player-select"
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="player-selector"
          >
            <option value="">-- Selecciona un jugador --</option>
            {players.map(player => (
              <option key={player.id} value={player.id}>
                {player.name} ({player.level} HCP)
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="player-selector-container">
          <label>Jugador</label>
          <div className="player-selector">
            {linkedPlayer ? `${linkedPlayer.name} (${linkedPlayer.level} HCP)` : user.email}
          </div>
          {!linkedPlayer && (
            <p className="rsvp-hint">
              Pide al admin que agregue tu email en “Jugadores” para vincular tu cuenta.
            </p>
          )}
        </div>
      )}

      {upcomingPractices.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📅</span>
          <h3>No hay prácticas programadas</h3>
          <p>Las próximas prácticas aparecerán aquí</p>
        </div>
      ) : (
        <div className="public-practices-list">
          {upcomingPractices.map(practice => {
            const confirmedPlayers = practice.confirmedPlayers || [];
            const confirmedPlayersData = confirmedPlayers.map(id => getPlayer(id)).filter(Boolean);
            const isCurrentPlayerConfirmed = effectivePlayerId && isPlayerConfirmed(practice, effectivePlayerId);
            const isSaving = savingPracticeId === practice.id;
            const isCancelledForWeather = practice.status === 'cancelled-weather';

            // Get team assignments
            const teams = practice.teams || { A: [], B: [] };
            const teamAPlayers = teams.A?.map(id => getPlayer(id)).filter(Boolean) || [];
            const teamBPlayers = teams.B?.map(id => getPlayer(id)).filter(Boolean) || [];

            return (
              <div
                key={practice.id}
                className={`public-practice-card${isCancelledForWeather ? ' is-cancelled' : ''}`}
              >
                <div className="public-practice-header">
                  <div className="public-practice-info">
                    <h3>{practice.name || 'Práctica'}</h3>
                    <span className="public-practice-date">📅 {formatDate(practice.date)}</span>
                  </div>
                  <div className="public-practice-meta">
                    {isCancelledForWeather && (
                      <span className="public-status public-status-cancelled">
                        Cancelada por clima
                      </span>
                    )}
                    <span className={`confirmed-count${isCancelledForWeather ? ' confirmed-count-muted' : ''}`}>
                      ✓ {confirmedPlayers.length} confirmado{confirmedPlayers.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Teams if assigned */}
                {(teamAPlayers.length > 0 || teamBPlayers.length > 0) && (
                  <div className="public-teams">
                    <h4>Equipos Asignados</h4>
                    <div className="public-teams-grid">
                      {teamAPlayers.length > 0 && (
                        <div className="public-team">
                          <div className="public-team-header" style={{ borderColor: TEAM_COLORS.A.bg }}>
                            <span className="team-dot" style={{ background: TEAM_COLORS.A.bg }}></span>
                            {TEAM_COLORS.A.name}
                          </div>
                          <ul>
                            {teamAPlayers.map(p => (
                              <li key={p.id}>{p.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {teamBPlayers.length > 0 && (
                        <div className="public-team">
                          <div className="public-team-header" style={{ borderColor: TEAM_COLORS.B.bg }}>
                            <span className="team-dot" style={{ background: TEAM_COLORS.B.bg }}></span>
                            {TEAM_COLORS.B.name}
                          </div>
                          <ul>
                            {teamBPlayers.map(p => (
                              <li key={p.id}>{p.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Confirmed players list */}
                {confirmedPlayersData.length > 0 && (
                  <div className="confirmed-players">
                    <h4>Jugadores Confirmados</h4>
                    <div className="confirmed-chips">
                      {confirmedPlayersData.map(player => (
                        <span key={player.id} className="confirmed-chip">
                          {player.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* RSVP button */}
                <div className="rsvp-section">
                  {isCancelledForWeather ? (
                    <p className="rsvp-hint rsvp-hint-cancelled">
                      Esta práctica fue cancelada por mal clima.
                    </p>
                  ) : effectivePlayerId ? (
                    <button 
                      className={`btn btn-rsvp ${isCurrentPlayerConfirmed ? 'confirmed' : ''}`}
                      onClick={() => handleConfirmAttendance(practice)}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Guardando...' : 
                       isCurrentPlayerConfirmed ? '✓ Confirmado - Cancelar' : 
                       'Confirmar Asistencia'}
                    </button>
                  ) : (
                    <p className="rsvp-hint">
                      {isAdmin
                        ? 'Selecciona un jugador arriba para confirmar asistencia'
                        : 'Tu cuenta no está vinculada a un jugador'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <footer className="public-footer">
        <p>Polo Planner</p>
        {isAdmin && (
          <Link to="/practices" className="admin-link">🔐 Administrar</Link>
        )}
      </footer>
    </div>
  );
}
