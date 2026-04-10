// ============================================================
//  Medication utilities — funciones puras sin efectos secundarios
// ============================================================

const TAKEN_CACHE_KEY = 'eps_taken_doses';

/**
 * Lee el caché de dosis tomadas hoy desde localStorage.
 * Devuelve {} si no hay datos o si los datos son de otro día.
 */
export const loadTodayCache = () => {
  try {
    const raw = localStorage.getItem(TAKEN_CACHE_KEY);
    if (!raw) return {};
    const { date, data } = JSON.parse(raw);
    const today = new Date().toISOString().split('T')[0];
    return date === today ? data : {};
  } catch {
    return {};
  }
};

/**
 * Persiste el mapa de dosis tomadas para el día actual.
 * @param {Record<string, string>} map  clave: `${medId}-${horario}`, valor: hora formateada
 */
export const saveTodayCache = (map) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(TAKEN_CACHE_KEY, JSON.stringify({ date: today, data: map }));
  } catch {
    // Non-critical — silent fail
  }
};

/**
 * Calcula qué dosis se toman en los próximos 30 minutos.
 * @param {Array}  medications  lista de medicamentos activos
 * @returns {Array<{ med, horario, minutesLeft }>} ordenado por menor tiempo restante
 */
export const getUpcomingDoses = (medications) => {
  const now            = new Date();
  const today          = now.toISOString().slice(0, 10);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const upcoming = [];
  for (const med of medications) {
    if (!med.fecha_fin || med.fecha_fin < today) continue;
    for (const horario of (med.horarios || [])) {
      const [h, m] = horario.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) continue;
      const diff = h * 60 + m - currentMinutes;
      if (diff > 0 && diff <= 30) {
        upcoming.push({ med, horario, minutesLeft: diff });
      }
    }
  }
  return upcoming.sort((a, b) => a.minutesLeft - b.minutesLeft);
};
