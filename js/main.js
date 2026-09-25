/**
 * main.js
 * Punto de entrada. Conecta datos (api.js), vistas (views.js) y preferencias
 * (store.js), y maneja la navegación por hash:
 *
 *   #/                 → inicio con el listado
 *   #/receta/<slug>    → detalle de una receta
 *   #/favoritas        → recetas guardadas
 *   #recetas, #sobre…  → anclas dentro del inicio
 */

import { getBlog, getPost } from './api.js';
import { mountNanduti } from './nanduti.js';
import { renderPostList, renderRecipe, renderTagChips, renderMessage, ingredientsHTML } from './views.js';
import * as store from './store.js';
import { debounce, normalize, formatClock, prefersReducedMotion, escapeHTML } from './utils.js';

/* ------------------------------------------------------------------ */
/* Estado de la aplicación                                             */
/* ------------------------------------------------------------------ */

const state = {
  blog: null,          // { blog, tags, posts } tal como llega de la API
  tagsById: new Map(), // id → { id, label }
  filters: { q: '', tags: new Set(), orden: 'recientes' },
};

/* Atajos a elementos que se usan seguido */
const $ = (sel, root = document) => root.querySelector(sel);
const views = {
  inicio: $('[data-view="inicio"]'),
  receta: $('[data-view="receta"]'),
  favoritas: $('[data-view="favoritas"]'),
};
const postList = $('[data-post-list]');
const favList = $('[data-fav-list]');
const filtersForm = $('[data-filters]');
const resultsCount = $('[data-results-count]');

/* ------------------------------------------------------------------ */
/* Ilustraciones fijas: logo y portada                                 */
/* ------------------------------------------------------------------ */

function mountArt() {
  mountNanduti('[data-nanduti-mini]', { petals: 8, rings: 2, colors: ['rosa', 'amarillo'] }, { detail: 'simple' });
  mountNanduti('[data-nanduti-hero]', { petals: 12, rings: 5, colors: ['rosa', 'amarillo', 'verde', 'celeste'] });

  // Único momento de animación no provocado por el usuario: la roseta de la portada se "teje" al cargar.
  if (!prefersReducedMotion()) {
    $('[data-nanduti-hero] svg')?.classList.add('is-weaving');
  }
}

/* ------------------------------------------------------------------ */
/* Tema claro / oscuro                                                 */
/* ------------------------------------------------------------------ */

function currentTheme() {
  const saved = document.documentElement.dataset.theme;
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function paintThemeButton() {
  const dark = currentTheme() === 'dark';
  const btn = $('[data-theme-toggle]');
  btn.setAttribute('aria-pressed', String(dark));
  $('[data-theme-label]').textContent = dark ? 'Modo claro' : 'Modo oscuro';
}

function initTheme() {
  paintThemeButton();
  $('[data-theme-toggle]').addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.setTheme(next);
    paintThemeButton();
  });
}

/* ------------------------------------------------------------------ */
/* Menú móvil                                                          */
/* ------------------------------------------------------------------ */

function initNav() {
  const toggle = $('.nav-toggle');
  const nav = $('#nav-principal');

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.visually-hidden').textContent = open ? 'Cerrar menú' : 'Abrir menú';
    nav.classList.toggle('is-open', open);
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

function updateFavCount() {
  const n = store.getFavorites().length;
  const badge = $('[data-fav-count]');
  badge.hidden = n === 0;
  badge.textContent = n;
  badge.setAttribute('aria-label', `${n} guardadas`);
}

/* ------------------------------------------------------------------ */
/* Aviso breve (toast)                                                 */
/* ------------------------------------------------------------------ */

let toastTimer;
function toast(message) {
  const node = $('[data-toast]');
  node.textContent = message;
  node.hidden = false;
  requestAnimationFrame(() => node.classList.add('is-visible'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    node.classList.remove('is-visible');
    setTimeout(() => { node.hidden = true; }, 250);
  }, 3200);
}

/* ------------------------------------------------------------------ */
/* Filtros del listado                                                 */
/* ------------------------------------------------------------------ */

/** Aplica búsqueda, etiquetas y orden sobre los posts. */
function filteredPosts() {
  const { q, tags, orden } = state.filters;
  const query = normalize(q.trim());

  let posts = state.blog.posts.filter((post) => {
    // Coincide si alguna de las etiquetas elegidas está en el post.
    const tagOk = !tags.size || post.tags.some((t) => tags.has(t));
    if (!tagOk) return false;
    if (!query) return true;
    const haystack = normalize([post.title, post.excerpt, ...post.ingredients.map((i) => i.item)].join(' '));
    return haystack.includes(query);
  });

  if (orden === 'rapidas') {
    posts = [...posts].sort((a, b) => a.prepMinutes + a.cookMinutes - (b.prepMinutes + b.cookMinutes));
  } else if (orden === 'az') {
    posts = [...posts].sort((a, b) => a.title.localeCompare(b.title, 'es'));
  }
  return posts;
}

function renderHome() {
  const posts = filteredPosts();
  const total = state.blog.posts.length;
  const filtering = state.filters.q || state.filters.tags.size;

  resultsCount.textContent = filtering
    ? `${posts.length} de ${total} recetas`
    : `${total} recetas`;

  renderPostList(postList, posts, state.tagsById, {
    // La receta destacada solo tiene sentido en el orden por defecto y sin filtros.
    featureFirst: !filtering && state.filters.orden === 'recientes',
    empty: `
      <p>${state.filters.q
        ? `Ninguna receta coincide con “${escapeHTML(state.filters.q)}”${state.filters.tags.size ? ' con los filtros elegidos' : ''}.`
        : 'Ninguna receta combina esos filtros.'} Probá con otro ingrediente o quitá los filtros.</p>
      <button class="button button--ghost" type="button" data-reset-filters>Quitar filtros</button>`,
  });
}

function initFilters() {
  renderTagChips($('[data-tag-list]'), state.blog.tags, state.filters.tags);

  const onSearch = debounce((value) => {
    state.filters.q = value;
    renderHome();
  }, 180);

  filtersForm.addEventListener('input', (e) => {
    if (e.target.name === 'q') onSearch(e.target.value);
  });

  filtersForm.addEventListener('change', (e) => {
    if (e.target.name === 'tag') {
      e.target.checked ? state.filters.tags.add(e.target.value) : state.filters.tags.delete(e.target.value);
      renderHome();
    }
    if (e.target.name === 'orden') {
      state.filters.orden = e.target.value;
      renderHome();
    }
  });

  // Enter en el buscador no debe recargar la página.
  filtersForm.addEventListener('submit', (e) => e.preventDefault());
}

function resetFilters() {
  state.filters.q = '';
  state.filters.tags.clear();
  filtersForm.reset();
  state.filters.orden = 'recientes';
  renderHome();
  $('#buscar').focus();
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

function showView(name) {
  for (const [key, node] of Object.entries(views)) node.hidden = key !== name;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const current = (name === 'inicio' && a.dataset.nav === 'inicio') || a.dataset.nav === name;
    current ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
}

async function route() {
  const hash = location.hash || '#/';
  stopAllTimers();

  // Anclas del inicio (#recetas, #sobre, #contacto)
  if (!hash.startsWith('#/')) {
    showView('inicio');
    document.title = 'Tatakua, cocina paraguaya de casa';
    const target = document.getElementById(hash.slice(1));
    target?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    return;
  }

  const [, section, slug] = hash.slice(1).split('/');

  if (section === 'receta' && slug) {
    showView('receta');
    const post = await getPost(decodeURIComponent(slug)).catch(() => undefined);
    if (!post) {
      renderMessage(views.receta, {
        title: 'No encontramos esa receta',
        text: 'Puede que el enlace esté incompleto o que la receta haya cambiado de nombre.',
        action: '<a class="button" href="#recetas">Ver todas las recetas</a>',
      });
    } else {
      const { posts } = state.blog;
      const i = posts.indexOf(post);
      renderRecipe(views.receta, post, { tagsById: state.tagsById, prev: posts[i + 1], next: posts[i - 1] });
    }
    window.scrollTo(0, 0);
    views.receta.querySelector('h1')?.focus({ preventScroll: true });
    return;
  }

  if (section === 'favoritas') {
    showView('favoritas');
    renderFavorites();
    document.title = 'Tus favoritas, en Tatakua';
    window.scrollTo(0, 0);
    $('#fav-titulo').focus?.();
    return;
  }

  // Cualquier otra ruta vuelve al inicio.
  showView('inicio');
  document.title = 'Tatakua, cocina paraguaya de casa';
  window.scrollTo(0, 0);
}

function renderFavorites() {
  const favs = new Set(store.getFavorites());
  const posts = state.blog.posts.filter((p) => favs.has(p.slug));
  renderPostList(favList, posts, state.tagsById, {
    featureFirst: false,
    empty: `
      <p>Todavía no guardaste ninguna receta. Tocá “Guardar” en la que quieras tener a mano.</p>
      <a class="button" href="#recetas">Elegir recetas</a>`,
  });
}

/* ------------------------------------------------------------------ */
/* Detalle: porciones, ingredientes, temporizadores                    */
/* ------------------------------------------------------------------ */

function changeServings(delta) {
  const article = views.receta;
  const post = state.blog.posts.find((p) => p.slug === article.dataset.slug);
  const current = Number(article.dataset.currentServings);
  const next = Math.min(Math.max(current + delta, 1), post.servings * 4);
  if (next === current) return;
  article.dataset.currentServings = next;
  $('[data-servings-value]', article).textContent = next;
  $('[data-ingredients]', article).innerHTML = ingredientsHTML(post, next);
}

function saveChecks() {
  const article = views.receta;
  const checked = [...article.querySelectorAll('[data-ingredient]:checked')].map((c) => Number(c.dataset.ingredient));
  store.setChecked(article.dataset.slug, checked);
}

const timers = new Map(); // botón → id de intervalo

function stopAllTimers() {
  timers.forEach((id) => clearInterval(id));
  timers.clear();
}

/** Un pitido corto con Web Audio al terminar un temporizador. */
function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch { /* sin audio disponible */ }
}

function toggleTimer(btn) {
  const time = $('.timer__time', btn);
  const label = $('.timer__label', btn);
  const total = Number(btn.dataset.timer);
  const minutes = total / 60;

  // Si está corriendo, se cancela y vuelve a su estado inicial.
  if (timers.has(btn)) {
    clearInterval(timers.get(btn));
    timers.delete(btn);
    btn.classList.remove('is-running');
    label.textContent = 'Temporizador';
    time.textContent = `${minutes} min`;
    btn.setAttribute('aria-label', `Iniciar temporizador de ${minutes} minutos para el paso ${btn.dataset.step}`);
    return;
  }

  const end = Date.now() + total * 1000; // Se calcula contra el reloj para no acumular desfase.
  btn.classList.add('is-running');
  btn.classList.remove('is-done');
  label.textContent = 'Cancelar';
  btn.setAttribute('aria-label', `Cancelar temporizador del paso ${btn.dataset.step}`);

  const tick = () => {
    const left = Math.max(Math.round((end - Date.now()) / 1000), 0);
    time.textContent = formatClock(left);
    if (left === 0) {
      clearInterval(timers.get(btn));
      timers.delete(btn);
      btn.classList.remove('is-running');
      btn.classList.add('is-done');
      label.textContent = 'Listo';
      time.textContent = `${minutes} min`;
      btn.setAttribute('aria-label', `Paso ${btn.dataset.step} listo. Iniciar de nuevo el temporizador de ${minutes} minutos`);
      beep();
      toast(`Paso ${btn.dataset.step} listo.`);
    }
  };
  tick();
  timers.set(btn, setInterval(tick, 1000));
}

async function copyLink() {
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    toast('Enlace copiado.');
  } catch {
    // Sin permiso de portapapeles: se muestra el enlace para copiarlo a mano.
    toast(`Copiá este enlace: ${url}`);
  }
}

/* ------------------------------------------------------------------ */
/* Delegación de eventos: un solo listener para todos los botones      */
/* ------------------------------------------------------------------ */

function initDelegation() {
  document.addEventListener('click', (e) => {
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      const slug = fav.dataset.fav;
      const on = store.toggleFavorite(slug);
      // Se actualizan todos los botones de esa receta (listado y detalle).
      document.querySelectorAll(`[data-fav="${CSS.escape(slug)}"]`).forEach((b) => {
        b.setAttribute('aria-pressed', String(on));
        b.querySelector('.fav-button__text').textContent = on ? 'Guardada' : 'Guardar';
      });
      const title = state.blog.posts.find((p) => p.slug === slug)?.title;
      toast(on ? `${title} guardada en favoritas.` : `${title} quitada de favoritas.`);
      if (!views.favoritas.hidden) renderFavorites();
      return;
    }

    const servings = e.target.closest('[data-servings]');
    if (servings) return changeServings(Number(servings.dataset.servings));

    const timer = e.target.closest('[data-timer]');
    if (timer) return toggleTimer(timer);

    if (e.target.closest('[data-share]')) return copyLink();

    if (e.target.closest('[data-clear-checks]')) {
      views.receta.querySelectorAll('[data-ingredient]').forEach((c) => { c.checked = false; });
      return saveChecks();
    }

    if (e.target.closest('[data-reset-filters]')) return resetFilters();

    if (e.target.closest('[data-retry]')) return start();
  });

  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-ingredient]')) saveChecks();
  });

  document.addEventListener('favorites:change', updateFavCount);
}

/* ------------------------------------------------------------------ */
/* Formulario de contacto                                              */
/* ------------------------------------------------------------------ */

const MESSAGES = {
  nombre: { valueMissing: 'Escribí tu nombre.', tooShort: 'El nombre necesita al menos 2 letras.' },
  email: { valueMissing: 'Escribí tu correo para poder responderte.', typeMismatch: 'Revisá el correo: falta la @ o el dominio.' },
  receta: { valueMissing: 'Contanos qué receta es.' },
  mensaje: { valueMissing: 'Contanos cómo la preparan.', tooShort: 'Agregá un poco más de detalle (mínimo 20 caracteres).' },
};

/** Valida un campo con la API de validación nativa y muestra el mensaje propio. */
function validateField(input) {
  const errorNode = document.getElementById(`${input.id}-error`);
  const v = input.validity;
  const msgs = MESSAGES[input.name] || {};
  let message = '';
  if (v.valueMissing) message = msgs.valueMissing;
  else if (v.typeMismatch) message = msgs.typeMismatch;
  else if (v.tooShort) message = msgs.tooShort;

  input.setAttribute('aria-invalid', String(Boolean(message)));
  errorNode.textContent = message || '';
  return !message;
}

function initContactForm() {
  const form = $('[data-contact-form]');
  const status = $('[data-form-status]');
  let attempted = false;

  // Después del primer intento, cada campo se revalida mientras se escribe.
  form.addEventListener('input', (e) => { if (attempted && e.target.name) validateField(e.target); });
  form.addEventListener('focusout', (e) => { if (e.target.name && e.target.value) validateField(e.target); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    attempted = true;
    const fields = [...form.querySelectorAll('input, textarea')];
    const invalid = fields.filter((f) => !validateField(f));
    if (invalid.length) {
      status.textContent = invalid.length === 1 ? 'Revisá el campo marcado.' : `Revisá los ${invalid.length} campos marcados.`;
      status.dataset.state = 'error';
      invalid[0].focus();
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Enviando…';

    // Proyecto solo frontend: se simula el envío. Acá iría un fetch POST al backend.
    await new Promise((r) => setTimeout(r, 700));
    const data = Object.fromEntries(new FormData(form));

    status.textContent = `Receta enviada. Gracias, ${data.nombre.split(' ')[0]}: te escribimos a ${data.email} si la probamos.`;
    status.dataset.state = 'ok';
    form.reset();
    attempted = false;
    fields.forEach((f) => f.removeAttribute('aria-invalid'));
    button.disabled = false;
    button.textContent = 'Enviar receta';
  });
}

/* ------------------------------------------------------------------ */
/* Arranque                                                            */
/* ------------------------------------------------------------------ */

async function start() {
  postList.setAttribute('aria-busy', 'true');
  postList.innerHTML = '<p class="status">Cargando recetas…</p>';
  try {
    state.blog = await getBlog();
    state.tagsById = new Map(state.blog.tags.map((t) => [t.id, t]));
    initFilters();
    renderHome();
    await route();
  } catch (err) {
    postList.removeAttribute('aria-busy');
    postList.innerHTML = `
      <div class="empty empty--error" role="alert">
        <p>${escapeHTML(err.message)}</p>
        <button class="button button--ghost" type="button" data-retry>Intentar de nuevo</button>
      </div>`;
  }
}

let started = false;
function boot() {
  if (started) return;
  started = true;
  mountArt();
  initTheme();
  initNav();
  initDelegation();
  initContactForm();
  updateFavCount();
  window.addEventListener('hashchange', () => { if (state.blog) route(); });
  start();
}

boot();
