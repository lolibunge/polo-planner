import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  useHorse, 
  useHorseLogs,
  updateHorse,
  addHorseLog,
  deleteHorseLog,
  getTodayDateString,
  calculateTodayWorkload,
  calculateWeekWorkload
} from '../hooks/useFirestore';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponible', color: '#22c55e' },
  { value: 'rest', label: 'Descanso', color: '#eab308' },
  { value: 'observe', label: 'Observación', color: '#f97316' },
  { value: 'out', label: 'Fuera', color: '#ef4444' },
];

const LOG_TYPES = [
  { value: 'workload', label: 'Carga de Trabajo', icon: '🏇' },
  { value: 'note', label: 'Nota', icon: '📝' },
  { value: 'health', label: 'Salud', icon: '🏥' },
];

export default function HorseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { horse, loading: horseLoading, error: horseError } = useHorse(id);
  const { logs, loading: logsLoading } = useHorseLogs(id);
  const [showLogModal, setShowLogModal] = useState(false);

  if (horseLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando caballo...</p>
      </div>
    );
  }

  if (horseError || !horse) {
    return (
      <div className="error-container">
        <h3>Caballo no encontrado</h3>
        <p>Este caballo puede haber sido eliminado.</p>
        <Link to="/horses" className="btn btn-primary">Volver a Caballos</Link>
      </div>
    );
  }

  const statusInfo = STATUS_OPTIONS.find(s => s.value === horse.status) || STATUS_OPTIONS[0];
  const todayWorkload = calculateTodayWorkload(logs);
  const weekWorkload = calculateWeekWorkload(logs);
  const isOverworked = todayWorkload >= horse.maxChukkersPerDay;

  const handleStatusChange = async (newStatus) => {
    try {
      await updateHorse(id, { status: newStatus });
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Error al actualizar el estado del caballo');
    }
  };

  const handleQuickChukker = async (delta) => {
    try {
      await addHorseLog(id, {
        date: getTodayDateString(),
        type: 'workload',
        chukkersDelta: delta,
        note: ''
      });
    } catch (err) {
      console.error('Error adding chukker:', err);
      alert('Error al agregar chukker');
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!confirm('¿Eliminar esta entrada de registro?')) return;
    try {
      await deleteHorseLog(id, logId);
    } catch (err) {
      console.error('Error deleting log:', err);
      alert('Error al eliminar la entrada de registro');
    }
  };

  return (
    <div className="horse-detail-page">
      <div className="page-header">
        <div className="breadcrumb">
          <Link to="/horses">← Caballos</Link>
        </div>
      </div>

      <div className="horse-detail-header">
        <div className="horse-title">
          <h2>{horse.name}</h2>
          <span 
            className="status-badge status-badge-lg"
            style={{ backgroundColor: statusInfo.color }}
          >
            {statusInfo.label}
          </span>
        </div>
        
        <div className="status-actions">
          <label>Estado:</label>
          <select 
            value={horse.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="status-select"
          >
            {STATUS_OPTIONS.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="horse-detail-grid">
        {/* Info Card */}
        <div className="detail-card">
          <h3>Información</h3>
          <dl className="info-list">
            <div className="info-row">
              <dt>Idoneidad</dt>
              <dd className="capitalize">{horse.suitability}</dd>
            </div>
            <div className="info-row">
              <dt>Temperamento</dt>
              <dd className="capitalize">{horse.temperament}</dd>
            </div>
            <div className="info-row">
              <dt>Máximo de Chukkers/día</dt>
              <dd>{horse.maxChukkersPerDay}</dd>
            </div>
          </dl>
          {horse.notes && (
            <div className="notes-section">
              <h4>Notas</h4>
              <p>{horse.notes}</p>
            </div>
          )}
        </div>

        {/* Workload Card */}
        <div className="detail-card workload-card">
          <h3>Carga de Trabajo</h3>
          <div className="workload-stats">
            <div className={`workload-stat ${isOverworked ? 'overworked' : ''}`}>
              <span className="stat-value">{todayWorkload}</span>
              <span className="stat-label">Hoy</span>
              <span className="stat-max">/ {horse.maxChukkersPerDay} máx</span>
            </div>
            <div className="workload-stat">
              <span className="stat-value">{weekWorkload}</span>
              <span className="stat-label">Esta Semana</span>
            </div>
          </div>
          
          <div className="quick-actions">
            <button 
              className="btn btn-success"
              onClick={() => handleQuickChukker(1)}
              disabled={horse.status !== 'available'}
            >
              +1 Chukker
            </button>
            <button 
              className="btn btn-success btn-outline"
              onClick={() => handleQuickChukker(2)}
              disabled={horse.status !== 'available'}
            >
              +2 Chukkers
            </button>
          </div>
          
          {isOverworked && (
            <div className="warning-banner">
              ⚠️ El caballo ha alcanzado el máximo de chukkers para hoy
            </div>
          )}
        </div>
      </div>

      {/* Logs Section */}
      <div className="logs-section">
        <div className="logs-header">
          <h3>Registro de Actividad</h3>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setShowLogModal(true)}
          >
            + Añadir Registro
          </button>
        </div>

        {logsLoading ? (
          <p>Cargando registros...</p>
        ) : logs.length === 0 ? (
          <div className="empty-state empty-state-sm">
            <p>No hay actividad registrada aún</p>
          </div>
        ) : (
          <div className="logs-list">
            {logs.map(log => (
              <LogEntry 
                key={log.id} 
                log={log} 
                onDelete={() => handleDeleteLog(log.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showLogModal && (
        <LogModal 
          horseId={id}
          onClose={() => setShowLogModal(false)}
        />
      )}
    </div>
  );
}

function LogEntry({ log, onDelete }) {
  const typeInfo = LOG_TYPES.find(t => t.value === log.type) || LOG_TYPES[0];
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className={`log-entry log-entry-${log.type}`}>
      <span className="log-icon">{typeInfo.icon}</span>
      <div className="log-content">
        <div className="log-header">
          <span className="log-type">{typeInfo.label}</span>
          <span className="log-date">{formatDate(log.date)}</span>
        </div>
        {log.type === 'workload' && (
          <p className="log-chukkers">
            {log.chukkersDelta > 0 ? '+' : ''}{log.chukkersDelta} chukker{Math.abs(log.chukkersDelta) !== 1 ? 's' : ''}
          </p>
        )}
        {log.note && <p className="log-note">{log.note}</p>}
      </div>
      <button className="log-delete" onClick={onDelete} title="Delete">
        &times;
      </button>
    </div>
  );
}

function LogModal({ horseId, onClose }) {
  const [formData, setFormData] = useState({
    type: 'workload',
    date: getTodayDateString(),
    chukkersDelta: 1,
    note: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await addHorseLog(horseId, formData);
      onClose();
    } catch (err) {
      console.error('Error adding log:', err);
      alert('Failed to add log');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Añadir Registro</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Tipo</label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                {LOG_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="date">Fecha</label>
              <input
                type="date"
                id="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          {formData.type === 'workload' && (
            <div className="form-group">
              <label htmlFor="chukkers">Chukkers</label>
              <input
                type="number"
                id="chukkers"
                value={formData.chukkersDelta}
                onChange={(e) => setFormData({ ...formData, chukkersDelta: parseInt(e.target.value) || 0 })}
                min="-5"
                max="5"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="note">Nota</label>
            <textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Any notes about this entry..."
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Add Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
