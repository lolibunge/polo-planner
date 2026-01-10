import { useState } from 'react';
import { usePlayers, addPlayer, updatePlayer, deletePlayer } from '../hooks/useFirestore';

export default function Players() {
  const { players, loading, error } = usePlayers();
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);

  const openAddModal = () => {
    setEditingPlayer(null);
    setShowModal(true);
  };

  const openEditModal = (player) => {
    setEditingPlayer(player);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando jugadores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error cargando jugadores: {error}</p>
      </div>
    );
  }

  return (
    <div className="players-page">
      <div className="page-header">
        <div>
          <h2>Jugadores</h2>
          <p className="page-subtitle">{players.length} jugadores registrados</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Agregar Jugador
        </button>
      </div>

      {players.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">👤</span>
          <h3>No hay jugadores aún</h3>
          <p>Agrega tu primer jugador para comenzar</p>
        </div>
      ) : (
        <div className="players-grid">
          {players.map(player => (
            <PlayerCard 
              key={player.id} 
              player={player}
              onEdit={() => openEditModal(player)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <PlayerModal 
          player={editingPlayer}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function PlayerCard({ player, onEdit }) {
  const getLevelLabel = (level) => {
    if (level <= 0) return 'Principiante';
    if (level <= 2) return 'Novato';
    if (level <= 4) return 'Intermedio';
    if (level <= 6) return 'Avanzado';
    return 'Profesional';
  };

  const getLevelColor = (level) => {
    if (level <= 0) return '#22c55e';
    if (level <= 2) return '#84cc16';
    if (level <= 4) return '#eab308';
    if (level <= 6) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="player-card">
      <div className="player-card-header">
        <div className="player-avatar">
          {player.name.charAt(0).toUpperCase()}
        </div>
        <div className="player-info">
          <h3 className="player-name">{player.name}</h3>
          <span 
            className="level-badge"
            style={{ backgroundColor: getLevelColor(player.level) }}
          >
            {player.level} HCP - {getLevelLabel(player.level)}
          </span>
        </div>
      </div>
      
      {player.notes && (
        <p className="player-notes">{player.notes}</p>
      )}

      <div className="player-card-actions">
        <button 
          className="btn btn-secondary btn-sm"
          onClick={onEdit}
        >
          Editar
        </button>
      </div>
    </div>
  );
}

function PlayerModal({ player, onClose }) {
  const [formData, setFormData] = useState({
    name: player?.name || '',
    level: player?.level ?? 0,
    notes: player?.notes || ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (player) {
        await updatePlayer(player.id, formData);
      } else {
        await addPlayer(formData);
      }
      onClose();
    } catch (err) {
      console.error('Error saving player:', err);
      alert('Failed to save player');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${player.name}?`)) return;
    
    setDeleting(true);
    try {
      await deletePlayer(player.id);
      onClose();
    } catch (err) {
      console.error('Error deleting player:', err);
      alert('Error al eliminar jugador');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{player ? 'Editar Jugador' : 'Agregar Jugador'}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="name">Nombre *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Nombre del jugador"
            />
          </div>

          <div className="form-group">
            <label htmlFor="level">
              Nivel de Handicap: <strong>{formData.level}</strong>
            </label>
            <input
              type="range"
              id="level"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: parseFloat(e.target.value) })}
              min="-2"
              max="10"
              step="0.5"
              className="level-slider"
            />
            <div className="level-range-labels">
              <span>-2 (Principiante)</span>
              <span>10 (Pro)</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notas / Preferencias</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ej: Prefiere caballos tranquilos, juega posición 1..."
              rows={3}
            />
          </div>

          <div className="modal-actions">
            {player && (
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Eliminar Jugador'}
              </button>
            )}
            <div className="modal-actions-right">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : (player ? 'Guardar Cambios' : 'Agregar Jugador')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
