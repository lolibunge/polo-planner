import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  usePractice, 
  useHorses,
  usePlayers,
  updatePractice,
  completePractice
} from '../hooks/useFirestore';

const STATUS_COLORS = {
  'planned': '#3b82f6',
  'in-progress': '#f59e0b', 
  'completed': '#22c55e'
};

const STATUS_LABELS = {
  'planned': 'Próximas',
  'in-progress': 'En Progreso',
  'completed': 'Completada'
};

const TEAM_COLORS = {
  A: { bg: '#3b6df6ff', name: 'Equipo Azul' },
  B: { bg: '#dc2626ff', name: 'Equipo Rojo' }
};

export default function PracticeDetail() {
    const { isAdmin } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { practice, loading: practiceLoading, error: practiceError } = usePractice(id);
  const { horses, loading: horsesLoading } = useHorses();
  const { players, loading: playersLoading } = usePlayers();
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const loading = practiceLoading || horsesLoading || playersLoading;

  // Available horses (status = available)
  const availableHorses = useMemo(() => 
    horses.filter(h => h.status === 'available'),
    [horses]
  );

  // Get horse/player by ID
  const getHorse = (horseId) => horses.find(h => h.id === horseId);
  const getPlayer = (playerId) => players.find(p => p.id === playerId);

  // Team helpers
  const teams = practice?.teams || { A: [], B: [] };
  const teamAPlayers = teams.A?.map(id => getPlayer(id)).filter(Boolean) || [];
  const teamBPlayers = teams.B?.map(id => getPlayer(id)).filter(Boolean) || [];
  const allSelectedPlayerIds = [...(teams.A || []), ...(teams.B || [])];

  // Calculate team handicaps
  const teamAHandicap = teamAPlayers.reduce((sum, p) => sum + (p.level || 0), 0);
  const teamBHandicap = teamBPlayers.reduce((sum, p) => sum + (p.level || 0), 0);
  const handicapDiff = Math.abs(teamAHandicap - teamBHandicap);

  // Count how many chukkers each horse is assigned to in this practice
  const horseUsageCount = useMemo(() => {
    if (!practice?.chukkers) return {};
    const counts = {};
    practice.chukkers.forEach(chukker => {
      chukker.assignments?.forEach(a => {
        if (a.horseId) {
          counts[a.horseId] = (counts[a.horseId] || 0) + 1;
        }
      });
    });
    return counts;
  }, [practice?.chukkers]);

  // Calculate running score
  const totalScore = useMemo(() => {
    if (!practice?.chukkers) return { A: 0, B: 0 };
    return practice.chukkers.reduce((acc, chukker) => ({
      A: acc.A + (chukker.scoreA || 0),
      B: acc.B + (chukker.scoreB || 0)
    }), { A: 0, B: 0 });
  }, [practice?.chukkers]);

  const handleAssignToTeam = async (playerId, team) => {
    const currentTeams = practice.teams || { A: [], B: [] };
    const newTeams = {
      A: currentTeams.A?.filter(id => id !== playerId) || [],
      B: currentTeams.B?.filter(id => id !== playerId) || []
    };
    
    if (team) {
      newTeams[team].push(playerId);
    }

    // Also update chukkers to remove player if removed from teams
    let newChukkers = practice.chukkers;
    if (!team) {
      newChukkers = practice.chukkers.map(chukker => ({
        ...chukker,
        assignments: chukker.assignments?.filter(a => a.playerId !== playerId) || []
      }));
    }

    try {
      await updatePractice(id, { teams: newTeams, chukkers: newChukkers });
    } catch (err) {
      console.error('Error updating teams:', err);
    }
  };

  const handleMovePlayer = async (playerId, fromTeam, toTeam) => {
    const currentTeams = practice.teams || { A: [], B: [] };
    const newTeams = {
      A: [...(currentTeams.A || [])],
      B: [...(currentTeams.B || [])]
    };
    
    // Remove from current team
    newTeams[fromTeam] = newTeams[fromTeam].filter(id => id !== playerId);
    // Add to new team
    newTeams[toTeam].push(playerId);

    try {
      await updatePractice(id, { teams: newTeams });
    } catch (err) {
      console.error('Error moving player:', err);
    }
  };

  const handleAssignHorse = async (chukkerIndex, playerId, horseId) => {
    const newChukkers = [...practice.chukkers];
    const chukker = newChukkers[chukkerIndex];
    
    const existingIndex = chukker.assignments?.findIndex(a => a.playerId === playerId);
    
    if (existingIndex >= 0) {
      if (horseId) {
        chukker.assignments[existingIndex].horseId = horseId;
      } else {
        chukker.assignments.splice(existingIndex, 1);
      }
    } else if (horseId) {
      chukker.assignments = chukker.assignments || [];
      chukker.assignments.push({ playerId, horseId });
    }

    try {
      await updatePractice(id, { chukkers: newChukkers });
    } catch (err) {
      console.error('Error assigning horse:', err);
    }
  };

  const handleStartPractice = async () => {
    try {
      await updatePractice(id, { status: 'in-progress' });
    } catch (err) {
      console.error('Error starting practice:', err);
    }
  };

  const handleCompletePractice = async () => {
    if (!confirm('¿Completar esta práctica? Esto registrará la carga de trabajo de todos los caballos asignados.')) return;
    
    setSaving(true);
    try {
      await completePractice(id, practice);
      navigate('/practices');
    } catch (err) {
      console.error('Error completing practice:', err);
      alert('Error al completar la práctica');
    } finally {
      setSaving(false);
    }
  };

  const handleAddChukker = async () => {
    const newChukkers = [
      ...practice.chukkers,
      { number: practice.chukkers.length + 1, assignments: [] }
    ];
    try {
      await updatePractice(id, { chukkers: newChukkers });
    } catch (err) {
      console.error('Error adding chukker:', err);
    }
  };

  const handleRemoveChukker = async (index) => {
    if (practice.chukkers.length <= 1) return;
    const newChukkers = practice.chukkers.filter((_, i) => i !== index)
      .map((c, i) => ({ ...c, number: i + 1 }));
    try {
      await updatePractice(id, { chukkers: newChukkers });
    } catch (err) {
      console.error('Error removing chukker:', err);
    }
  };

  const handleUpdateScore = async (chukkerIndex, team, value) => {
    const score = parseInt(value) || 0;
    const newChukkers = [...practice.chukkers];
    if (team === 'A') {
      newChukkers[chukkerIndex].scoreA = score;
    } else {
      newChukkers[chukkerIndex].scoreB = score;
    }
    try {
      await updatePractice(id, { chukkers: newChukkers });
    } catch (err) {
      console.error('Error updating score:', err);
    }
  };

  const generateWhatsAppMessage = () => {
    const lines = [];
    
    // Header
    lines.push(`🏇 *${practice.name || 'Práctica'}*`);
    lines.push(`📅 ${formatDate(practice.date)}`);
    lines.push('');
    
    // Teams
    if (teamAPlayers.length > 0 || teamBPlayers.length > 0) {
      lines.push('*EQUIPOS*');
      lines.push('');
      
      if (teamAPlayers.length > 0) {
        lines.push(`🔵 *Equipo Azul* (${teamAHandicap} HCP)`);
        teamAPlayers.forEach(p => {
          lines.push(`   • ${p.name} (${p.level} HCP)`);
        });
        lines.push('');
      }
      
      if (teamBPlayers.length > 0) {
        lines.push(`🔴 *Equipo Rojo* (${teamBHandicap} HCP)`);
        teamBPlayers.forEach(p => {
          lines.push(`   • ${p.name} (${p.level} HCP)`);
        });
        lines.push('');
      }
    }
    
    // Horse assignments per chukker
    if (practice.chukkers?.length > 0 && allSelectedPlayerIds.length > 0) {
      lines.push('*ASIGNACIÓN DE CABALLOS*');
      lines.push('');
      
      practice.chukkers.forEach(chukker => {
        lines.push(`*Chukker ${chukker.number}*`);
        
        // Blue team assignments
        teamAPlayers.forEach(player => {
          const assignment = chukker.assignments?.find(a => a.playerId === player.id);
          const horse = assignment ? getHorse(assignment.horseId) : null;
          lines.push(`🔵 ${player.name}: ${horse?.name || 'Por asignar'}`);
        });
        
        // Red team assignments
        teamBPlayers.forEach(player => {
          const assignment = chukker.assignments?.find(a => a.playerId === player.id);
          const horse = assignment ? getHorse(assignment.horseId) : null;
          lines.push(`🔴 ${player.name}: ${horse?.name || 'Por asignar'}`);
        });
        
        lines.push('');
      });
    }
    
    // Score if practice has started
    if (practice.status === 'in-progress' || practice.status === 'completed') {
      lines.push('*MARCADOR*');
      lines.push(`🔵 Azul ${totalScore.A} - ${totalScore.B} Rojo 🔴`);
      
      if (practice.status === 'completed') {
        const winner = totalScore.A > totalScore.B ? 'Equipo Azul 🔵' : 
                       totalScore.B > totalScore.A ? 'Equipo Rojo 🔴' : 'Empate';
        lines.push(`🏆 Ganador: ${winner}`);
      }
    }
    
    return lines.join('\n');
  };

  const handleShareWhatsApp = () => {
    const message = generateWhatsAppMessage();
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando práctica...</p>
      </div>
    );
  }

  if (practiceError || !practice) {
    return (
      <div className="error-container">
        <h3>Práctica no encontrada</h3>
        <Link to="/practices" className="btn btn-primary">Volver a Prácticas</Link>
      </div>
    );
  }

  const isEditable = true; // Allow editing even for completed practices
  // Players who RSVP'd (confirmed attendance)
  const confirmedPlayerIds = practice?.confirmedPlayers || [];
  const unassignedPlayers = players.filter(p => !allSelectedPlayerIds.includes(p.id));

  const handleToggleConfirmPlayer = async (playerId) => {
    if (!isAdmin) return;
    const currentConfirmed = practice?.confirmedPlayers || [];
    const isConfirmed = currentConfirmed.includes(playerId);

    try {
      await updatePractice(practice.id, {
        confirmedPlayers: isConfirmed
          ? currentConfirmed.filter(id => id !== playerId)
          : Array.from(new Set([...currentConfirmed, playerId]))
      });
    } catch (err) {
      console.error('Error toggling RSVP:', err);
      alert('Error al actualizar confirmación.');
    }
  };

  return (
    <div className="practice-detail-page">
      <div className="page-header">
        <div className="breadcrumb">
          <Link to="/practices">← Prácticas</Link>
        </div>
      </div>

      <div className="practice-detail-header">
        <div className="practice-title">
          <h2>{practice.name || 'Práctica sin nombre'}</h2>
          {isAdmin && (
            <button className="btn-icon btn-edit" onClick={() => setShowEditModal(true)} title="Editar práctica">
              ✏️
            </button>
          )}
          <span className="practice-date-badge">{formatDate(practice.date)}</span>
          <span 
            className="status-badge status-badge-lg"
            style={{ backgroundColor: STATUS_COLORS[practice.status] }}
          >
            {STATUS_LABELS[practice.status]}
          </span>
        </div>
        
        <div className="practice-actions">
          <button className="btn btn-whatsapp" onClick={handleShareWhatsApp}>
            📱 Compartir en WhatsApp
          </button>
          {isAdmin && practice.status === 'planned' && (
            <button className="btn btn-warning" onClick={handleStartPractice}>
              ▶ Iniciar Práctica
            </button>
          )}
          {isAdmin && practice.status === 'in-progress' && (
            <button 
              className="btn btn-success" 
              onClick={handleCompletePractice}
              disabled={saving}
            >
              {saving ? 'Completando...' : '✓ Completar Práctica'}
            </button>
          )}
        </div>
      </div>

      {/* Edit Practice Modal */}
      {isAdmin && showEditModal && (
        <EditPracticeModal 
          practice={practice}
          practiceId={id}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Score Display */}
      {(practice.status === 'in-progress' || practice.status === 'completed') && (
        <div className="score-display">
          <div className="score-team score-team-a">
            <span className="score-team-name" style={{ color: TEAM_COLORS.A.bg }}>Equipo Azul</span>
            <span className="score-value">{totalScore.A}</span>
          </div>
          <div className="score-vs">—</div>
          <div className="score-team score-team-b">
            <span className="score-value">{totalScore.B}</span>
            <span className="score-team-name" style={{ color: TEAM_COLORS.B.bg }}>Equipo Rojo</span>
          </div>
        </div>
      )}

      {/* Team Builder */}
      <div className="practice-section">
        <h3>Equipos</h3>
        {isAdmin && (
          <p className="section-hint">Cliquear botones para asignar jugadores a los equipos</p>
        )}
        
        <div className="teams-container">
          {/* Team A */}
          <div className="team-panel team-a">
            <div className="team-header" style={{ borderColor: TEAM_COLORS.A.bg }}>
              <span className="team-color" style={{ background: TEAM_COLORS.A.bg }}></span>
              <h4>{TEAM_COLORS.A.name}</h4>
              <span className="team-handicap">{teamAHandicap} HCP</span>
            </div>
            <div className="team-players">
              {teamAPlayers.length === 0 ? (
                <p className="team-empty">Jugadores no asignados</p>
              ) : (
                teamAPlayers.map(player => (
                  <div key={player.id} className="team-player">
                    <span className="player-avatar" style={{ background: TEAM_COLORS.A.bg }}>
                      {player.name.charAt(0)}
                    </span>
                    <div className="player-info">
                      <button
                        type="button"
                        className={`player-name player-name-btn${confirmedPlayerIds.includes(player.id) ? ' confirmed-player-name' : ''}`}
                        title={confirmedPlayerIds.includes(player.id) ? 'Quitar confirmación (RSVP)' : 'Marcar como confirmado (RSVP)'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleConfirmPlayer(player.id);
                        }}
                        aria-pressed={confirmedPlayerIds.includes(player.id)}
                      >
                        {player.name}
                        {confirmedPlayerIds.includes(player.id) && (
                          <span className="confirmed-badge" title="Confirmado (RSVP)"> ✔</span>
                        )}
                      </button>
                      <span className="player-level">{player.level} HCP</span>
                    </div>
                    {isAdmin && (
                      <div className="player-actions">
                        <button 
                          className="btn-move"
                          onClick={() => handleMovePlayer(player.id, 'A', 'B')}
                          title="Move to Red Team"
                        >
                          →
                        </button>
                        <button 
                          className="btn-remove"
                          onClick={() => handleAssignToTeam(player.id, null)}
                          title="Remove from team"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* VS */}
          <div className="teams-vs">
            <span>VS</span>
            {handicapDiff > 0 && (
              <span className={`handicap-diff ${handicapDiff > 2 ? 'unbalanced' : ''}`}>
                Δ {handicapDiff}
              </span>
            )}
          </div>

          {/* Team B */}
          <div className="team-panel team-b">
            <div className="team-header" style={{ borderColor: TEAM_COLORS.B.bg }}>
              <span className="team-color" style={{ background: TEAM_COLORS.B.bg }}></span>
              <h4>{TEAM_COLORS.B.name}</h4>
              <span className="team-handicap">{teamBHandicap} HCP</span>
            </div>
            <div className="team-players">
              {teamBPlayers.length === 0 ? (
                <p className="team-empty">Jugadores no asignados</p>
              ) : (
                teamBPlayers.map(player => (
                  <div key={player.id} className="team-player">
                    <span className="player-avatar" style={{ background: TEAM_COLORS.B.bg }}>
                      {player.name.charAt(0)}
                    </span>
                    <div className="player-info">
                      <button
                        type="button"
                        className={`player-name player-name-btn${confirmedPlayerIds.includes(player.id) ? ' confirmed-player-name' : ''}`}
                        title={confirmedPlayerIds.includes(player.id) ? 'Quitar confirmación (RSVP)' : 'Marcar como confirmado (RSVP)'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleConfirmPlayer(player.id);
                        }}
                        aria-pressed={confirmedPlayerIds.includes(player.id)}
                      >
                        {player.name}
                        {confirmedPlayerIds.includes(player.id) && (
                          <span className="confirmed-badge" title="Confirmado (RSVP)"> ✔</span>
                        )}
                      </button>
                      <span className="player-level">{player.level} HCP</span>
                    </div>
                    {isAdmin && (
                      <div className="player-actions">
                        <button 
                          className="btn-move"
                          onClick={() => handleMovePlayer(player.id, 'B', 'A')}
                          title="Move to Blue Team"
                        >
                          ←
                        </button>
                        <button 
                          className="btn-remove"
                          onClick={() => handleAssignToTeam(player.id, null)}
                          title="Remove from team"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Unassigned Players */}
        {isAdmin && unassignedPlayers.length > 0 && (
          <div className="unassigned-players">
            <h5>Jugadores Disponibles</h5>
            {/* Bulk add confirmed players button */}
            {confirmedPlayerIds.length > 0 && (
              <button
                className="btn btn-sm btn-primary"
                style={{ marginBottom: 12 }}
                onClick={async () => {
                  // Get current teams and already assigned players
                  const currentTeams = practice.teams || { A: [], B: [] };
                  const alreadyAssigned = [...(currentTeams.A || []), ...(currentTeams.B || [])];
                  // Get confirmed players not already assigned
                  const toAdd = confirmedPlayerIds.filter(pid => !alreadyAssigned.includes(pid));
                  if (toAdd.length === 0) {
                    alert('Todos los jugadores confirmados ya están asignados a un equipo.');
                    return;
                  }
                  // Get player objects for those to add
                  const confirmedPlayers = players.filter(p => toAdd.includes(p.id));
                  // Sort by handicap descending for better balance
                  confirmedPlayers.sort((a, b) => (b.level || 0) - (a.level || 0));
                  // Start with current teams
                  let teamA = [...(currentTeams.A || [])];
                  let teamB = [...(currentTeams.B || [])];
                  let sumA = teamA.map(pid => (players.find(p => p.id === pid)?.level || 0)).reduce((a, b) => a + b, 0);
                  let sumB = teamB.map(pid => (players.find(p => p.id === pid)?.level || 0)).reduce((a, b) => a + b, 0);
                  // Greedy assign: always add next player to team with lower total handicap
                  confirmedPlayers.forEach(player => {
                    if (sumA <= sumB) {
                      teamA.push(player.id);
                      sumA += player.level || 0;
                    } else {
                      teamB.push(player.id);
                      sumB += player.level || 0;
                    }
                  });
                  // Update teams in Firestore
                  try {
                    await updatePractice(practice.id, { teams: { A: teamA, B: teamB } });
                    alert('Jugadores confirmados asignados automáticamente a los equipos balanceando el hándicap.');
                  } catch (err) {
                    alert('Error al asignar equipos automáticamente.');
                  }
                }}
              >
                Añadir todos los confirmados
              </button>
            )}
            <div className="player-chips">
              {unassignedPlayers.map(player => {
                const isConfirmed = confirmedPlayerIds.includes(player.id);
                return (
                  <div
                    key={player.id}
                    className={`unassigned-player${isConfirmed ? ' confirmed-player' : ''}`.trim()}
                    onClick={() => handleAssignToTeam(player.id, 'A')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleAssignToTeam(player.id, 'A');
                      }
                    }}
                  >
                    <button
                      type="button"
                      className={`player-name player-name-btn${isConfirmed ? ' confirmed-player-name' : ''}`}
                      title={isConfirmed ? 'Quitar confirmación (RSVP)' : 'Marcar como confirmado (RSVP)'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleConfirmPlayer(player.id);
                      }}
                      aria-pressed={isConfirmed}
                    >
                      {player.name}
                      {isConfirmed && (
                        <span className="confirmed-badge" title="Confirmado (RSVP)"> ✔</span>
                      )}
                    </button>
                    <span className="player-level">{player.level} HCP</span>
                  </div>
                );
              })}
            </div>
            <style>{`
              .confirmed-player .player-name {
                font-weight: bold;
                color: #22c55e;
              }
              .confirmed-badge {
                margin-left: 4px;
                color: #22c55e;
                font-size: 1.1em;
                vertical-align: middle;
              }
              .player-name-btn {
                background: transparent;
                border: 0;
                padding: 0;
                color: inherit;
                cursor: pointer;
                text-align: left;
              }
              .player-name-btn:hover {
                text-decoration: underline;
              }
              .confirmed-player-name {
                font-weight: bold;
                color: #22c55e;
              }
            `}</style>
          </div>
        )}
      </div>

      {/* Chukkers & Horse Assignments */}
      <div className="practice-section">
        <div className="section-header">
          <h3>Chukkers ({practice.chukkers?.length || 0})</h3>
          {isAdmin && (
            <button className="btn btn-secondary btn-sm" onClick={handleAddChukker}>
              + Agregar Chukker
            </button>
          )}
        </div>

        {allSelectedPlayerIds.length === 0 ? (
          <div className="empty-state empty-state-sm">
            <p>Asignar jugadores a los equipos arriba para asignar caballos</p>
          </div>
        ) : (
          <div className="chukkers-grid">
            {practice.chukkers?.map((chukker, chukkerIndex) => (
              <div key={chukker.number} className="chukker-card">
                <div className="chukker-header">
                  <h4>Chukker {chukker.number}</h4>
                  {isAdmin && practice.chukkers.length > 1 && (
                    <button 
                      className="btn-icon" 
                      onClick={() => handleRemoveChukker(chukkerIndex)}
                      title="Remove chukker"
                    >
                      ×
                    </button>
                  )}
                </div>
                
                {/* Score inputs for this chukker */}
                {(practice.status === 'in-progress' || practice.status === 'completed') && (
                  <div className="chukker-score">
                    <div className="chukker-score-team">
                      <span className="score-label" style={{ color: TEAM_COLORS.A.bg }}>Azul</span>
                      <input
                        type="number"
                        min="0"
                        value={chukker.scoreA || 0}
                        onChange={(e) => handleUpdateScore(chukkerIndex, 'A', e.target.value)}
                        className="score-input score-input-a"
                        disabled={!isAdmin}
                      />
                    </div>
                    <span className="chukker-score-divider">:</span>
                    <div className="chukker-score-team">
                      <input
                        type="number"
                        min="0"
                        value={chukker.scoreB || 0}
                        onChange={(e) => handleUpdateScore(chukkerIndex, 'B', e.target.value)}
                        className="score-input score-input-b"
                        disabled={!isAdmin}
                      />
                      <span className="score-label" style={{ color: TEAM_COLORS.B.bg }}>Rojo</span>
                    </div>
                  </div>
                )}
                
                {/* Team A assignments */}
                {teamAPlayers.length > 0 && (
                  <div className="chukker-team">
                    <div className="chukker-team-label" style={{ color: TEAM_COLORS.A.bg }}>
                      Equipo Azul
                    </div>
                    {teamAPlayers.map(player => (
                      <AssignmentRow
                        key={player.id}
                        player={player}
                        chukker={chukker}
                        chukkerIndex={chukkerIndex}
                        availableHorses={availableHorses}
                        horseUsageCount={horseUsageCount}
                        getHorse={getHorse}
                        isEditable={isAdmin}
                        onAssign={handleAssignHorse}
                        teamColor={TEAM_COLORS.A.bg}
                      />
                    ))}
                  </div>
                )}

                {/* Team B assignments */}
                {teamBPlayers.length > 0 && (
                  <div className="chukker-team">
                    <div className="chukker-team-label" style={{ color: TEAM_COLORS.B.bg }}>
                      Equipo Rojo
                    </div>
                    {teamBPlayers.map(player => (
                      <AssignmentRow
                        key={player.id}
                        player={player}
                        chukker={chukker}
                        chukkerIndex={chukkerIndex}
                        availableHorses={availableHorses}
                        horseUsageCount={horseUsageCount}
                        getHorse={getHorse}
                        isEditable={isAdmin}
                        onAssign={handleAssignHorse}
                        teamColor={TEAM_COLORS.B.bg}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Horse Summary */}
      {Object.keys(horseUsageCount).length > 0 && (
        <div className="practice-section">
          <h3>Resumen de Caballos</h3>
          <div className="horse-summary">
            {Object.entries(horseUsageCount).map(([horseId, count]) => {
              const horse = getHorse(horseId);
              if (!horse) return null;
              const isOver = count > horse.maxChukkersPerDay;
              return (
                <div key={horseId} className={`horse-summary-item ${isOver ? 'over-limit' : ''}`}>
                  <span className="horse-name">{horse.name}</span>
                  <span className="horse-usage">
                    {count} / {horse.maxChukkersPerDay} chukkers
                    {isOver && ' ⚠️'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AssignmentRow({ player, chukker, chukkerIndex, availableHorses, horseUsageCount, getHorse, isEditable, onAssign, teamColor }) {
  const assignment = chukker.assignments?.find(a => a.playerId === player.id);
  const assignedHorse = assignment ? getHorse(assignment.horseId) : null;
  
  return (
    <div className="assignment-row">
      <span className="assignment-player">
        <span className="player-dot" style={{ background: teamColor }}></span>
        {player.name}
      </span>
      {isEditable ? (
        <select
          value={assignment?.horseId || ''}
          onChange={(e) => onAssign(chukkerIndex, player.id, e.target.value)}
          className="horse-select"
        >
          <option value="">-- Seleccionar caballo --</option>
          {availableHorses.map(horse => {
            const usage = horseUsageCount[horse.id] || 0;
            const isOverMax = usage >= horse.maxChukkersPerDay;
            const isCurrentlyAssigned = assignment?.horseId === horse.id;
            return (
              <option 
                key={horse.id} 
                value={horse.id}
                disabled={isOverMax && !isCurrentlyAssigned}
              >
                {horse.name} ({usage}/{horse.maxChukkersPerDay})
                {isOverMax && !isCurrentlyAssigned ? ' ⚠️' : ''}
              </option>
            );
          })}
        </select>
      ) : (
        <span className={`assignment-horse ${assignedHorse ? '' : 'unassigned'}`}>
          {assignedHorse ? assignedHorse.name : 'Sin asignar'}
        </span>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-ES', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
}

function EditPracticeModal({ practice, practiceId, onClose }) {
  const [formData, setFormData] = useState({
    name: practice?.name || '',
    date: practice?.date || '',
    status: practice?.status || 'planned'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePractice(practiceId, formData);
      onClose();
    } catch (err) {
      console.error('Error updating practice:', err);
      alert('Error al guardar la práctica');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Editar Práctica</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="name">Nombre</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre de la práctica"
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">Fecha</label>
            <input
              type="date"
              id="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Estado</label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="planned">Planificada</option>
              <option value="in-progress">En Progreso</option>
              <option value="completed">Completada</option>
            </select>
          </div>

          <div className="modal-actions">
            <div className="modal-actions-right">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
