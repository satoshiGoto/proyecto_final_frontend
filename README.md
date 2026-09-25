# Tatakua: cocina paraguaya de casa

Blog de recetas paraguayas con artículos dinámicos. Es el proyecto final del módulo de Frontend (clase 25): HTML semántico, CSS responsivo y JavaScript con consumo de datos, sin frameworks ni dependencias.

## Cómo verlo

Las recetas se piden con `fetch` a `data/posts.json`, así que el sitio necesita un servidor local (abrir `index.html` con doble clic bloquea la petición y la página muestra un aviso).

```bash
# Opción 1: extensión Live Server de VS Code → "Open with Live Server"
# Opción 2: Python
python3 -m http.server 5500
# y abrir http://localhost:5500
```

## Qué cubre de la consigna

| Criterio | Dónde está |
| --- | --- |
| Estructura HTML semántica y accesible | `index.html`: `header`, `nav`, `main`, `section`, `article`, `footer`, formularios con `label`, `fieldset`/`legend`, enlace para saltar al contenido, `aria-live` en mensajes, `aria-pressed` en botones de estado |
| Diseño responsivo | `css/styles.css`: mobile first, grillas con `grid`, puntos de corte en 30, 48, 52 y 56 rem, tipografía fluida con `clamp()`, menú plegable en móvil |
| Interactividad con JavaScript | Búsqueda por nombre o ingrediente, filtros por etiqueta, orden, favoritas, ajuste de porciones, lista de ingredientes tildable, temporizadores por paso, copiar enlace, modo oscuro, validación de formulario |
| Consumo de API | `js/api.js`: `fetch` con manejo de errores (sin red, `file://`, respuesta distinta de 200) y botón para reintentar |
| Animaciones | La roseta de la portada se "teje" del centro hacia afuera al cargar; el corazón late al guardar. Se desactivan con `prefers-reduced-motion` |
| Código limpio y comentado | Módulos ES separados por responsabilidad, comentarios en español en cada archivo |
| Git/GitHub | Ramas `develop` y `feature/*`, commits pequeños con mensajes descriptivos (ver abajo) |

## Estructura

```
proyecto_final_frontend/
├── index.html          # Estructura de las tres vistas: inicio, receta y favoritas
├── css/
│   └── styles.css      # Tokens, componentes, vistas y modo oscuro
├── js/
│   ├── main.js         # Arranque, router por hash, eventos y formulario
│   ├── api.js          # fetch de las recetas con caché y errores legibles
│   ├── views.js        # Funciones que convierten datos en HTML
│   ├── nanduti.js      # Generador de rosetas de ñandutí en SVG
│   ├── store.js        # localStorage: favoritas, ingredientes tildados y tema
│   └── utils.js        # Formato de fechas, cantidades, búsqueda sin tildes
├── data/
│   └── posts.json      # Las 8 recetas (hace las veces de API REST)
└── assets/
    └── favicon.svg
```

### Rutas

| URL | Vista |
| --- | --- |
| `#/` | Inicio con el listado |
| `#/receta/sopa-paraguaya` | Detalle de una receta |
| `#/favoritas` | Recetas guardadas en este navegador |
| `#recetas`, `#sobre`, `#contacto` | Anclas dentro del inicio |

Para sumar una receta alcanza con agregar un objeto a `posts` en `data/posts.json`. La ilustración se genera sola a partir de `nanduti: { petals, rings, colors }`.

## Diseño

Se siguió la skill `frontend-design` incluida en `.agents/skills`: primero un plan de diseño, revisarlo contra la consigna y recién después programar.

**Tema.** Un blog de recetas caseras paraguayas para quien cocina en casa, incluidos paraguayos que viven afuera. Su trabajo principal es que una receta se pueda seguir con las manos ocupadas.

**Elemento distintivo.** En lugar de fotos, cada receta tiene una roseta de ñandutí, el encaje de Itauguá, generada con SVG a partir de sus datos. Es el único lugar donde se usan muchos colores; el resto de la interfaz es sobria.

**Paleta.**

| Nombre | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| Papel | `#FFFFFF` | `#151A3F` | Fondo |
| Tinta añil | `#1D2352` | `#EEF0FA` | Texto y botones (en lugar de negro) |
| Acento rosa | `#C2255C` | `#FF7AA8` | Foco, estados activos, números de pasos |
| Hilos | rosa `#D6336C`, amarillo `#E89B0C`, verde `#23936A`, celeste `#2F8FCB` | versiones más luminosas | Solo en las rosetas |

**Tipografía.** Alegreya para el texto corrido (serif humanista, cómoda para leer recetas y con soporte para las tildes del guaraní) y Alegreya Sans en peso 800 a 900 para títulos e interfaz. Escala modular 1,25 sobre 18 px y líneas de hasta unos 70 caracteres.

**Decisiones revisadas contra la consigna.**
- Se evitó el fondo crema con acento terracota, que es la elección obvia para "cocina casera"; se usa blanco frío y añil, los colores del ñandutí sobre tela.
- El listado no usa tarjetas con sombra: son filas separadas por líneas finas, con la receta más reciente destacada a todo el ancho.
- La numeración grande se usa solo en los pasos, porque son una secuencia real.
- Hay una sola animación automática (el tejido de la roseta); el resto del movimiento responde a acciones del usuario.

### Prototipo (wireframes para Figma)

Wireframes de baja fidelidad para pasar a Figma con un frame de escritorio (1440) y uno móvil (390).

Inicio, escritorio:

```
┌──────────────────────────────────────────────────────────────┐
│ (✺) Tatakua          Recetas  Favoritas  Sobre  Contacto  [☾] │
├──────────────────────────────────────────────────────────────┤
│  TATAKUA                        ╭───────────╮                 │
│  Recetas paraguayas como…       │  roseta   │                 │
│  El tatakua es el horno…        │  grande   │                 │
│  [Ver las recetas]              ╰───────────╯                 │
├──────────────────────────────────────────────────────────────┤
│ Recetas                                            8 recetas  │
│ [Buscar receta o ingrediente……………]      [Ordenar ▾]          │
│ (Al horno) (En sartén) (En olla) (Sin fuego) (Semana Santa)   │
├──────────────────────────────────────────────────────────────┤
│ (roseta)  Sopa paraguaya  (destacada, todo el ancho)          │
│           bajada · tiempo · etiqueta · [♡ Guardar]            │
├──────────────────────────────┬───────────────────────────────┤
│ (✺) Chipa almidón            │ (✺) Vori vori de gallina       │
│ (✺) Tereré con yuyos         │ (✺) Chipa guasu                │
└──────────────────────────────┴───────────────────────────────┘
│ Sobre el blog      │ dos párrafos                             │
│ Mandá tu receta    │ Nombre / Correo / Receta / Mensaje       │
```

Receta, escritorio:

```
┌──────────────────────────────────────────────────────────────┐
│ ← Todas las recetas                                           │
│ ╭────────╮  SOPA PARAGUAYA                                    │
│ │ roseta │  bajada, autor y fecha                             │
│ ╰────────╯  Preparación | Cocción | Rinde   [♡ Guardar] [Copiar]│
├──────────────────────────────────────────────────────────────┤
│ Historia (letra capitular, 2 párrafos)                        │
├───────────────────────┬──────────────────────────────────────┤
│ Ingredientes (fijo)   │ Preparación                           │
│ Porciones [− 8 +]     │ 1  texto del paso   [Temporizador 10] │
│ ☐ 500 g harina        │ 2  texto del paso                     │
│ ☐ 2 cebollas          │ 3  …                                  │
├───────────────────────┴──────────────────────────────────────┤
│ Anterior: Chipa almidón                    Siguiente: …       │
```

En móvil todo pasa a una columna, el menú se pliega detrás de un botón y los ingredientes van antes que los pasos.

## Flujo de trabajo con Git

```bash
# 1. Inicializar (ya hecho) y enlazar con GitHub
git init
git remote add origin git@github.com:satoshiGoto/proyecto_final_frontend.git

# 2. Rama de integración
git checkout -b develop

# 3. Una rama por funcionalidad, que se une a develop al terminarla
git checkout -b feature/estructura-html
git add index.html data/ assets/
git commit -m "feat: estructura HTML semántica y datos de recetas"
git checkout develop
git merge --no-ff feature/estructura-html

# 4. Subir y abrir un Pull Request de develop a main en GitHub
git push -u origin develop
```

Ramas usadas en este proyecto:

- `feature/estructura-html`: HTML semántico, datos y favicon
- `feature/estilos`: hoja de estilos responsiva y modo oscuro
- `feature/interactividad`: módulos de JavaScript
- `docs/readme`: esta documentación

El archivo `.gitignore` evita subir `node_modules`, archivos de entorno (`.env`), cachés y archivos del sistema como `.DS_Store`.

## Accesibilidad

- Contraste AA en texto y controles, en modo claro y oscuro
- Todo se puede usar con teclado, con foco visible en rosa
- Los filtros son checkboxes reales; los botones de estado usan `aria-pressed`
- Los errores del formulario se anuncian y están asociados a su campo con `aria-describedby`
- Al cambiar de vista, el foco pasa al título nuevo
- Se respeta `prefers-reduced-motion` y `prefers-color-scheme`

## Créditos

Recetas y textos escritos para este proyecto. Tipografías Alegreya y Alegreya Sans de Juan Pablo del Peral (Huerta Tipográfica), vía Google Fonts, con licencia OFL.
