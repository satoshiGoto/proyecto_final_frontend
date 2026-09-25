/**
 * store.js
 * Preferencias del lector guardadas en localStorage: favoritas, ingredientes
 * tildados y tema. Todo va envuelto en try/catch porque el almacenamiento puede
 * estar bloqueado (modo privado, cookies deshabilitadas) y la página debe
 * seguir funcionando igual.
 */

const PREFIX = 'tatakua:';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento: el cambio vale solo para esta visita */
  }
}

/* ---------- Favoritas ---------- */

export function getFavorites() {
  return read('favoritas', []);
}

export function isFavorite(slug) {
  return getFavorites().includes(slug);
}

/** Agrega o quita una receta. Devuelve true si quedó como favorita. */
export function toggleFavorite(slug) {
  const favs = getFavorites();
  const next = favs.includes(slug) ? favs.filter((s) => s !== slug) : [...favs, slug];
  write('favoritas', next);
  document.dispatchEvent(new CustomEvent('favorites:change', { detail: next }));
  return next.includes(slug);
}

/* ---------- Ingredientes tildados (por receta) ---------- */

export function getChecked(slug) {
  return read(`checks:${slug}`, []);
}

export function setChecked(slug, indexes) {
  write(`checks:${slug}`, indexes);
}

/* ---------- Tema ---------- */

// El tema se guarda como texto plano porque lo lee un script en línea del <head>.
export function getTheme() {
  try {
    return localStorage.getItem(`${PREFIX}tema`);
  } catch {
    return null;
  }
}

export function setTheme(theme) {
  try {
    localStorage.setItem(`${PREFIX}tema`, theme);
  } catch {
    /* sin almacenamiento */
  }
}
