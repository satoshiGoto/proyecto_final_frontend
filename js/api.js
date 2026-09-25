/**
 * api.js
 * Consumo de datos. Las recetas viven en data/posts.json y se piden con fetch,
 * igual que se haría con una API REST. Si mañana hay un backend, solo cambia API_URL.
 */

const API_URL = 'data/posts.json';

let cache = null; // Se guarda la respuesta para no repetir la petición al navegar.

/**
 * Devuelve { blog, tags, posts } con los posts ordenados del más nuevo al más viejo.
 * @throws {Error} con un mensaje pensado para mostrar en pantalla.
 */
export async function getBlog() {
  if (cache) return cache;

  let response;
  try {
    response = await fetch(API_URL, { headers: { Accept: 'application/json' } });
  } catch {
    // fetch falla así cuando no hay red o cuando se abre index.html con doble clic (file://).
    throw new Error('No se pudieron cargar las recetas. Si abriste el archivo directamente, abrilo con un servidor local (por ejemplo, Live Server).');
  }

  if (!response.ok) {
    throw new Error(`El servidor respondió ${response.status} al pedir las recetas. Probá de nuevo en unos segundos.`);
  }

  const data = await response.json();
  data.posts.sort((a, b) => b.date.localeCompare(a.date));
  cache = data;
  return data;
}

/** Busca un post por su slug. Devuelve undefined si no existe. */
export async function getPost(slug) {
  const { posts } = await getBlog();
  return posts.find((p) => p.slug === slug);
}
