import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  usePractices, 
  addPractice, 
  deletePractice,
  getTodayDateString 
} from '../hooks/useFirestore';
import { buildPracticeWhatsAppMessage, openWhatsAppShare } from '../lib/whatsapp';

const STATUS_COLORS = {
  'planned': '#3b82f6',
  'in-progress': '#f59e0b', 
  'completed': '#22c55e',
  'cancelled-weather': '#64748b'
};

const STATUS_LABELS = {
  'planned': 'Planificado',
  'in-progress': 'En Progreso',
  'completed': 'Completado',
  'cancelled-weather': 'Cancelado por clima'
};

export default function Practices() {
  const { practices, loading, error } = usePractices();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');

  const filteredPractices = practices.filter(practice => {
    if (filter === 'all') return true;
    return practice.status === filter;
  });

  const handleDelete = async (practice) => {
    if (!confirm(`Delete practice "${practice.name || 'Unnamed'}"?`)) return;
    try {
      await deletePractice(practice.id);
    } catch (err) {
      console.error('Error deleting practice:', err);
      alert('Failed to delete practice');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading practices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error loading practices: {error}</p>
      </div>
    );
  }

  return (
    <div className="practices-page">
      <div className="page-header">
        <div>
          <h2>Prácticas</h2>
          <p className="page-subtitle">{practices.length} prácticas</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Nueva Práctica
        </button>
      </div>

      <div className="filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todas ({practices.length})
        </button>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <button 
            key={value}
            className={`filter-btn ${filter === value ? 'active' : ''}`}
            onClick={() => setFilter(value)}
          >
            {label} ({practices.filter(p => p.status === value).length})
          </button>
        ))}
      </div>

      {filteredPractices.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🏇</span>
          <h3>No hay prácticas aún</h3>
          <p>Crea tu primera práctica para comenzar a asignar caballos y jugadores</p>
        </div>
      ) : (
        <div className="practices-list">
          {filteredPractices.map(practice => (
            <PracticeCard 
              key={practice.id} 
              practice={practice}
              onDelete={() => handleDelete(practice)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NewPracticeModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

function PracticeCard({ practice, onDelete }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-ES', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const chukkerCount = practice.chukkers?.length || 0;
  // Count players from teams (A and B)
  const teams = practice.teams || { A: [], B: [] };
  const playerCount = (teams.A?.length || 0) + (teams.B?.length || 0);

  return (
    <div className="practice-card">
      <div className="practice-card-header">
        <div>
          <Link to={`/practices/${practice.id}`} className="practice-name">
            {practice.name || 'Unnamed Practice'}
          </Link>
          <span className="practice-date">{formatDate(practice.date)}</span>
        </div>
        <span 
          className="status-badge"
          style={{ backgroundColor: STATUS_COLORS[practice.status] || '#64748b' }}
        >
          {STATUS_LABELS[practice.status] || practice.status}
        </span>
      </div>
      
      <div className="practice-stats">
        <span className="stat">
          <strong>{chukkerCount}</strong> chukker{chukkerCount !== 1 ? 's' : ''}
        </span>
        <span className="stat">
          <strong>{playerCount}</strong> jugador{playerCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="practice-card-actions">
        <Link to={`/practices/${practice.id}`} className="btn btn-primary btn-sm">
          {practice.status === 'completed' || practice.status === 'cancelled-weather' ? 'Ver' : 'Editar'}
        </Link>
        {practice.status !== 'completed' && practice.status !== 'cancelled-weather' && (
          <button className="btn btn-danger btn-sm" onClick={onDelete}>
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

function NewPracticeModal({ onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    date: getTodayDateString(),
    chukkerCount: 4
  });
  const [saving, setSaving] = useState(false);

  const formatDateForMessage = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const createPractice = async () => {
    // Create empty chukkers array
    const chukkers = Array.from({ length: formData.chukkerCount }, (_, i) => ({
      number: i + 1,
      assignments: [] // Will hold { playerId, horseId } pairs
    }));

    return addPractice({
      name: formData.name,
      date: formData.date,
      chukkers,
      players: [] // Selected players for this practice
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await createPractice();
      onClose();
    } catch (err) {
      console.error('Error creating practice:', err);
      alert('Failed to create practice');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndShare = async () => {
    if (saving) return;

    // Open a window immediately (user gesture) to avoid popup blockers.
    const preOpenedWindow = window.open('', '_blank');

    setSaving(true);
    try {
      const docRef = await createPractice();
      const message = buildPracticeWhatsAppMessage({
        practiceId: docRef.id,
        name: formData.name,
        dateLabel: formatDateForMessage(formData.date)
      });
      openWhatsAppShare(message, { preOpenedWindow });
      onClose();
    } catch (err) {
      console.error('Error creating practice:', err);
      alert('Failed to create practice');
      if (preOpenedWindow && !preOpenedWindow.closed) preOpenedWindow.close();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nueva Práctica</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="name">Nombre de la Práctica</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Morning Practice, Tournament Prep..."
            />
          </div>

          <div className="form-row">
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
              <label htmlFor="chukkers">Número de Chukkers</label>
              <input
                type="number"
                id="chukkers"
                value={formData.chukkerCount}
                onChange={(e) => setFormData({ ...formData, chukkerCount: parseInt(e.target.value) || 1 })}
                min="1"
                max="8"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleCreateAndShare} disabled={saving}>
              {saving ? 'Creando...' : 'Crear y Compartir'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creando...' : 'Crear Práctica'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
