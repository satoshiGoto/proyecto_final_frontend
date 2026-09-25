/**
 * views.js
 * Funciones que convierten datos en HTML. No guardan estado: reciben los datos
 * y un contenedor, y lo dibujan. Los eventos se manejan en main.js por delegación.
 */

import { createNanduti } from './nanduti.js';
import { escapeHTML, formatDate, formatMinutes, formatQty } from './utils.js';
import { isFavorite, getChecked } from './store.js';

/** Texto e ícono del botón de favorita según su estado. */
function favButton(slug, { compact = false } = {}) {
  const on = isFavorite(slug);
  const text = on ? 'Guardada' : 'Guardar';
  return `
    <button class="fav-button${compact ? ' fav-button--compact' : ''}" type="button"
      data-fav="${escapeHTML(slug)}" aria-pressed="${on}">
      <svg class="fav-button__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/>
      </svg>
      <span class="fav-button__text">${text}</span>
    </button>`;
}

/** Nombres legibles de las etiquetas de un post. */
const tagLabels = (post, tagsById) => post.tags.map((t) => tagsById.get(t)?.label ?? t);

/* ------------------------------------------------------------------ */
/* Listado                                                             */
/* ------------------------------------------------------------------ */

/**
 * Dibuja los chips de filtro. Son checkboxes reales para que funcionen con
 * teclado y lectores de pantalla sin trabajo extra.
 */
export function renderTagChips(container, tags, active) {
  container.innerHTML = tags
    .map(
      (t) => `
      <label class="chip">
        <input type="checkbox" name="tag" value="${escapeHTML(t.id)}" ${active.has(t.id) ? 'checked' : ''}>
        <span>${escapeHTML(t.label)}</span>
      </label>`
    )
    .join('');
}

/**
 * Dibuja una lista de posts.
 * @param {HTMLElement} container
 * @param {object[]} posts
 * @param {Map} tagsById
 * @param {{featureFirst?: boolean, empty?: string}} options
 */
export function renderPostList(container, posts, tagsById, { featureFirst = true, empty } = {}) {
  container.removeAttribute('aria-busy');

  if (!posts.length) {
    container.innerHTML = `<div class="empty">${empty}</div>`;
    return;
  }

  container.innerHTML = posts
    .map((post, i) => {
      const featured = featureFirst && i === 0;
      const total = post.prepMinutes + post.cookMinutes;
      return `
      <article class="post${featured ? ' post--featured' : ''}">
        <a class="post__art" href="#/receta/${post.slug}" tabindex="-1" aria-hidden="true" data-art="${post.slug}"></a>
        <div class="post__text">
          <h3 class="post__title"><a href="#/receta/${post.slug}">${escapeHTML(post.title)}</a></h3>
          <p class="post__excerpt">${escapeHTML(post.excerpt)}</p>
          <p class="post__meta">
            <span>${formatMinutes(total)}</span>
            <span>${escapeHTML(tagLabels(post, tagsById).join(', '))}</span>
          </p>
        </div>
        ${favButton(post.slug, { compact: true })}
      </article>`;
    })
    .join('');

  // Las rosetas se insertan como nodos SVG (no como texto) después de armar el HTML.
  posts.forEach((post, i) => {
    const slot = container.querySelector(`[data-art="${post.slug}"]`);
    slot?.append(createNanduti(post.nanduti, { detail: featureFirst && i === 0 ? 'full' : 'simple' }));
  });
}

/* ------------------------------------------------------------------ */
/* Detalle de receta                                                   */
/* ------------------------------------------------------------------ */

/** Lista de ingredientes para una cantidad de porciones. */
export function ingredientsHTML(post, servings) {
  const factor = servings / post.servings;
  const checked = new Set(getChecked(post.slug));
  return post.ingredients
    .map((ing, i) => {
      const qty = formatQty(ing.qty * factor, ing.unit);
      const amount = `${qty}${ing.unit ? ` ${escapeHTML(ing.unit)}` : ''}`;
      return `
      <li>
        <label class="check">
          <input type="checkbox" data-ingredient="${i}" ${checked.has(i) ? 'checked' : ''}>
          <span><strong class="check__qty">${amount}</strong> ${escapeHTML(ing.item)}</span>
        </label>
      </li>`;
    })
    .join('');
}

/**
 * Dibuja la vista completa de una receta.
 * @param {HTMLElement} article
 * @param {object} post
 * @param {{tagsById: Map, prev?: object, next?: object}} ctx
 */
export function renderRecipe(article, post, { tagsById, prev, next }) {
  const steps = post.steps
    .map(
      (step, i) => `
      <li class="step">
        <p>${escapeHTML(step.text)}</p>
        ${
          step.minutes
            ? `<button class="timer" type="button" data-timer="${step.minutes * 60}" data-step="${i + 1}"
                 aria-label="Iniciar temporizador de ${step.minutes} minutos para el paso ${i + 1}">
                 <span class="timer__label">Temporizador</span>
                 <span class="timer__time">${step.minutes} min</span>
               </button>`
            : ''
        }
      </li>`
    )
    .join('');

  const story = post.story.map((p) => `<p>${escapeHTML(p)}</p>`).join('');

  const pager = [
    prev ? `<a class="pager__link pager__link--prev" href="#/receta/${prev.slug}"><span>Anterior</span>${escapeHTML(prev.title)}</a>` : '<span></span>',
    next ? `<a class="pager__link pager__link--next" href="#/receta/${next.slug}"><span>Siguiente</span>${escapeHTML(next.title)}</a>` : '<span></span>',
  ].join('');

  article.innerHTML = `
    <div class="container">
      <a class="back-link" href="#recetas">Todas las recetas</a>

      <header class="recipe__header">
        <div class="recipe__art" data-recipe-art></div>
        <div class="recipe__intro">
          <h1 class="recipe__title" tabindex="-1">${escapeHTML(post.title)}</h1>
          <p class="recipe__excerpt">${escapeHTML(post.excerpt)}</p>
          <p class="recipe__byline">Por ${escapeHTML(post.author)}, <time datetime="${post.date}">${formatDate(post.date)}</time></p>
          <dl class="facts">
            <div><dt>Preparación</dt><dd>${formatMinutes(post.prepMinutes)}</dd></div>
            <div><dt>Cocción</dt><dd>${formatMinutes(post.cookMinutes)}</dd></div>
            <div><dt>Rinde</dt><dd>${post.servings} porciones</dd></div>
          </dl>
          <div class="recipe__actions">
            ${favButton(post.slug)}
            <button class="button button--ghost" type="button" data-share>Copiar enlace</button>
          </div>
        </div>
      </header>

      <div class="recipe__story">${story}</div>

      <div class="recipe__body">
        <section class="ingredients" aria-labelledby="ing-titulo">
          <h2 id="ing-titulo" class="recipe__h2">Ingredientes</h2>
          <div class="servings">
            <span id="porciones-label">Porciones</span>
            <div class="stepper" role="group" aria-labelledby="porciones-label">
              <button type="button" data-servings="-1" aria-label="Menos porciones">−</button>
              <output data-servings-value aria-live="polite">${post.servings}</output>
              <button type="button" data-servings="1" aria-label="Más porciones">+</button>
            </div>
          </div>
          <ul class="ingredients__list" data-ingredients>${ingredientsHTML(post, post.servings)}</ul>
          <button class="link-button" type="button" data-clear-checks>Destildar todo</button>
        </section>

        <section class="steps" aria-labelledby="pasos-titulo">
          <h2 id="pasos-titulo" class="recipe__h2">Preparación</h2>
          <ol class="steps__list">${steps}</ol>
        </section>
      </div>

      <nav class="pager" aria-label="Otras recetas">${pager}</nav>
    </div>`;

  article.querySelector('[data-recipe-art]').append(
    createNanduti(post.nanduti, { detail: 'full', label: `Roseta de ñandutí que ilustra ${post.title}` })
  );
  article.dataset.slug = post.slug;
  article.dataset.currentServings = post.servings;
  document.title = `${post.title}, en Tatakua`;
}

/** Vista de error o de receta inexistente, con una salida clara. */
export function renderMessage(container, { title, text, action }) {
  container.innerHTML = `
    <div class="container message">
      <h1 class="page-title" tabindex="-1">${escapeHTML(title)}</h1>
      <p>${escapeHTML(text)}</p>
      ${action || ''}
    </div>`;
}
