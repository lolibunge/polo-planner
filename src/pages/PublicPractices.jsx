import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePractices, usePlayers, updatePractice } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';

const TEAM_COLORS = {
  A: { bg: '#3b6df6ff', name: 'Equipo Azul' },
  B: { bg: '#dc2626ff', name: 'Equipo Rojo' }
};

export default function PublicPractices() {
  const { practices, loading: practicesLoading } = usePractices();
  const { players, loading: playersLoading } = usePlayers();
  const { user, logout, isAdmin } = useAuth();
    if (!user) {
      return (
        <div className="public-practices-login">
          <h2>Próximas Prácticas</h2>
          <p>Debes iniciar sesión para ver las prácticas.</p>
          <Link to="/login" className="btn btn-primary">Iniciar sesión</Link>
        </div>
      );
    }
  const navigate = useNavigate();
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [savingPracticeId, setSavingPracticeId] = useState(null);

  const loading = practicesLoading || playersLoading;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Only show upcoming practices (planned or in-progress)
  const upcomingPractices = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return practices
      .filter(p => p.status === 'planned' || p.status === 'in-progress')
      .filter(p => p.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [practices]);

  const getPlayer = (playerId) => players.find(p => p.id === playerId);

  const isPlayerConfirmed = (practice, playerId) => {
    return practice.confirmedPlayers?.includes(playerId);
  };

  const handleConfirmAttendance = async (practice) => {
    if (!selectedPlayer) {
      alert('Por favor selecciona tu nombre');
      return;
    }

    setSavingPracticeId(practice.id);
    try {
      const currentConfirmed = practice.confirmedPlayers || [];
      const isAlreadyConfirmed = currentConfirmed.includes(selectedPlayer);
      
      let newConfirmed;
      if (isAlreadyConfirmed) {
        // Remove player
        newConfirmed = currentConfirmed.filter(id => id !== selectedPlayer);
      } else {
        // Add player
        newConfirmed = [...currentConfirmed, selectedPlayer];
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

  return (
    <div className="public-page">
      <header className="public-header">
        <h1>🏇 Próximas Prácticas</h1>
        <p>Confirma tu asistencia a las prácticas</p>
        
        {/* User session info */}
        {user && (
          <div className="public-user-info">
            <span className="user-email-badge">{user.email}</span>
            <button onClick={handleLogout} className="btn btn-sm btn-logout">
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      {/* Player selector */}
      <div className="player-selector-container">
        <label htmlFor="player-select">¿Quién eres?</label>
        <select 
          id="player-select"
          value={selectedPlayer}
          onChange={(e) => setSelectedPlayer(e.target.value)}
          className="player-selector"
        >
          <option value="">-- Selecciona tu nombre --</option>
          {players.map(player => (
            <option key={player.id} value={player.id}>
              {player.name} ({player.level} HCP)
            </option>
          ))}
        </select>
      </div>

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
            const isCurrentPlayerConfirmed = selectedPlayer && isPlayerConfirmed(practice, selectedPlayer);
            const isSaving = savingPracticeId === practice.id;

            // Get team assignments
            const teams = practice.teams || { A: [], B: [] };
            const teamAPlayers = teams.A?.map(id => getPlayer(id)).filter(Boolean) || [];
            const teamBPlayers = teams.B?.map(id => getPlayer(id)).filter(Boolean) || [];

            return (
              <div key={practice.id} className="public-practice-card">
                <div className="public-practice-header">
                  <div className="public-practice-info">
                    <h3>{practice.name || 'Práctica'}</h3>
                    <span className="public-practice-date">📅 {formatDate(practice.date)}</span>
                  </div>
                  <span className="confirmed-count">
                    ✓ {confirmedPlayers.length} confirmado{confirmedPlayers.length !== 1 ? 's' : ''}
                  </span>
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
                  {selectedPlayer ? (
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
                    <p className="rsvp-hint">Selecciona tu nombre arriba para confirmar asistencia</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <footer className="public-footer">
        <p>Polo Planner</p>
        {isAdmin ? (
          <Link to="/practices" className="admin-link">🔐 Administrar</Link>
        ) : !user ? (
          <Link to="/login" className="admin-link">🔐 Iniciar sesión</Link>
        ) : null}
      </footer>
    </div>
  );
}
