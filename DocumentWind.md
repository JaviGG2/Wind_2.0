# DocumentWind — Documentación Técnica

> Wind 2.0 — Plataforma cultural para Santa Ana de Coro, Venezuela.
> Preservación de historia, gamificación y comunidad.

---

## Índice

1. [Visión General](#1-visión-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura](#3-arquitectura)
4. [Estructura de Archivos](#4-estructura-de-archivos)
5. [Página de Aniversario (aniversario-coro.html)](#5-página-de-aniversario)
6. [Dashboard (dashboard.js)](#6-dashboard)
7. [Sistema de Juegos (play-game.js)](#7-sistema-de-juegos)
8. [Página Principal (home.js)](#8-página-principal)
9. [Comunidad / Relatos (comunidad.js)](#9-comunidad--relatos)
10. [Notificaciones (notificaciones.js)](#10-notificaciones)
11. [Módulos Educativos (modulos.js)](#11-módulos-educativos)
12. [Servidor — app.js](#12-servidor--appjs)
13. [Utilidades del Servidor](#13-utilidades-del-servidor)
14. [API Endpoints](#14-api-endpoints)

---

## 1. Visión General

**Wind** es una plataforma web dedicada a preservar y difundir la historia, cultura y patrimonio de **Santa Ana de Coro** (Venezuela). Los usuarios pueden:

- Explorar temas históricos con imágenes y geolocalización.
- Jugar trivias, memory games, juegos de emparejar y scramblee.
- Completar módulos educativos con niveles progresivos.
- Publicar relatos comunitarios.
- Seguir a otros usuarios y recibir notificaciones.
- Ganar puntos, XP, rachas y rangos de reputación.
- Crear postales personalizadas para fechas especiales.

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Backend** | Node.js + Express |
| **Templating** | Nunjucks (HTML sobre Express) |
| **Base de datos** | PostgreSQL (Neon) con `pg` pool |
| **Almacenamiento** | Supabase (fotos de relatos) |
| **Autenticación** | express-session + bcryptjs |
| **Avatares** | DiceBear (9 estilos SVG) |
| **Correo** | SendGrid + Nodemailer (fallback SMTP) |
| **Frontend** | Vanilla JS, CSS3, Google Fonts, Material Symbols |
| **Estático** | Servido por Express sobre `public/` |
| **PWA** | Service Worker con cache dinámico |

---

## 3. Arquitectura

```
Cliente (Navegador)
    ↕ Fetch / XHR
Express (app.js)
    ↕
Rutas (routes/*.js)
    ↕ Middleware (autenticacion.js, subidaImagen.js)
    ↕
Controladores (controllers/*.js) + Utilidades (utils/*.js)
    ↕
Base de datos (config/db.js) + Supabase (config/supabase.js)
```

### Flujo de una petición típica

1. El navegador carga una URL (ej. `/home`).
2. `app.js` renderiza la vista Nunjucks (`home.html`).
3. El HTML incluye `<script src="/js/home.js">`.
4. `home.js` hace `fetch('/api/temas')` al cargar.
5. La ruta `/api/temas` llama al controlador `temaController.listar`.
6. El controlador consulta PostgreSQL y devuelve JSON.
7. `home.js` pinta las tarjetas de temas en el DOM.

---

## 4. Estructura de Archivos

```
Wind_2.0/
├── app.js                    # Entry point del servidor
├── server.js                 # Servidor alternativo simple
├── respaldo.js               # Utilidad de backup BD
├── .env                      # Variables de entorno (no pública)
├── package.json              # Dependencias npm
│
├── config/
│   ├── db.js                 # Conexión PostgreSQL (pool)
│   └── supabase.js           # Cliente Supabase
│
├── middlewares/
│   ├── autenticacion.js      # verificarSesion, esEspecialista
│   └── subidaImagen.js       # Multer + subida a Supabase
│
├── utils/
│   ├── filter.js             # Filtro de malas palabras
│   ├── palabras-prohibidas.js# Lista de 22 palabras prohibidas
│   ├── niveles.js            # Cálculo de nivel (sqrt)
│   ├── reputacion.js         # Cálculo de rango de reputación
│   ├── rachas.js             # Racha diaria de creación
│   └── recomendador.js       # Recomendador por categorías
│
├── routes/
│   ├── authRoutes.js         # 20 rutas de autenticación
│   ├── temaRoutes.js         # 8 rutas de temas
│   ├── juegoRoutes.js        # 9 rutas de juegos
│   ├── moduloRoutes.js       # 11 rutas de módulos
│   ├── relatoRoutes.js       # 5 rutas de relatos
│   ├── comentarioRoutes.js   # 3 rutas de comentarios
│   ├── searchRoutes.js       # Búsqueda full-text
│   ├── historialRoutes.js    # Historial de vistas
│   ├── notificacionRoutes.js # 5 rutas de notificaciones
│   ├── recomendacionRoutes.js# 3 rutas de recomendaciones
│   ├── feedbackRoutes.js     # 3 rutas de feedback
│   └── denunciaRoutes.js     # 3 rutas de denuncias
│
├── controllers/
│   ├── authController.js     # Registro, login, perfil, contraseña
│   ├── temaController.js     # CRUD temas + likes
│   ├── juegoController.js    # CRUD juegos + respuestas
│   ├── moduloController.js   # CRUD módulos + niveles
│   ├── relatoController.js   # CRUD relatos comunitarios
│   ├── comentarioController.js# CRUD comentarios
│   ├── searchController.js   # Búsqueda PostgreSQL
│   ├── notificacionController.js# Crear/listar/marcar notificaciones
│   ├── historialController.js# Historial de vistas
│   ├── recomendacionController.js# Envoltorio del recomendador
│   ├── feedbackController.js # CRUD feedback
│   ├── denunciaController.js # CRUD denuncias
│   ├── seguidoresController.js# Seguir/dejar de seguir
│   └── traduccionController.js# Proxy Google Translate
│
├── views/                    # 38+ plantillas Nunjucks
│   ├── aniversario-coro.html # Página 499 años (con JS inline)
│   ├── dashboard.html        # Panel de usuario
│   ├── home.html             # Página principal
│   ├── juegos.html           # Listado de juegos
│   ├── play-game.html        # Jugar un juego
│   ├── modulos.html          # Módulos educativos
│   ├── sw.js                 # Service Worker template
│   └── ...                   # login, registro, comunidad, etc.
│
├── public/
│   ├── css/                  # 33+ hojas de estilo
│   │   ├── base.css
│   │   ├── estilos.css
│   │   ├── dashboard.css
│   │   ├── aniversario-coro.css
│   │   └── ...
│   ├── js/                   # 49+ scripts cliente
│   │   ├── dashboard.js
│   │   ├── home.js
│   │   ├── play-game.js
│   │   ├── modulos.js
│   │   ├── comunidad.js
│   │   ├── notificaciones.js
│   │   ├── popup-valoracion.js
│   │   └── ...
│   ├── img/                  # 27 imágenes
│   └── uploads/              # Archivos subidos por usuarios
│
└── scripts/                  # Scripts de soporte
    ├── keepalive.js
    └── geocodificar-temas.js
```

---

## 5. Página de Aniversario

> Archivo: `views/aniversario-coro.html`

Página conmemorativa por los **499 años de Santa Ana de Coro**. Todo el JS está inline en un solo `<script>` al final del `<body>`.

### Variables de estado

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `nombre` | string | Nombre del usuario autenticado |
| `imagenesCoro` | array[] | Lista de imágenes obtenidas de Wikimedia |
| `indiceActual` | number | Índice de la imagen mostrada actualmente |
| `imagenActual` | HTMLImageElement | Objeto Image de la foto actual |
| `imagenesCargadas` | boolean | Si ya se obtuvieron las imágenes |

### Funciones

#### `DOMContentLoaded` (async)
- **Qué hace**: Inicializa todo al cargar la página.
- **Flujo**:
  1. Obtiene referencias a todos los elementos del DOM.
  2. Intenta cargar el perfil del usuario (`/auth/perfil`) para autocompletar el nombre.
  3. Conecta eventos de abrir/cerrar popup.
  4. Muestra datos curiosos rotativos cada 5s.
  5. Calcula el progreso hacia los 500 años.

#### `cargarImagenes()`
- **Qué hace**: Busca imágenes de Coro en Wikimedia Commons.
- **Parámetros**: Ninguno.
- **Retorno**: `void` (asíncrono, modifica `imagenesCoro` e `imagenesCargadas`).
- **Flujo**:
  1. Muestra spinner de carga.
  2. Recorre 5 categorías de Wikimedia (`Santa_Ana_de_Coro`, `Coro,_Venezuela`, etc.).
  3. Por cada categoría, consulta la API de Wikimedia (`categorymembers`).
  4. Filtra solo imágenes JPEG/PNG ≥ 600px de ancho.
  5. Baraja (shuffle) el array resultante.
  6. Llama a `aplicarImagen(0)` para mostrar la primera.
- **API Wikimedia usada**: `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&prop=imageinfo&origin=*`

#### `mostrarEstado(mensaje)`
- **Qué hace**: Muestra un placeholder con spinner y mensaje en el área de la postal.
- **Parámetros**: `mensaje` (string) — texto a mostrar.
- **Retorno**: `void`

#### `mostrarImagenEnPostal(img)`
- **Qué hace**: Dibuja la imagen seleccionada en el canvas de preview y superpone el texto.
- **Parámetros**: `img` (HTMLImageElement) — imagen cargada.
- **Retorno**: `void`
- **Flujo**:
  1. Calcula dimensiones responsivas del canvas (max 560px de ancho, 380px de alto).
  2. Dibuja la imagen en el canvas de preview.
  3. Llama a `dibujarTextoEnPreview(w, h)`.

#### `dibujarTextoEnPreview(w, h)`
- **Qué hace**: Superpone las 4 líneas de texto sobre la imagen en el canvas de preview.
- **Parámetros**: `w` (ancho canvas), `h` (alto canvas).
- **Retorno**: `void`
- **Líneas dibujadas** (de arriba a abajo):
  1. `"¡Yo tambien celebro!"` — blanco, 6% del alto, en `y = h * 0.10`.
  2. `"¡499 años de Coro!"` — dorado `#fce4c4`, 60% del fontSize título, en `y = h * 0.10 + fontSizeTitulo * 0.7`.
  3. `[nombre del usuario]` — dorado, 4.5% del alto, en `y = h * 0.82` (solo si hay texto).
  4. `"Unete y preservemos nuestra historia"` — blanco, 3.5% del alto, en `y = h * 0.88`.
- Usa `shadowColor`, `shadowBlur` y `shadowOffset` para dar efecto de sombra al texto.

#### `aplicarImagen(indice)`
- **Qué hace**: Carga una imagen desde la URL almacenada y la muestra.
- **Parámetros**: `indice` (number) — posición en `imagenesCoro`.
- **Retorno**: `void`
- **Flujo**:
  1. Crea un `new Image()` con `crossOrigin = 'anonymous'`.
  2. En `onload`: llama a `mostrarImagenEnPostal(img)` y actualiza el crédito de Wikimedia.
  3. En `onerror`: intenta con la siguiente imagen del array.

#### `renderizarCompleto()` (async)
- **Qué hace**: Renderiza la postal en **resolución completa** (tamaño natural de la imagen) en un canvas oculto.
- **Retorno**: `string | null` — Data URL en PNG, o `null` si no hay imagen o texto.
- **Flujo**:
  1. Redimensiona el canvas oculto (`canvas-offscreen`) al tamaño natural de la imagen.
  2. Dibuja la imagen.
  3. Superpone el mismo texto que en preview pero con tamaños proporcionales al alto real.
  4. Retorna `canvasOff.toDataURL('image/png')`.

#### `mostrarToast(mensaje, icono)`
- **Qué hace**: Muestra una notificación temporal tipo toast.
- **Parámetros**: `mensaje` (string), `icono` (string, opcional) — nombre del icono Material Symbols.
- **Retorno**: `void`
- **Comportamiento**: Aparece 3 segundos y se desvanece.

#### Botón **Descargar**
- **Evento**: `click` en `#btn-descargar`.
- **Flujo**:
  1. Valida que haya texto e imagen.
  2. Llama a `renderizarCompleto()`.
  3. Crea un `<a>` temporal con `href = dataUrl` y `download = "postal_499_coro_[nombre].png"`.
  4. Dispara el clic y remueve el enlace.
  5. Muestra toast de éxito.

#### Botón **Compartir en WhatsApp**
- **Evento**: `click` en `#btn-whatsapp`.
- **Flujo**:
  1. Valida texto e imagen.
  2. Llama a `renderizarCompleto()`.
  3. Intenta usar **Web Share API** (`navigator.share` con archivo). Si funciona, comparte directamente.
  4. Si no (o si falla): descarga la imagen + abre `https://wa.me/?text=...` con mensaje predefinido.

#### Botón **Otra imagen**
- **Evento**: `click` en `#btn-cambiar-imagen`.
- **Comportamiento**: Avanza al siguiente índice en `imagenesCoro` (cíclico).

#### Datos curiosos
- Array `datosCoro` con 10 datos históricos sobre Coro.
- Rota cada 5 segundos con `setInterval(mostrarDato, 5000)`.

#### Progreso hacia 500 años
- Calcula el porcentaje transcurrido desde la fundación (26 julio 1527) hasta hoy.
- Fórmula: `(hoy - fundacion) / (86400000 * 365.25) / 500 * 100`.

---

## 6. Dashboard

> Archivo: `public/js/dashboard.js`

Panel de control del usuario autenticado con secciones de perfil, nivel, rachas, historial, y administración de contenido.

### Funciones

#### `DOMContentLoaded` (async)
- **Qué hace**: Punto de entrada. Carga el perfil del usuario y configura toda la UI.
- **Flujo**:
  1. `fetch('/auth/perfil')` — si falla (401), redirige a `/login`.
  2. Renderiza nombre, username, rol, avatar en la interfaz.
  3. Si es **Natural**: oculta sección de administración, muestra historial.
  4. Si es **Especialista**: muestra panel de "Mis Contenidos", carga temas, juegos y categorías.
  5. Llama a `cargarNivel(rol)` y `cargarRacha(rol)`.
  6. Inicia el badge de notificaciones no leídas (actualiza cada 30s).

#### `configurarVistasPorRol(rol)`
- **Qué hace**: Muestra/oculta elementos según el rol.
- **Parámetros**: `rol` (string) — `'Natural'` o `'Especialista'`.
- **Comportamiento**:
  - Especialista: panel admin visible, carga `cargarMisTemas()`, `cargarMisJuegosCreados()`, `cargarCategorias()`.
  - Natural: panel admin oculto, carga `cargarHistorial()`.

#### `cargarNivel(rol)` (global)
- **Qué hace**: Obtiene y muestra el nivel del usuario (solo para Naturales).
- **Parámetros**: `rol` (string).
- **Flujo**: `GET /api/usuario/nivel` → actualiza badge, barra de progreso, puntos actual y siguiente.

#### `cargarRacha(rol)` (global)
- **Qué hace**: Obtiene y muestra la racha de creación (solo para Especialistas).
- **Parámetros**: `rol` (string).
- **Flujo**: `GET /api/rachas` → muestra días consecutivos y racha máxima.

#### `cargarCategorías()`
- **Qué hace**: Lista las categorías con botones para eliminar.
- **Flujo**: `GET /api/categorias` → renderiza tags con botón X.

#### `cargarUsuarios()`
- **Qué hace**: Lista todos los usuarios del sistema (admin).
- **Flujo**: `GET /api/usuarios` → tarjetas con nombre, username, correo, rol, puntos.

#### `cargarFeedback()`
- **Qué hace**: Lista el feedback recibido con opción de eliminar.
- **Flujo**: `GET /api/feedback` → tarjetas con mensaje, página, fecha + botón eliminar.

#### `cargarHistorial()`
- **Qué hace**: Obtiene el historial de temas y juegos visitados.
- **Flujo**: `GET /api/historial` → llama a `renderHistorialTemas()` y `renderHistorialJuegos()`.

#### `renderHistorialTemas(temas)`
- **Qué hace**: Pinta las tarjetas de temas visitados.
- **Parámetros**: `temas` (array).

#### `renderHistorialJuegos(juegos)`
- **Qué hace**: Pinta las tarjetas de juegos jugados.
- **Parámetros**: `juegos` (array).

#### `cargarMisRelatos()`
- **Qué hace**: Lista los relatos del usuario con opciones Ver/Eliminar.
- **Flujo**: `GET /api/mis-relatos` → renderiza tarjetas.

#### `mostrarMensaje(texto, tipo)`
- **Qué hace**: Muestra mensajes de éxito o error en el panel.
- **Parámetros**: `texto` (string), `tipo` (`'exito'` | `'error'`).

#### `actualizarNotif()`
- **Qué hace**: Consulta notificaciones no leídas y actualiza el badge.
- **Flujo**: `GET /api/notificaciones/no-leidas` cada 30s.

### Eventos

- **#btn-agregar-categoria**: `POST /api/categorias` → recarga lista.
- **#btn-logout**: `POST /auth/logout` → redirige a login.
- **#lista-categorias click** (delegado): Elimina categoría con confirmación.
- **Avatar click**: Redirige a `/select-avatar`.

---

## 7. Sistema de Juegos

> Archivo: `public/js/play-game.js`

Cliente para los 4 tipos de juegos: Quiz, Memory, Match y Scramblee.

### Estado global

```js
const state = {
    memoryEmparejados: 0,   // Pares encontrados en Memory
    memoryTotal: 0,         // Total de pares en Memory
    primeraCarta: null,     // Primera carta volteada en Memory
    segundaCarta: null,     // Segunda carta volteada en Memory
    matchConectados: 0,     // Conexiones correctas en Match
    matchTotal: 0,          // Total de conexiones en Match
    matchConcepto: null,    // Concepto seleccionado actualmente en Match
    matchSvg: null,         // Elemento SVG para las líneas de Match
    matchLines: []          // Líneas dibujadas en Match
};
```

### Funciones

#### `$(sel)`
- Atajo para `document.querySelector(sel)`.

#### `mostrarJuego(juego)`
- **Qué hace**: Renderiza el juego según su tipo (`juego.tipo`).
- **Parámetros**: `juego` (object) — datos del juego desde la API.
- **Tipos**:
  - **Quiz**: Muestra la pregunta y 3 botones (A, B, C). Cada botón llama a `responderTrivia()`.
  - **Memory**: Divide `juego.pregunta` por comas, duplica y baraja para crear pares. Cada carta llama a `voltearMemory()`.
  - **Match**: Divide conceptos (`juego.pregunta`) y respuestas (`juego.opcion_a`), los muestra en dos columnas. Cada botón llama a `seleccionarMatch()`.
  - **Scramblee**: Muestra una pista, las letras desordenadas de la respuesta (`juego.opcion_a`), un input y botón Validar que llama a `responderScramblee()`.

#### `getTipoIcon(tipo)`
- **Retorna**: Nombre del icono Material Symbols según el tipo.

#### `responderTrivia(juego, letra, btnElegido)`
- **Qué hace**: Envía la respuesta del Quiz al servidor.
- **Parámetros**: `juego` (object), `letra` (string: 'A'|'B'|'C'), `btnElegido` (elemento HTML).
- **Flujo**:
  1. `POST /api/juegos/responder` con `{ juego_id, respuesta_usuario }`.
  2. Deshabilita todos los botones, pinta verde el correcto, rojo el elegido (si falló).
  3. Si acertó, llama a `completarNivelModulo()`.
  4. Llama a `mostrarResultado()`.

#### `voltearMemory(carta, juego)`
- **Qué hace**: Lógica del juego Memory.
- **Parámetros**: `carta` (elemento HTML), `juego` (object).
- **Flujo**:
  1. Si la carta ya está volteada/emparejada, ignora.
  2. Voltea la carta (clase `volteada`).
  3. Si es la primera, la guarda.
  4. Si es la segunda, compara valores:
     - Si coinciden: marca ambas `emparejada`, incrementa contador. Si completó todas, llama a `completarJuego()`.
     - Si no coinciden: las voltea de nuevo tras 800ms.

#### `seleccionarMatch(btn, juego)`
- **Qué hace**: Lógica del juego Match (conectar conceptos con respuestas).
- **Parámetros**: `btn` (elemento HTML), `juego` (object).
- **Flujo**:
  1. Si el botón ya está conectado, ignora.
  2. Si es un **concepto**: lo marca seleccionado, remueve líneas punteadas previas.
  3. Si es una **respuesta** y hay un concepto seleccionado:
     - Si el índice coincide (`data-pos === data-idx`): marca conexión correcta (verde), dibuja línea sólida.
     - Si no: muestra error momentáneo (rojo, 500ms).
  4. Si completó todas las conexiones, llama a `completarJuego()`.

#### `drawMatchLine(caja, btn1, btn2, color, dashed)`
- **Qué hace**: Dibuja una línea curva SVG entre dos botones en el juego Match.
- **Parámetros**:
  - `caja` — contenedor del juego.
  - `btn1`, `btn2` — elementos a conectar.
  - `color` — color de la línea.
  - `dashed` — boolean, si es punteada.
- **Retorno**: El elemento SVG `<path>` creado.
- **Técnica**: Crea un path Bezier con control points que forman una curva ondulada.

#### `responderScramblee(juego)` (async)
- **Qué hace**: Envía la palabra escrita por el usuario para el juego Scramblee.
- **Parámetros**: `juego` (object).
- **Flujo**: `POST /api/juegos/responder` → llama a `mostrarResultado()`.

#### `completarJuego(juego)` (async)
- **Qué hace**: Completa un juego de tipo Memory o Match enviando `'COMPLETADO'` como respuesta.
- **Flujo**: `POST /api/juegos/responder` con `respuesta_usuario: 'COMPLETADO'`.

#### `completarNivelModulo()` (async)
- **Qué hace**: Si el juego se juega dentro de un módulo educativo, marca el nivel como completado.
- **Flujo**: `POST /api/modulos/[moduloId]/niveles/[nivelId]/completar`.

#### `mostrarResultado(juego, esCorrecta, puntosGanados)`
- **Qué hace**: Muestra la pantalla de resultado (correcto/incorrecto).
- **Parámetros**: `juego` (object), `esCorrecta` (boolean), `puntosGanados` (number).
- **Comportamiento**:
  - Si correcto: muestra puntos ganados, actualiza contador de puntos.
  - Si incorrecto: para Quiz muestra la respuesta correcta; para Scramblee muestra la palabra correcta.
  - Si está en un módulo y acertó: muestra botón para siguiente nivel y redirige tras 3s.

---

## 8. Página Principal

> Archivo: `public/js/home.js`

Listado de temas históricos con valoraciones.

### Funciones

#### `fetchPerfil()`
- **Qué hace**: Obtiene el perfil del usuario autenticado.
- **Almacena**: `currentUser` (objeto usuario o null).

#### `cargarTemas(categoriaId)`
- **Qué hace**: Obtiene temas desde la API y los renderiza.
- **Parámetros**: `categoriaId` (number, opcional) — filtra por categoría.
- **Flujo**: `GET /api/temas?categoria=X` → para cada tema, llama a `crearTarjetaTema()`.

#### `crearTarjetaTema(tema, user)`
- **Qué hace**: Construye una tarjeta HTML para un tema.
- **Parámetros**: `tema` (object), `user` (object|null).
- **Retorno**: Elemento `<article>` con imagen, título, extracto, categoría, fecha, botón de valoración y contador de comentarios.
- **Eventos**:
  - Click en botón de valoración → abre `popup-valoracion.js`.
  - Click en tarjeta → navega a `/ver-tema?id=...`.

#### `crearExtracto(texto)`
- **Qué hace**: Trunca el contenido a 160 caracteres, eliminando HTML.
- **Parámetros**: `texto` (string).
- **Retorno**: string truncado.

### Eventos

- `window.addEventListener('category-change', ...)` — permite filtrar por categoría desde otros componentes.

---

## 9. Comunidad / Relatos

> Archivo: `public/js/comunidad.js`

Página de relatos comunitarios con tarjetas interactivas.

### Variables globales

- `todosLosRelatos` — array con todos los relatos cargados.

### Funciones

#### `cargarRelatos(categoria)`
- **Qué hace**: Obtiene relatos desde la API y los renderiza en un grid.
- **Parámetros**: `categoria` (string, opcional) — filtro por nombre de categoría.
- **Flujo**:
  1. Muestra loading spinner.
  2. `GET /api/relatos?categoria=...` → espera 1s (transición), renderiza con `crearCardRelato()`.

#### `crearCardRelato(relato, index)`
- **Qué hace**: Crea una tarjeta de relato con avatar, título, extracto, imagen y botón "Leer más".
- **Parámetros**: `relato` (object), `index` (number) — para delay de animación.
- **Retorno**: Elemento `<article>`.
- **Evento**: Click → navega a `/ver-relato?id=...`.

#### `sanitizar(str)`
- **Qué hace**: Escapa caracteres HTML peligrosos (`&`, `<`, `>`, `"`).
- **Parámetros**: `str` (string).
- **Retorno**: string sanitizado.

### Eventos

- `window.addEventListener('category-change', ...)` — filtro por categoría.

---

## 10. Notificaciones

> Archivo: `public/js/notificaciones.js`

Sistema de notificaciones con lectura y vaciado.

### Funciones

#### `cargarNotificaciones()` (async)
- **Qué hace**: Carga y renderiza la lista de notificaciones del usuario.
- **Flujo**:
  1. `GET /api/notificaciones` — espera 1s (transición).
  2. Por cada notificación: crea un `<div>` con indicador de no leída, título, mensaje, fecha y enlace.
  3. Si no está leída, al hacer click llama a `marcarLeida()`.

#### `marcarLeida(id, elemento)` (async)
- **Qué hace**: Marca una notificación como leída en el servidor y en la UI.
- **Parámetros**: `id` (number), `elemento` (DOM element).

#### `escapeHtml(text)`
- **Qué hace**: Escapa HTML inyectando el texto como `textContent` de un div temporal y extrayendo su `innerHTML`.
- **Parámetros**: `text` (string).
- **Retorno**: string escapado.

### Eventos

- **#btn-leer-todas**: `PUT /api/notificaciones/leer-todas` — marca todas como leídas.
- **#btn-vaciar**: `DELETE /api/notificaciones` — elimina todas las notificaciones (con confirmación).

---

## 11. Módulos Educativos

> Archivo: `public/js/modulos.js`

Listado de módulos educativos con niveles y juegos asociados.

### Funciones

#### `DOMContentLoaded` (async)
- **Qué hace**: Carga y renderiza los módulos educativos.
- **Flujo**:
  1. `GET /api/modulos` → renderiza tarjetas con nombre, descripción, número de niveles y creador.
  2. Cada tarjeta enlaza a `/modulos/[id]`.
  3. Click en el nombre del creador → navega a `/ver-perfil?id=...` (sin seguir el enlace del módulo).

---

## 12. Servidor — app.js

> Archivo: `app.js` (899 líneas)

Entry point de la aplicación Express.

### Configuración

- **Template engine**: Nunjucks con `autoescape: true`.
- **Session**: express-session con cookie de 2h, `httpOnly: true`.
- **Estáticos**: CSS, JS, imágenes, fuentes, uploads servidos con `no-cache`.
- **Cache busting**: `app.locals.cacheVersion = Date.now()` inyectado en URLs como `?v={{ cacheVersion }}`.

### Rutas de páginas (GET)

| Ruta | Middleware | Vista |
|------|-----------|-------|
| `/` | — | login |
| `/login` | — | login |
| `/registro` | — | Registro |
| `/home` | verificarSesion | home |
| `/dashboard` | verificarSesion | dashboard |
| `/juegos` | verificarSesion | juegos |
| `/play-game` | verificarSesion | play-game |
| `/modulos/:id` | verificarSesion | modulo-detalle |
| `/comunidad` | — | comunidad |
| `/subir-tema` | verificarSesion + esEspecialista | subir-tema |
| `/aniversario-coro` | verificarSesion | aniversario-coro |
| `/admin` | — | control |
| `/sw.js` | — | Service Worker (con caché dinámico) |
| +20 rutas más | | |

### API montadas

```js
app.use(authRoutes);        // /auth/*
app.use(juegoRoutes);       // /api/juegos/*
app.use(temaRoutes);        // /api/temas/*
app.use(relatoRoutes);      // /api/relatos/*
app.use(searchRoutes);      // /api/search
app.use(historialRoutes);   // /api/historial
app.use(comentarioRoutes);  // /api/comentarios/*
app.use(moduloRoutes);      // /api/modulos/*
app.use(notificacionRoutes);// /api/notificaciones/*
app.use(recomendacionRoutes);// /api/recomendaciones/*
app.use(feedbackRoutes);    // /api/feedback/*
app.use(denunciaRoutes);    // /api/denuncias/*
```

### APIs inline en app.js

- `GET /api/usuario/nivel` — calcula nivel con `calcularNivel(puntos)`.
- `GET /api/usuario/reputacion` — calcula reputación con `calcularRangoReputacion(reputacion)`.
- `GET /api/usuarios/:id/perfil` — perfil público con conteos y nivel.
- `POST /api/seguir/:id` — seguir/dejar de seguir.
- `GET /api/seguidores/:id` — lista de seguidores.
- `GET /api/siguiendo/:id` — lista de seguidos.
- `POST /api/traducir` — proxy de Google Translate.

### Panel de Administración

Todas las rutas `/admin/*` están protegidas por `verificar0505` (variable de sesión `admin0505`).

- Autenticación admin: `POST /admin/auth` con usuario `admin` y contraseña `Wind2.0`.
- CRUD de usuarios, categorías, temas, juegos, relatos, feedback, denuncias.
- Gestión de solicitudes de Especialista (aprobar/rechazar).
- Moderación de contenido: revisar, pausar, despausar temas.

### Auto-migración al iniciar

Al iniciar, `app.js` ejecuta migraciones automáticas:

- Crea tablas: `historial_vistas`, `rachas`, `denuncias`, `solicitudes_especialista`, `feedback`, `seguidores`, `relatos_likes`, `juegos_likes`, `temas_likes`, `modulos_likes`.
- Agrega columnas faltantes (`estado`, `latitud`, `longitud`, `reset_token`, `session_token`, `avatar_fondo`, `reputacion`, `likes`, `puntuacion`).
- Crea índices de rendimiento.
- Entrena el recomendador.

---

## 13. Utilidades del Servidor

### `utils/niveles.js` — Sistema de Niveles

```js
calcularNivel(puntos)
```

- **Fórmula**: `nivel = floor(sqrt(puntos / 100)) + 1`
- **Progreso**: porcentaje entre el punto actual y el siguiente nivel.
- **12 títulos**: `Novato` → `Explorador` → `Cronista` → `Investigador` → `Historiador` → `Erudito` → `Guardián` → `Maestro` → `Leyenda` → `Inmortal` → `Mítico` → `Trascendental`.
- **Retorno**: `{ nivel, titulo, puntos, puntosSiguiente, puntosAnterior, progreso }`.

### `utils/reputacion.js` — Rangos de Reputación

```js
calcularRangoReputacion(puntos)
```

- **6 rangos**: `Colaborador` (0), `Contribuyente` (50), `Curador` (150), `Experto` (300), `Guardián` (500), `Maestro` (800).
- **Retorno**: `{ nivel, titulo, puntos, puntosSiguiente, puntosAnterior, progreso }`.

### `utils/rachas.js` — Rachas de Creación

```js
actualizarRachaCreacion(usuarioId)
```

- **Qué hace**: Verifica si el usuario ha creado contenido hoy.
- **Lógica**:
  - Si es primera vez: crea registro con racha = 1.
  - Si ya creó hoy: mantiene racha actual.
  - Si creó ayer: incrementa racha.
  - Si no creó ayer: reinicia racha a 1.
- **Actualiza**: `racha_creacion_actual` y `racha_creacion_maxima` en la tabla `rachas`.

### `utils/filter.js` — Filtro de Malas Palabras

```js
contieneMalasPalabras(...textos)  // boolean
encontrarMalasPalabras(...textos) // string[]
```

- Usa regex con `\b` (word boundary) para detección precisa.
- Fuente: 22 palabras prohibidas en `utils/palabras-prohibidas.js`.
- Usado en: registro, temas, comentarios, relatos.

### `utils/recomendador.js` — Motor de Recomendaciones

```js
class Recomendador {
    async entrenar()       // Inicializa el recomendador
    async recomendar(usuarioId, limite)  // Recomienda temas
}
```

- **Algoritmo**: Filtrado colaborativo basado en categorías.
  - Toma las 3 categorías más visitadas por el usuario.
  - Busca temas en esas categorías que el usuario NO haya visto.
  - Ordena por likes descendente.
  - Si el usuario no tiene historial, devuelve los temas más populares.
- **Retorno**: `{ temas: [...], relatos: [] }`.

### `middlewares/autenticacion.js`

```js
verificarSesion(req, res, next)
```

- Verifica que `req.session.usuarioId` exista y que coincida con `session_token` en BD.
- Si no: redirige a `/login` (para páginas) o devuelve 401 (para APIs).

```js
esEspecialista(req, res, next)
```

- Requiere que el rol del usuario sea `'Especialista'`.
- Usado en rutas de creación: `/subir-tema`, `/crear-juego`, etc.

---

## 14. API Endpoints

### Autenticación (`/auth/*`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/registro` | Registrar usuario |
| POST | `/auth/login` | Iniciar sesión |
| POST | `/auth/logout` | Cerrar sesión |
| GET | `/auth/perfil` | Obtener perfil propio |
| PUT | `/auth/perfil` | Actualizar perfil |
| DELETE | `/auth/cuenta` | Eliminar cuenta |
| POST | `/auth/recuperar-contrasena` | Solicitar recuperación |
| POST | `/auth/restablecer-contrasena` | Restablecer contraseña |
| POST | `/auth/solicitar-rol` | Solicitar ser Especialista |
| GET | `/auth/usuarios` | Buscar usuarios |

### Temas (`/api/temas/*`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/temas` | Listar temas (con filtro por categoría) |
| GET | `/api/temas/:id` | Obtener un tema |
| POST | `/api/temas` | Crear tema |
| PUT | `/api/temas/:id` | Editar tema |
| DELETE | `/api/temas/:id` | Eliminar tema |
| POST | `/api/temas/:id/like` | Valorar tema (1-5) |
| GET | `/api/temas/especialista/:id` | Temas de un especialista |

### Juegos (`/api/juegos/*`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/juegos` | Listar juegos |
| GET | `/api/juegos/:id` | Obtener un juego |
| POST | `/api/juegos` | Crear juego |
| PUT | `/api/juegos/:id` | Editar juego |
| DELETE | `/api/juegos/:id` | Eliminar juego |
| POST | `/api/juegos/responder` | Enviar respuesta |
| GET | `/api/juegos/ranking` | Ranking de juegos |
| POST | `/api/juegos/:id/like` | Valorar juego |

### Módulos (`/api/modulos/*`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/modulos` | Listar módulos |
| GET | `/api/modulos/:id` | Obtener módulo con niveles |
| POST | `/api/modulos` | Crear módulo |
| PUT | `/api/modulos/:id` | Editar módulo |
| DELETE | `/api/modulos/:id` | Eliminar módulo |
| POST | `/api/modulos/:id/like` | Valorar módulo |
| GET | `/api/modulos/:id/niveles/:nid` | Obtener nivel |
| POST | `/api/modulos/:id/niveles` | Crear nivel |
| POST | `/api/modulos/:mid/niveles/:nid/completar` | Completar nivel |
| GET | `/api/modulos/:id/progreso` | Progreso del usuario |

### Relatos (`/api/relatos/*`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/relatos` | Listar relatos |
| GET | `/api/relatos/:id` | Obtener relato |
| POST | `/api/relatos` | Crear relato |
| PUT | `/api/relatos/:id` | Editar relato |
| DELETE | `/api/relatos/:id` | Eliminar relato |

### Otras APIs

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/search?q=...` | Búsqueda full-text |
| GET | `/api/historial` | Historial de vistas |
| GET | `/api/categorias` | Listar categorías |
| POST | `/api/categorias` | Crear categoría (Especialista) |
| DELETE | `/api/categorias/:id` | Eliminar categoría |
| GET | `/api/notificaciones` | Listar notificaciones |
| GET | `/api/notificaciones/no-leidas` | Contar no leídas |
| PUT | `/api/notificaciones/:id/leer` | Marcar leída |
| PUT | `/api/notificaciones/leer-todas` | Marcar todas leídas |
| DELETE | `/api/notificaciones` | Vaciar notificaciones |
| GET | `/api/recomendaciones` | Obtener recomendaciones |
| POST | `/api/recomendaciones/entrenar` | Entrenar recomendador |
| GET | `/api/recomendaciones/estado` | Estado del recomendador |
| POST | `/api/feedback` | Enviar feedback |
| GET | `/api/feedback` | Listar feedback (admin) |
| DELETE | `/api/feedback/:id` | Eliminar feedback |
| POST | `/api/denuncias` | Denunciar un tema |
| POST | `/api/seguir/:id` | Seguir/dejar de seguir |
| POST | `/api/traducir` | Traducir texto (Google Translate) |
| GET | `/api/rachas` | Obtener rachas del usuario |
| GET | `/api/usuario/nivel` | Nivel del usuario |
| GET | `/api/usuario/reputacion` | Reputación del usuario |
| GET | `/api/usuarios/:id/perfil` | Perfil público |
| GET | `/api/mis-relatos` | Relatos del usuario |

---

*Documentación generada para Wind 2.0 — Plataforma cultural de Santa Ana de Coro.*
