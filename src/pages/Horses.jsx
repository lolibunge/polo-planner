import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  useHorses, 
  addHorse, 
  updateHorse, 
  deleteHorse,
  addHorseLog,
  getTodayDateString
} from '../hooks/useFirestore';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponible', color: '#22c55e' },
  { value: 'rest', label: 'Descanso', color: '#eab308' },
  { value: 'observe', label: 'Observación', color: '#f97316' },
  { value: 'out', label: 'Fuera', color: '#ef4444' },
];

const SUITABILITY_OPTIONS = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' }
];
const TEMPERAMENT_OPTIONS = [
  { value: 'calm', label: 'Tranquilo' },
  { value: 'medium', label: 'Medio' },
  { value: 'hot', label: 'Caliente' }
];

export default function Horses() {
  const { horses, loading, error } = useHorses();
  const [showModal, setShowModal] = useState(false);
  const [editingHorse, setEditingHorse] = useState(null);
  const [filter, setFilter] = useState('all');

  const filteredHorses = horses.filter(horse => {
    if (filter === 'all') return true;
    return horse.status === filter;
  });

  const handleAddChukker = async (horse) => {
    try {
      await addHorseLog(horse.id, {
        date: getTodayDateString(),
        type: 'workload',
        chukkersDelta: 1,
        note: ''
      });
    } catch (err) {
      console.error('Error adding chukker:', err);
      alert('Failed to add chukker');
    }
  };

  const handleStatusChange = async (horse, newStatus) => {
    try {
      await updateHorse(horse.id, { status: newStatus });
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  const openAddModal = () => {
    setEditingHorse(null);
    setShowModal(true);
  };

  const openEditModal = (horse) => {
    setEditingHorse(horse);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando caballos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error cargando caballos: {error}</p>
      </div>
    );
  }

  return (
    <div className="horses-page">
      <div className="page-header">
        <div>
          <h2>Caballos</h2>
          <p className="page-subtitle">{horses.length} caballos en el establo</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Agregar Caballo
        </button>
      </div>

      <div className="filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todos ({horses.length})
        </button>
        {STATUS_OPTIONS.map(status => (
          <button 
            key={status.value}
            className={`filter-btn ${filter === status.value ? 'active' : ''}`}
            onClick={() => setFilter(status.value)}
            style={{ '--status-color': status.color }}
          >
            {status.label} ({horses.filter(h => h.status === status.value).length})
          </button>
        ))}
      </div>

      {filteredHorses.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🐴</span>
          <h3>No se encontraron caballos</h3>
          <p>Agrega tu primer caballo para comenzar</p>
        </div>
      ) : (
        <div className="horses-grid">
          {filteredHorses.map(horse => (
            <HorseCard 
              key={horse.id} 
              horse={horse}
              onAddChukker={() => handleAddChukker(horse)}
              onStatusChange={(status) => handleStatusChange(horse, status)}
              onEdit={() => openEditModal(horse)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <HorseModal 
          horse={editingHorse}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function HorseCard({ horse, onAddChukker, onStatusChange, onEdit }) {
  const statusInfo = STATUS_OPTIONS.find(s => s.value === horse.status) || STATUS_OPTIONS[0];
  const suitabilityInfo = SUITABILITY_OPTIONS.find(s => s.value === horse.suitability);
  const temperamentInfo = TEMPERAMENT_OPTIONS.find(t => t.value === horse.temperament);

  return (
    <div className="horse-card">
      <div className="horse-card-header">
        <Link to={`/horses/${horse.id}`} className="horse-name">
          {horse.name}
        </Link>
        <span 
          className="status-badge"
          style={{ backgroundColor: statusInfo.color }}
        >
          {statusInfo.label}
        </span>
      </div>
      
      <div className="horse-card-body">
        <div className="horse-info">
          <span className="info-item">
            <span className="info-label">Idoneidad:</span> {suitabilityInfo?.label || horse.suitability}
          </span>
          <span className="info-item">
            <span className="info-label">Temperamento:</span> {temperamentInfo?.label || horse.temperament}
          </span>
          <span className="info-item">
            <span className="info-label">Max/día:</span> {horse.maxChukkersPerDay} chukkers
          </span>
        </div>
        
        {horse.notes && (
          <p className="horse-notes">{horse.notes}</p>
        )}
      </div>

      <div className="horse-card-actions">
        <select 
          value={horse.status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="status-select"
        >
          {STATUS_OPTIONS.map(status => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        
        <button 
          className="btn btn-success btn-sm"
          onClick={onAddChukker}
          disabled={horse.status !== 'available'}
          title={horse.status !== 'available' ? 'Caballo no disponible' : 'Agregar 1 chukker'}
        >
          +1 Chukker
        </button>
        
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

function HorseModal({ horse, onClose }) {
  const [formData, setFormData] = useState({
    name: horse?.name || '',
    status: horse?.status || 'available',
    suitability: horse?.suitability || 'intermediate',
    temperament: horse?.temperament || 'medium',
    maxChukkersPerDay: horse?.maxChukkersPerDay || 2,
    notes: horse?.notes || ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (horse) {
        await updateHorse(horse.id, formData);
      } else {
        await addHorse(formData);
      }
      onClose();
    } catch (err) {
      console.error('Error saving horse:', err);
      alert('Failed to save horse');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${horse.name}?`)) return;
    
    setDeleting(true);
    try {
      await deleteHorse(horse.id);
      onClose();
    } catch (err) {
      console.error('Error deleting horse:', err);
      alert('Error al eliminar caballo');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{horse ? 'Editar Caballo' : 'Agregar Caballo'}</h3>
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
              placeholder="Nombre del caballo"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">Estado</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="maxChukkers">Máximo Chukkers/día</label>
              <input
                type="number"
                id="maxChukkers"
                value={formData.maxChukkersPerDay}
                onChange={(e) => setFormData({ ...formData, maxChukkersPerDay: parseInt(e.target.value) || 1 })}
                min="1"
                max="6"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="suitability">Idoneidad</label>
              <select
                id="suitability"
                value={formData.suitability}
                onChange={(e) => setFormData({ ...formData, suitability: e.target.value })}
              >
                {SUITABILITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="temperament">Temperamento</label>
              <select
                id="temperament"
                value={formData.temperament}
                onChange={(e) => setFormData({ ...formData, temperament: e.target.value })}
              >
                {TEMPERAMENT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notas</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Cualquier nota sobre este caballo..."
              rows={3}
            />
          </div>

          <div className="modal-actions">
            {horse && (
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Eliminar Caballo'}
              </button>
            )}
            <div className="modal-actions-right">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : (horse ? 'Guardar Cambios' : 'Agregar Caballo')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
