# MDAs Casino — Handover Técnico

> **Repo**: `iskyhigh00/mda-quiz-test` | **Branch de desarrollo**: `claude/photoat-function-refactor-JxZrt`
> **Deploy**: GitHub Pages (rama `main`) | **Backend**: Supabase
> **Última actualización**: 2026-06-03

---

## 1. Descripción del proyecto

SPA (Single Page Application) para Casino Dreams Temuco. Permite:
- **Catálogo** de máquinas tragamonedas con fotos, slideshow automático y lightbox
- **Quiz** de identificación de máquinas por foto (5/10/20 preguntas, puntuación en tiempo real)
- **Muerte Súbita** cuando un jugador empata o supera al líder
- **Ranking** de la competencia actual
- **Historial** de ganadores por período
- **Admin** con acceso por clave horaria, gestión de modelos/fotos, estadísticas, paletas de color

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | HTML5 + CSS3 + Vanilla JS (sin frameworks) |
| Backend/DB | Supabase (PostgreSQL + Storage) |
| Hosting | GitHub Pages |
| PWA | Service Worker (`sw.js`), `manifest.json`, iconos PNG maskable |
| Auth admin | Clave horaria (sin login real) |

---

## 3. Estructura de archivos

```
/
├── index.html          # SPA completa — todo el HTML en un archivo
├── style.css           # Estilos + CSS custom properties (--accent, etc.)
├── manifest.json       # PWA manifest (iconos, start_url, scope)
├── sw.js               # Service Worker (cache shell + imágenes separadas)
├── icons/
│   ├── icon-192.png    # PWA icon any-purpose
│   ├── icon-512.png    # PWA icon any-purpose
│   ├── icon-192-maskable.png  # PWA icon maskable (requerido Chrome)
│   ├── icon.svg        # SVG source
│   └── icon-maskable.svg
└── js/
    ├── config.js       # SUPABASE_URL, SUPABASE_KEY, helpers globales
    ├── api.js          # sbGet/sbPost/sbPatch/sbDelete/sbFetch, uploadPhoto
    ├── storage.js      # localStorage helpers, playerName, MACHINES global
    ├── ui.js           # goTo(), openModal(), setSyncBadge(), initApp()
    ├── catalog.js      # buildCatalog(), slideshow, lightbox, swipe
    ├── quiz.js         # runQuiz(), sudden death, scoring
    ├── ranking.js      # loadRanking(), loadWinnersHistory()
    ├── admin.js        # Admin UI, COLOR_PALETTES, stats, scores mgmt
    └── main.js         # Inicialización + SW registration
```

---

## 4. Variables globales clave (js/storage.js o globales)

```js
let MACHINES = [];          // Array de objetos máquina cargados desde Supabase
let playerName = '';        // Nombre del jugador actual
let adminUnlocked = false;  // Flag de admin desbloqueado
let galleryPhotos = [];     // Fotos de la máquina en el lightbox activo
let galleryIdx = 0;         // Índice actual en lightbox
let lbMachineId = null;     // ID de la máquina en lightbox activo
let maxPtsConfig = { 5: 1000, 10: 1200, 20: 1300 }; // Límites de puntos por modalidad
let currentSeason = () => { /* genera string "comp_YYYY-MM" */ }
```

---

## 5. Supabase — Tablas

| Tabla | Columnas clave |
|---|---|
| `machines` | `id, name, sort_order, photo_url (string), photo_urls (jsonb array de {url,uploaded_by,uploaded_at})` |
| `scores` | `id, name, pts, accuracy, total, timer_sec, season, completed, created_at` |
| `winners_history` | `id, player_name, pts, rank, season_ref, reset_date, period_label, prize` |
| `machine_notes` | `id, machine_id, author, note, created_at` |
| `settings` | `key, value` (ej: `max_pts_5=1000`, `prize=...`) |

**Storage bucket**: `machine-photos` (público)

---

## 6. Funciones de fotos (js/api.js o config.js)

```js
photoUrl(p)        // → string URL (p puede ser string o {url,uploaded_by,uploaded_at})
photoBy(p)         // → uploaded_by o ''
photoAt(p)         // → uploaded_at (ISO) o ''
getImgUrl(url)     // → URL completa de Supabase Storage (agrega base si path relativo)
makeFilename(id, suffix) // → string filename para Storage
makePhotoEntry(url, author) // → {url, uploaded_by, uploaded_at: new Date().toISOString()}
uploadPhoto(file, filename) // → Promise<url string>
```

---

## 7. Paletas de color (js/admin.js → COLOR_PALETTES)

10 paletas en el objeto `COLOR_PALETTES`. Se aplican vía CSS custom properties en `:root`. Claves del objeto: `noche, casino, neon, esmeralda, zafiro, onix, granate, indigo, ambar, titanio`.

```js
applyPalette(key)    // aplica paleta y guarda en localStorage
loadSavedPalette()   // carga desde localStorage (default: 'noche')
```

**Variables CSS usadas**: `--bg, --surface, --card, --accent, --accent2, --gold, --green, --red, --text, --muted, --border`

**Regla de contraste**: `--accent` es usado como fondo de botones con `color: #fff`. Debe tener contraste ≥ 4.5:1 con blanco. Los botones tipo gradient usan `color-mix(in srgb, var(--accent2) 55%, #000)` para oscurecer el `--accent2`.

---

## 8. Quiz y Muerte Súbita (js/quiz.js)

- Puntuación: máximo `_sdPts` pts por pregunta (empieza en 5), decrece 1pt cada 400ms
- Sin penalización por respuesta incorrecta
- **Muerte Súbita** se activa cuando `score >= maxPts` O cuando `score >= top[0].pts` (empate con líder, solo si hay jugadores previos)
- `runSuddenDeath()`: una pregunta extra, empieza con 5pts
- `maxPtsConfig[n]`: límite de puntos para n preguntas (configurable desde admin)

---

## 9. Service Worker (sw.js)

```
CACHE = 'mda-v3'        → shell de la app (JS, CSS, HTML, iconos)
IMG_CACHE = 'mda-images-v1'  → imágenes de máquinas (cache-first)
```

- `install`: cachea SHELL + `skipWaiting()`
- `activate`: elimina caches viejos excepto CACHE e IMG_CACHE + `clients.claim()`
- `fetch`: imágenes → cache-first en IMG_CACHE; API Supabase → siempre red; shell → cache-first en CACHE
- **Auto-update en app**: `main.js` escucha `controllerchange` y recarga si ya había controller (guard `hadController`)

---

## 10. Lightbox y Swipe (js/catalog.js)

- `openGallery(m)`: abre lightbox con fotos de la máquina
- `renderGalleryPhoto()`: actualiza `#lb-img`, flechas y metadatos
- `renderLbThumbs()`: actualiza miniaturas
- **Swipe real-time**: `initLbSwipe()` usa `touchstart/touchmove/touchend` para seguir el dedo, muestra foto adyacente con `position:absolute; inset:16px`, completa o hace spring-back con `cubic-bezier(0.4,0,0.2,1)`
- `_lbSideImg`: imagen lateral inyectada durante el swipe
- El contenedor `.lb-img` tiene `overflow: hidden` para clipear el swipe

---

## 11. Slideshow automático (js/catalog.js)

```js
startCatalogSlideshow()   // inicia intervalos para máquinas con 2+ fotos
stopCatalogSlideshow()    // limpia intervalos
_doSlide(id)              // desliza foto en tarjeta con translateX CSS
```

- Primer tick: 600ms después de `buildCatalog()`
- Intervalo: 1800ms, máquina aleatoria
- Animación: translateX slide de 550ms, cubic-bezier(0.4,0,0.2,1)

---

## 12. Transiciones y UX premium

- **Vistas**: `@keyframes fadeInView` (opacity + translateY) al activar `.view.active`
- **Botones**: `.btn:active`, `.start-btn:active`, `.play-again:active`, `.chip:active`, `.opt:active`, `.lb-close:active` → `scale()` + `opacity`
- **Tarjetas**: `.card:active { transform: scale(0.97) }`
- **Lightbox**: `@keyframes popIn` al abrir

---

## 13. PWA

- `manifest.json`: `start_url: "./index.html"`, `scope: "./"`, iconos 192 (any) + 512 (any) + 192 (maskable)
- Para que Chrome muestre "Instalar": requiere ícono maskable PNG (no SVG)
- **Actualización automática**: al mergear a `main`, nuevo SW se activa → `controllerchange` → `location.reload()`. El usuario debe abrir Chrome (no PWA) la primera vez para activar el nuevo SW.

---

## 14. Admin

- Acceso: clave horaria (función `getClaveHora()` en config.js)
- Tabs: Competencia, Modelos, Estadísticas, Historial
- Selector de paleta: `<select id="palette-select">` → `applyPalette()`
- Gestión de fotos: `openPhotos(id)`, `renderPhotosGrid()`, `addPhotos()`
- Reset competencia: guarda ganador en `winners_history`, resetea `scores`
- Configuración de límite de puntos: `saveMaxPts()` → tabla `settings`

---

## 15. Estado actual y tareas pendientes

### Completado (sesiones anteriores)
- [x] Muerte súbita: 5pts/pregunta, decrece 1pt/400ms, sin penalización
- [x] Bug SD: no se activa para el primer jugador
- [x] PWA instalable: iconos PNG maskable
- [x] Quiz chips muestran puntaje máximo (motivación)
- [x] Rediseño visual: paleta coherente, tipografía Inter, sin naranjas excesivos
- [x] Slideshow automático en catálogo (translateX smooth)
- [x] 10 paletas de color en admin con selector desplegable
- [x] Contraste corregido: 6 paletas tenían acento de bajo contraste con texto blanco
- [x] Swipe lightbox en tiempo real (sigue el dedo + preview foto adyacente)
- [x] Transiciones premium (fade-in vistas, scale botones/cards)
- [x] Caché de imágenes en Service Worker (IMG_CACHE separado)
- [x] Auto-reload al actualizar SW (controllerchange + hadController guard)

### Pendiente / Mejoras posibles
- [ ] Mostrar `uploaded_at` en lightbox (fecha de la foto) — función `photoAt()` ya existe
- [ ] Resistencia de swipe en extremos de galería (primera/última foto)
- [ ] Animación de entrada en Muerte Súbita
- [ ] Notificaciones push para nuevas fotos/datos curiosos
- [ ] Modo oscuro/claro per-palette (actualmente siempre oscuro)

---

## 16. Cómo desplegar cambios

1. Hacer cambios en `claude/photoat-function-refactor-JxZrt`
2. Crear PR → merge a `main` → GitHub Pages lo despliega automáticamente
3. El Service Worker (`mda-v3`) detecta cambios y auto-recarga en clientes activos

**Para forzar actualización en PWA instalada**:
- Abrir Chrome normal (no PWA) → navegar a la URL → el nuevo SW activa → recarga automática
- O: Configuración Chrome → Apps → Casino MDAs → Limpiar datos

---

## 17. Variables de entorno / configuración

En `js/config.js` (no subir claves reales al repo):
```js
const SUPABASE_URL = 'https://xxx.supabase.co';
const SUPABASE_KEY = 'eyJ...'; // anon key pública (Row Level Security en Supabase)
```

La `SUPABASE_KEY` es la anon/public key de Supabase. Las operaciones sensibles (eliminar, editar) están protegidas por la clave de admin de la app (no por Supabase auth).
