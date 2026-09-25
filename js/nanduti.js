/**
 * nanduti.js
 * Genera rosetas de ñandutí (encaje tradicional de Itauguá) como SVG.
 *
 * Cada receta trae en posts.json sus parámetros: cantidad de pétalos,
 * cantidad de anillos y los colores de hilo. Con eso se arma una
 * ilustración única y determinística, sin depender de imágenes externas.
 *
 * Los colores se referencian como variables CSS (--hilo-rosa, etc.)
 * para que cambien solos con el modo oscuro.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const R_MAX = 94; // radio exterior dentro de un viewBox de 200 × 200

/** Punto en coordenadas polares → cartesianas (ángulo en radianes). */
const polar = (r, a) => [+(r * Math.cos(a)).toFixed(2), +(r * Math.sin(a)).toFixed(2)];

/** Convierte un nombre de hilo ("rosa") en una variable CSS. */
const hilo = (name) => `var(--hilo-${name}, currentColor)`;

/* ------------------------------------------------------------------ */
/* Motivos: cada anillo del encaje usa uno de estos dibujos.           */
/* Todos reciben el radio interno (r0), el externo (r1) y la cantidad  */
/* de radios (n) y devuelven el atributo "d" de un <path>.             */
/* ------------------------------------------------------------------ */

/** Festones: arcos que se abren hacia afuera entre radio y radio. */
function festones(r0, r1, n) {
  const step = (Math.PI * 2) / n;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = i * step;
    const [x0, y0] = polar(r0, a);
    const [cx, cy] = polar(r1 * 1.08, a + step / 2);
    const [x1, y1] = polar(r0, a + step);
    d += `M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}`;
  }
  return d;
}

/** Zigzag: el hilo va y vuelve entre dos radios, como un tejido de red. */
function zigzag(r0, r1, n) {
  const step = (Math.PI * 2) / (n * 2);
  let d = '';
  for (let i = 0; i <= n * 2; i++) {
    const [x, y] = polar(i % 2 ? r1 : r0, i * step);
    d += `${i ? 'L' : 'M'}${x} ${y}`;
  }
  return d + 'Z';
}

/** Pétalos: gotas cerradas sobre cada radio. */
function petalos(r0, r1, n) {
  const step = (Math.PI * 2) / n;
  const w = step * 0.32;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = i * step;
    const [x0, y0] = polar(r0, a);
    const [xa, ya] = polar((r0 + r1) / 2, a - w);
    const [xt, yt] = polar(r1, a);
    const [xb, yb] = polar((r0 + r1) / 2, a + w);
    d += `M${x0} ${y0}Q${xa} ${ya} ${xt} ${yt}Q${xb} ${yb} ${x0} ${y0}`;
  }
  return d;
}

/** Nudos: pequeños rombos donde se cruzan los hilos. */
function nudos(r0, r1, n) {
  const step = (Math.PI * 2) / n;
  const rm = (r0 + r1) / 2;
  const s = Math.min((r1 - r0) / 2.4, 5);
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = i * step + step / 2;
    const [x, y] = polar(rm, a);
    d += `M${x} ${y - s}L${x + s} ${y}L${x} ${y + s}L${x - s} ${y}Z`;
  }
  return d;
}

const MOTIVOS = [petalos, zigzag, festones, nudos];

/** Crea un elemento SVG con atributos. */
function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/**
 * Dibuja una roseta.
 * @param {{petals:number, rings:number, colors:string[]}} params
 * @param {{detail?: 'full'|'simple', label?: string}} options
 * @returns {SVGSVGElement}
 */
export function createNanduti(params, { detail = 'full', label } = {}) {
  const { petals = 12, rings = 4, colors = ['rosa', 'amarillo', 'verde'] } = params || {};
  const spokes = petals * 2;

  const svg = el('svg', { viewBox: '-100 -100 200 200', class: 'nanduti' });
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
  }

  // 1) Urdimbre: los hilos radiales que sostienen todo el encaje.
  const urdimbre = el('g', { class: 'nanduti__warp', 'data-ring': 0 });
  let warp = '';
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const [x0, y0] = polar(6, a);
    const [x1, y1] = polar(R_MAX, a);
    warp += `M${x0} ${y0}L${x1} ${y1}`;
  }
  urdimbre.append(el('path', { d: warp, pathLength: 1 }));
  urdimbre.append(el('circle', { r: R_MAX, pathLength: 1 }));
  svg.append(urdimbre);

  // 2) Anillos de motivos, del centro hacia afuera.
  const inner = 14;
  const band = (R_MAX - inner) / rings;
  for (let k = 0; k < rings; k++) {
    const r0 = inner + band * k + (k ? 2 : 0);
    const r1 = inner + band * (k + 1) - 2;
    // Los anillos simples (miniaturas) alternan menos motivos para leerse a tamaño chico.
    const motivo = detail === 'simple' ? MOTIVOS[k % 2 ? 2 : 0] : MOTIVOS[(k + petals) % MOTIVOS.length];
    const n = motivo === nudos || motivo === zigzag ? spokes : petals;
    const color = hilo(colors[k % colors.length]);

    const g = el('g', { class: 'nanduti__ring', 'data-ring': k + 1, style: `--i:${k + 1}` });
    g.append(el('path', { d: motivo(r0, r1, n), stroke: color, pathLength: 1 }));
    if (detail === 'full') {
      // Un círculo fino marca el borde de cada banda, como el hilo guía del tejido.
      g.append(el('circle', { r: r1 + 1, stroke: color, class: 'nanduti__guide', pathLength: 1 }));
    }
    svg.append(g);
  }

  // 3) Centro: el nudo donde empieza el tejido.
  const centro = el('g', { class: 'nanduti__center', style: '--i:0' });
  centro.append(el('path', { d: petalos(2, 12, Math.min(petals, 8)), stroke: hilo(colors[0]), pathLength: 1 }));
  centro.append(el('circle', { r: 2.6, fill: hilo(colors[1 % colors.length]) }));
  svg.append(centro);

  return svg;
}

/**
 * Busca todos los contenedores con un atributo dado y les inserta una roseta.
 * Útil para los elementos fijos del HTML (logo y portada).
 */
export function mountNanduti(selector, params, options) {
  document.querySelectorAll(selector).forEach((node) => {
    node.replaceChildren(createNanduti(params, options));
  });
}
