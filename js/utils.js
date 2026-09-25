/**
 * utils.js
 * Funciones pequeñas y puras que usan varias vistas.
 */

/** Escapa texto antes de insertarlo como HTML (evita inyección de código). */
export function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Normaliza texto para búsquedas: minúsculas y sin tildes ("Mbejú" → "mbeju"). */
export function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const dateFormat = new Intl.DateTimeFormat('es-PY', { day: 'numeric', month: 'long', year: 'numeric' });

/** "2026-09-12" → "12 de septiembre de 2026". Se fija el mediodía para evitar saltos de zona horaria. */
export function formatDate(iso) {
  return dateFormat.format(new Date(`${iso}T12:00:00`));
}

/** 75 → "1 h 15 min". */
export function formatMinutes(total) {
  if (!total) return 'Sin cocción';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Segundos → "04:59" para los temporizadores. */
export function formatClock(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

const FRACCIONES = { 0.25: '¼', 0.5: '½', 0.75: '¾' };

/**
 * Da formato a una cantidad escalada.
 * - Gramos y mililitros se redondean a múltiplos de 5.
 * - El resto se redondea al cuarto más cercano y usa fracciones (1½).
 */
export function formatQty(qty, unit) {
  if (['g', 'ml'].includes(unit)) {
    const rounded = qty >= 50 ? Math.round(qty / 5) * 5 : Math.round(qty);
    return String(Math.max(rounded, 1));
  }
  const quarter = Math.max(Math.round(qty * 4) / 4, 0.25);
  const whole = Math.floor(quarter);
  const frac = FRACCIONES[+(quarter - whole).toFixed(2)] || '';
  return whole ? `${whole}${frac}` : frac;
}

/** Retrasa la ejecución de fn hasta que el usuario deja de escribir. */
export function debounce(fn, wait = 200) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), wait);
  };
}

/** Respeta la preferencia de movimiento reducido del sistema. */
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
