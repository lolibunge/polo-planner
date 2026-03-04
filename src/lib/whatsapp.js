const getPublicAppUrl = () => {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL;
  if (configured && String(configured).trim().length > 0) {
    return String(configured).replace(/\/$/, '');
  }
  // Fallback: production app URL (so shared links never point to localhost)
  return 'https://polo-planner.vercel.app';
};

export const getPracticeRsvpUrl = (_practiceId) => {
  const base = getPublicAppUrl();
  // Share only the main app URL. The app will route the player after login.
  return `${base}/`;
};

export const buildPracticeWhatsAppMessage = ({ practiceId, name, dateLabel }) => {
  const lines = [];
  lines.push(`🏇 *${name || 'Práctica'}*`);
  if (dateLabel) lines.push(`📅 Fecha: ${dateLabel}`);
  lines.push('');
  lines.push('✅ Confirmá asistencia acá:');
  lines.push(getPracticeRsvpUrl(practiceId));
  return lines.join('\n');
};

export const openWhatsAppShare = (message, { target = '_blank', preOpenedWindow = null } = {}) => {
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/?text=${encodedMessage}`;

  // If we already opened a window synchronously (to avoid popup blockers), reuse it.
  if (preOpenedWindow && !preOpenedWindow.closed) {
    preOpenedWindow.location.href = url;
    return;
  }

  window.open(url, target);
};
