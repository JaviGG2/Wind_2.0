# Wind — Especificación Técnica

## Descripción

Plataforma web para explorar, aprender y preservar el patrimonio cultural de Coro. Los usuarios pueden descubrir historias, tradiciones y secretos de la región a través de temas, relatos comunitarios y juegos interactivos.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express |
| Frontend | HTML + CSS + JS vanilla |
| Base de datos | PostgreSQL (Railway) |
| Template engine | EJS (HTML renderizado con `res.render`) |
| Autenticación | Sesiones vía `express-session` (memoria) + `session_token` en DB |
| Mapas | Leaflet + OpenStreetMap (gratuito, sin API key) |
| Geocodificación | Nominatim (solo desde Node.js, sin User-Agent desde browser) |
| QR | `qrcodejs` (client-side) |
| Estilos | CSS vanilla con variables, flexbox, grid |
| Iconos | Material Symbols (Google Fonts) |
| Tipografía | Rethink Sans (Google Fonts via `@import` en base.css) |
| PWAs | Service Worker dinámico con `CACHE_VERSION` |
| Despliegue | Railway (`DATABASE_URL` en Dashboard) |
| Emails | SendGrid (primario), Gmail SMTP (fallback). Remitente: `corotour55@gmail.com` |

---

## Arquitectura

```
Wind_2.0/
├── app.js                  # Entry point, Express config, rutas, migraciones, static files
├── server.js               # (alternativo) Incluye static de views/
├── package.json            # main: app.js
├── config/
│   └── db.js               # Pool de conexión a PostgreSQL (SSL, dotenv)
├── controllers/            # Lógica de negocio por recurso
├── routes/                 # Definiciones de rutas Express
├── middlewares/
│   └── autenticacion.js    # verificarSesion, esEspecialista
├── utils/                  # niveles.js, reputacion.js, recomendador.js
├── views/                  # Plantillas HTML (EJS)
├── public/
│   ├── css/                # Estilos por página
│   ├── js/                 # Scripts por página
│   ├── images/             # SVGs de loading
│   ├── img/                # Logo, iconos, fondos
│   └── uploads/            # Archivos subidos por usuarios
├── scripts/                # Utilidades CLI (geocodificar-temas.js, enviar-notificacion.js)
└── SPEC.md                 # Este archivo
```

### Flujo de Request

1. Express recibe request
2. Middleware de sesión `verificarSesion` verifica `req.session.usuarioId` + `session_token` contra DB
3. Route handler ejecuta controller
4. Controller consulta PostgreSQL vía `db.query()`
5. Respuesta: `res.render('vista', data)` o `res.json(data)`

---

## Base de Datos (PostgreSQL)

### Tablas

| Tabla | Propósito |
|-------|-----------|
| `usuarios` | Usuarios registrados |
| `temas` | Contenido educativo/temático |
| `juegos` | Juegos interactivos |
| `relatos_community` | Relatos creados por usuarios |
| `categorias` | Categorías para temas/juegos |
| `modulos` | Agrupación de niveles |
| `niveles` | Niveles dentro de un módulo |
| `progreso_modulo` | Progreso del usuario por módulo/nivel |
| `historial_vistas` | Registro polimórfico de vistas (tema/juego) |
| `comentarios` | Comentarios en relatos |
| `notificaciones` | Notificaciones por usuario |
| `solicitudes` | Solicitudes de amistad/rol |
| `feedback` | Feedback de usuarios (admin en `/0505`) |
| `session` | Sesiones de Express |
| `solicitudes_especialista` | Solicitudes de ascenso a Especialista |
| `temas_likes` | Valoraciones (1-5 estrellas) en temas |
| `juegos_likes` | Valoraciones (1-5 estrellas) en juegos |
| `modulos_likes` | Valoraciones (1-5 estrellas) en módulos |
| `relatos_likes` | Likes en relatos (sin estrellas, legado) |
| `seguidores` | Relación seguir/dejar de seguir |

### Columnas clave en `usuarios`

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `id` | SERIAL PK | ID único |
| `nombre` | VARCHAR | Nombre visible |
| `username` | VARCHAR | @usuario único |
| `correo` | VARCHAR | Email único |
| `contrasena` | VARCHAR | Hash bcrypt |
| `rol` | VARCHAR(20) | `'Natural'` (default) o `'Especialista'` |
| `puntos` | INTEGER | Puntos acumulados por juegos |
| `reputacion` | INTEGER | Reputación de Especialista (por valoraciones recibidas) |
| `session_token` | VARCHAR(64) | UUID de sesión activa (single-session) |
| `session_token_creado` | TIMESTAMP | Cuándo se creó el token (para detectar expiración) |
| `cuenta_activa` | BOOLEAN | False hasta verificar email |
| `codigo_verificacion` | VARCHAR(6) | Código de verificación de email |
| `imagen_perfil` | TEXT | URL del avatar |
| `avatar_fondo` | VARCHAR(7) | Color de fondo del avatar |

### Tablas de valoración (estrellas 1-5)

Cada tabla sigue el mismo patrón:
```sql
CREATE TABLE {recurso}_likes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    {recurso}_id INTEGER NOT NULL REFERENCES {recurso}s(id) ON DELETE CASCADE,
    puntuacion INTEGER NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    UNIQUE (usuario_id, {recurso}_id)
);
```

- `temas_likes`, `juegos_likes`, `modulos_likes` — upsert (INSERT ON CONFLICT DO UPDATE)
- `relatos_likes` — existe pero no se usa desde frontend (sistema legacy)
- Cada usuario puntúa 1 vez, modificable (upsert)
- Las consultas devuelven `promedio_valoracion` y `mi_puntuacion`

### Tabla `historial_vistas` (polimórfica)

```sql
CREATE TABLE historial_vistas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_contenido VARCHAR(10) NOT NULL CHECK (tipo_contenido IN ('tema', 'juego')),
    contenido_id INTEGER NOT NULL,
    fecha_vista TIMESTAMP DEFAULT NOW(),
    UNIQUE (usuario_id, tipo_contenido, contenido_id)
);
```

- Anti-duplicado para puntos de juego: UNIQUE + `ON CONFLICT DO UPDATE`

---

## Rutas

### Páginas (GET)

| Ruta | Vista | Auth |
|------|-------|------|
| `/` | login | No |
| `/home` | home | Sí |
| `/dashboard` | dashboard | Sí |
| `/comunidad` | comunidad | No |
| `/juegos` | juegos | Sí |
| `/modulos` | modulos | Sí |
| `/modulos/:id` | modulo-detalle | Sí |
| `/play-game?id=X` | play-game | Sí |
| `/ver-tema?id=X` | ver-tema | No |
| `/ver-relato?id=X` | ver-relato | No |
| `/notificaciones` | notificaciones | Sí |
| `/recomendaciones` | recomendaciones | Sí |
| `/ajustes-perfil` | ajustes-perfil | Sí |
| `/mapa` | mapa | Sí |
| `/prueba-qr` | prueba-qr | No |
| `/control` | control | Especialista |
| `/registro` | Registro | No |
| `/login` | login | No |
| `/ranking-game` | ranking-game | Sí |

### API (JSON)

| Método | Ruta | Propósito |
|--------|------|-----------|
| GET | `/api/buscar?q=...` | Búsqueda de contenido |
| POST | `/api/feedback` | Enviar feedback |
| GET | `/0505/api/feedback` | Listar feedback (admin) |
| DELETE | `/0505/api/feedback/:id` | Eliminar feedback |
| POST | `/api/modulos/:id/niveles/:nivelId/completar` | Completar nivel |
| POST | `/api/juegos/:id/responder` | Responder juego (otorga puntos) |
| POST | `/api/juegos/:id/like` | Valorar juego (1-5 estrellas) |
| POST | `/api/temas/:id/like` | Valorar tema (1-5 estrellas) |
| POST | `/api/modulos/:id/like` | Valorar módulo (1-5 estrellas) |
| GET | `/api/temas/mapa` | Temas con coordenadas para el mapa |
| GET | `/api/categorias` | Listar categorías desde DB |
| GET | `/api/juegos/ranking` | Top 100 jugadores (excluye Especialistas) |
| GET | `/api/usuario/reputacion` | Rango de reputación del Especialista |
| POST | `/auth/login` | Iniciar sesión |
| POST | `/auth/logout` | Cerrar sesión (limpia session_token) |
| POST | `/auth/verificar` | Verificar cuenta con código |
| POST | `/auth/re-enviar-codigo` | Reenviar código de verificación |
| POST | `/auth/eliminar-cuenta` | Eliminar cuenta (requiere contraseña) |
| POST | `/auth/solicitar-ascenso` | Solicitar ser Especialista |
| GET | `/auth/perfil` | Perfil del usuario logueado |

---

## Sistema de Puntos y Niveles

- **Único** que otorga puntos: `responderJuego` (vía `juegoController.js`)
- `completarNivel` solo marca nivel completado en `progreso_modulo` — **NO** da puntos
- Anti-duplicado: `historial_vistas` con UNIQUE + `ON CONFLICT DO UPDATE`
- `calcularNivel(puntos)` en `utils/niveles.js` mapea puntos → nivel (6+ rangos)
- Especialistas **no ganan puntos** al responder juegos (línea 271-287 de juegoController.js)
- Especialistas **no aparecen** en el ranking global (`rol != 'Especialista'`)

---

## Sistema de Reputación (Especialistas)

- Solo aplica a usuarios con `rol = 'Especialista'`
- La reputación aumenta cuando OTROS usuarios valoran su contenido (temas, juegos, módulos)
- No hay duplicado: mismo upsert que las valoraciones
- `utils/reputacion.js` mapea reputación → rango:

| Rango | Rep. Mínima |
|-------|------------|
| Colaborador | 0 |
| Contribuyente | 50 |
| Curador | 150 |
| Experto | 300 |
| Guardián | 500 |
| Maestro | 800 |

- Expuesto via `GET /api/usuario/reputacion`
- Se muestra en dashboard y perfil público

---

## Sistema de Valoración (Estrellas 1-5)

- Reemplazó el sistema binario de likes
- Cada usuario puntúa 1-5, modificable (upsert SQL)
- Se muestra en:
  - **Cards** (home, comunidad, juegos, módulos): botón compacto `.btn-valoracion` que abre popup flotante con estrellas grandes
  - **Detalle** (ver-tema, modulo-detalle): estrellas interactivas directas con hover CSS
- No hay valoración en relatos (solo likes legacy)
- `popup-valoracion.js`: componente compartido para el popup de estrellas

---

## Single-Session (Seguridad)

- Cada login genera un `session_token` (UUID v4) y lo guarda en `usuarios.session_token`
- El middleware `verificarSesion` compara `req.session.session_token` contra el de la DB en cada request
- Si no coinciden → destruye sesión, redirige a login con `?sesion_expirada=true`
- **Bloqueo de segundo login**: si el usuario ya tiene `session_token` en DB Y fue creado hace menos de 31 días → login responde `409` con mensaje "Ya iniciaste sesión en otro dispositivo. Cierra sesión allí primero."
- Logout limpia `session_token = NULL` y `session_token_creado = NULL` para permitir nuevo login
- Columna `session_token_creado` evita que tokens viejos (sesiones expiradas) bloqueen el acceso

---

## Sistema de Mapas

- Leaflet + OpenStreetMap (gratuito, sin API key)
- Página `/mapa` con:
  - Marcadores de colores por categoría
  - Popups con enlace al tema
  - Filtros por categoría (client-side)
  - Campo de búsqueda (client-side)
  - Contador de resultados
  - Leyenda de colores
  - Botón de geolocalización
- Marcadores agrupados cuando varios temas comparten coordenadas exactas (badge con count + popup con lista)
- Header flota sobre el mapa en desktop (absolute + backdrop-filter)
- URL params `?lat=&lng=&id=` centra el mapa y abre popup
- Coordenadas almacenadas en `temas.latitud DECIMAL(10,7)` y `temas.longitud DECIMAL(10,7)`

### Geocodificación

- **Desde el browser**: no se puede (Nominatim bloquea User-Agent personalizado)
- **Selector de ubicación**: `ubicacion-picker.js` — modal Leaflet compartido entre subir-tema y editar-tema con búsqueda Nominatim + pin arrastrable
- **Script batch**: `scripts/geocodificar-temas.js` — desde Node.js con `User-Agent: WindApp/1.0`. Geolocalizó 23 temas (12 exactos, 11 aprox en Casco Histórico)

---

## Sistema de QR

- Página de prueba: `/prueba-qr`
- Componente: `qr-modal.js` — función `abrirQRModal(url, titulo)`
- Modal con overlay, loading animation (`loading-4.svg`, 200x200), transición blur (10px → 0)
- QR generado con librería `qrcodejs` (client-side)
- Botón de descarga PNG
- Integrado en `ver-tema.html` (toolbar)

---

## Autenticación

- Sesiones con `express-session` (almacenadas en memoria, no en DB)
- Middleware `verificarSesion` en `middlewares/autenticacion.js`:
  1. Verifica `req.session.usuarioId`
  2. Verifica `session_token` contra DB (single-session enforcement)
- Middleware `esEspecialista` para rutas administrativas
- `req.session.usuarioId`, `req.session.rol`, `req.session.session_token` disponibles
- Sesión default: 2 horas. Con checkbox "Mantener sesión activa": 30 días

### Flujo de Login

1. POST `/auth/login` con credenciales
2. Verifica bcrypt
3. Si cuenta no activa → `403` con `requiereVerificacion: true` → inline verification en login.html
4. Si hay `session_token` activo (< 31 días) → `409` bloqueado
5. Genera nuevo UUID, actualiza `session_token` y `session_token_creado` en DB
6. Almacena en `req.session`

### Flujo de Verificación

- Al registrarse, `cuenta_activa = FALSE`, se envía código de 6 dígitos por email
- En login, si cuenta inactiva → se muestra sección de verificación inline
- `POST /auth/re-enviar-codigo` regenera código y reenvía email
- `POST /auth/verificar` activa la cuenta

### Eliminación de Cuenta

- Desde `ajustes-perfil.html`
- `POST /auth/eliminar-cuenta` con confirmación de contraseña (bcrypt)
- Hard delete del usuario + destroy session

---

## Roles de Usuario

| Rol | Acceso |
|-----|--------|
| `Natural` | Todo: home, juegos, comunidad, dashboard, mapa, perfil |
| `Especialista` | Todo lo de Natural + `/control` (admin de contenido). No gana puntos de juegos. Gana reputación por valoraciones recibidas |

### Solicitud de Ascenso

- Desde dashboard con `solicitarAscenso`
- Se crea registro en `solicitudes_especialista`
- Admin aprueba/rechaza desde `/0505/`

---

## Categorías

- Almacenadas en tabla `categorias` de PostgreSQL
- Cargadas dinámicamente via `GET /api/categorias`
- Usadas en: subir-tema (select dinámico), editar-tema, ver-tema, mapa (colores de marcadores)
- No hay HTML hardcoded para opciones de categoría

---

## Búsqueda

- Endpoint: `GET /api/buscar?q=...` (búsqueda por temas, relatos, juegos)
- Widget flotante con input, resultados con secciones, filtros por tipo
- Categorías ("Todo", "Para ti", selector de categoría) solo aparecen en `/home`
- En otras páginas (juegos, comunidad, mapa, etc.) solo se muestra el input de búsqueda

---

## Diseño de Páginas

### Home
- Título "Descubrir", botones mapa + ayuda
- Grid de temas (1 columna mobile, 2 columnas ≥ 821px)
- Tarjetas con imagen, título, categoría, rating compacto

### Comunidad (rediseñada)
- Sin hero gradient — header limpio con título + botón "Compartir relato" + ayuda
- Cards compactas (padding reducido, avatar 30px, extracto 2 líneas, imagen 140px)
- Grid responsive

### Juegos (rediseñado)
- Sin hero — header limpio + barra de stats compacta
- Juegos agrupados por tipo (Trivia, Memoria, Relacionar, Ordenar)
- Cada grupo en fila horizontal con scroll-snap (mobile y desktop)
- Scroll fade gradient por grupo

### Dashboard
- Perfil con avatar, nombre, rol, seguidores
- Barra de nivel con progreso
- Acordeones por sección (mis datos, actividad, etc.) — `max-height: none` fijado

### Login
- Split layout en desktop (≥ 900px): panel bienvenida (izquierda) + formulario (derecha)
- Fondo del panel de bienvenida: `linear-gradient(135deg, #FCC78C 30%)`
- Verificación de cuenta inline (sin página separada)
- Mantener sesión checkbox

---

## Loaders y SVGs Animados

### Sistema de loading unificado

```html
<img src="/images/loading.svg" class="anim-loading" alt="Cargando...">
```

- `img.anim-loading` centrado, 36px de ancho, con animación `flotar` (translateY ±8px + rotate ±2°)
- La animación de trazo está dentro de cada SVG (inline `<style>`)

### Archivos SVG

| Archivo | Forma |
|---------|-------|
| `loading.svg` | Onda original |
| `loading-1.svg` a `loading-4.svg` | Formas básicas |
| `loading-5.svg` | Path largo con múltiples curvas |
| `loading-6.svg` | Montañas / zigzag |
| `loading-7.svg` a `loading-8.svg` | Infinito / figura 8 |
| `loading-9.svg` | Dientes de sierra |
| `loading-10.svg` a `loading-16.svg` | Barridos curvos |

### Estilos de animación disponibles

`-reverse`, `-pingpong`, `-acelera`, `-ritmico`, `-salto`, `-onda`, `-rebote`, `-carrusel`, `-tiron`, `-marea`, `-escalera`, `-latigo`, `-secuencia-new`, `-destello-new`, `-revelar-new`, `-pulso-new`, `-eco-new`, `-relampago-new`

---

## Static Files y Caché

- Todos los assets: `Cache-Control: no-store`
- CSS/JS versioneados con `?v={{ cacheVersion }}` (timestamp al iniciar server)
- Service Worker dinámico: `{{CACHE_VERSION}}` inyectado en `/sw.js` al servir
- Estrategia del SW: network-first, limpieza de cachés viejas en activate
- Inline `<style>body{background:...}</style>` previene flash blanco

---

## Emails

- **SendGrid** (API key via `SENDGRID_API_KEY`)
- **Fallback**: Gmail SMTP (`nodemailer`) via `GMAIL_USER` / `GMAIL_PASS`
- Remitente: `corotour55@gmail.com` (verificado en SendGrid)
- Sin dominio personalizado — puede llegar a spam
- Tipos: verificación de cuenta, reenvío de código, notificaciones, solicitud de ascenso

---

## Colores y Paleta

### 1. Primarios (Brand)

| Color | Hex | Variable CSS | Uso |
|-------|-----|-------------|-----|
| Naranja principal | `#FF4500` | `--primario` | Botones, enlaces activos, accent principal, logo |
| Naranja hover | `#e63e00` | `--primario-hover` | Hover de botones, links |
| Naranja claro | `#fff0eb` | `--primario-light` | Fondos de hover, badges suaves |

### 2. Secundarios

| Color | Hex | Uso |
|-------|-----|-----|
| Naranja intenso | `#e03d00` | Hover alternativo (btn-crear-relato, popup-mapa-link) |
| Naranja medio | `#ff6b35` | Gradientes, avatar gradient stop |
| Naranja claro | `#ff8a65` | Gradientes barra de progreso, shimmer |
| Ámbar | `#f59e0b` | Estrellas valoración, estado "pendiente" |
| Amarillo oro | `#eab308` | Puntos de juego, labels |
| Verde mapa | `#2E7D32` | Marcador categoría Tradiciones Indígenas |
| Verde éxito | `#16a34a` | Mensajes éxito, nivel completado, input válido |
| Verde oscuro | `#065f46` | Icono resultado exitoso |
| Azul mapa | `#1565C0` | Marcador categoría Personajes Históricos |
| Azul info | `#3b82f6` | Enlaces informativos, hover edit |
| Púrpura mapa | `#6A1B9A` | Marcador categoría Leyendas Falconianas |
| Rojo error | `#dc2626` | Mensajes error, peligro, tag borrar |
| Rojo intenso | `#ef4444` | Botón peligro, estado "rechazado" |

### 3. Texto

| Color | Hex | Variable CSS | Uso |
|-------|-----|-------------|-----|
| Casi negro | `#111827` | `--texto` | Títulos, cuerpo principal |
| Gris medio | `#6b7280` | `--texto-sec` | Subtítulos, metadatos |
| Gris claro | `#9ca3af` | `--texto-muted` | Footers, textos secundarios |
| Gris oscuro | `#374151` | — | Cuerpo de modales, texto informativo |
| Blanco | `#ffffff` | — | Texto sobre fondos oscuros naranja |
| Gris 555 | `#555` | — | Texto muted en mapa, badges |
| Gris 888 | `#888` | — | Texto muy muted, iconos, fechas |
| Blanco 55% | `rgba(255,255,255,0.55)` | `--search-muted` | Texto secundario en fondos oscuros |

### 4. Fondos

| Color | Hex | Variable CSS | Uso |
|-------|-----|-------------|-----|
| Gris página | `#f5f6f8` | `--bg` | Body, fondo general |
| Blanco | `#ffffff` | `--bg-card` | Tarjetas, surfaces elevadas |
| Gris superficie | `#fafbfc` | `--bg-surface` | Superficies secundarias |
| Casi negro menú | `#121212` | `--search-bg` | Barra navegación, search overlay |
| Casi negro 2 | `#161616` | — | Panel control, cards dark |
| Naranja 8% | `rgba(255,69,0,0.08)` | `--c-primario-light` | Hover suave, badges |
| Blanco 95% | `rgba(255,255,255,0.95)` | — | Fondo leyenda/contador mapa |
| Login fondo panel | `#FCC78C` | — | Fondo del panel de bienvenida en login (PC) |

### 5. Bordes

| Color | Hex | Variable CSS | Uso |
|-------|-----|-------------|-----|
| Gris borde | `#e5e7eb` | `--borde` | Bordes por defecto en cards |
| Gris claro | `#f3f4f6` | `--borde-light` | Separadores, líneas divisoras |
| Gris medio | `#d1d5db` | — | Bordes de botones, popup |
| Naranja 12% | `rgba(255,69,0,0.12)` | — | Bordes de acento naranja |
| Naranja 15% | `rgba(255,69,0,0.15)` | — | Bordes de hover en cards |
| Oscuro 6% | `rgba(18,18,18,0.06)` | `--c-border` | Bordes comunidad, juegos |

### 6. Estados / Feedback

| Tipo | Texto | Fondo | Borde |
|------|-------|-------|-------|
| Éxito | `#16a34a` | `#f0fdf4` | `#bbf7d0` |
| Error | `#dc2626` | `#fef2f2` | `#fecaca` |
| Warning | `#f59e0b` | `#fffbeb` | — |
| Info | `#3b82f6` | `rgba(59,130,246,0.1)` | — |

### 7. Mapas — Marcadores por Categoría

| Categoría | Color Hex |
|-----------|-----------|
| Arquitectura Colonial | `#FF4500` |
| Tradiciones Indígenas | `#2E7D32` |
| Personajes Históricos | `#1565C0` |
| Leyendas Falconianas | `#6A1B9A` |
| Agrupado (múltiple) | Categoría del primer tema + badge `#222` |

### 8. Rankings

| Posición | Color |
|----------|-------|
| 🥇 Gold | `#ffd700` |
| 🥈 Silver | `#c0c0c0` |
| 🥉 Bronze | `#cd7f32` |

### 9. Sombras

| Sombra | Value |
|--------|-------|
| sm | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` |
| md | `0 4px 12px rgba(0,0,0,0.08)` |
| lg | `0 8px 30px rgba(0,0,0,0.1)` |
| xl | `0 20px 60px rgba(0,0,0,0.12)` |
| naranja glow | `0 8px 28px rgba(255,69,0,0.35)` |

### 10. Overlays

| Uso | Value |
|-----|-------|
| Modal oscuro | `rgba(10, 4, 0, 0.72)` + `backdrop-filter: blur(8px)` |
| Search overlay | `rgba(0,0,0,0.7)` |
| Juego modal | `rgba(15, 23, 42, 0.4)` |

---

## Diseño Responsive

| Breakpoint | Comportamiento |
|-----------|---------------|
| `< 769px` | Menú colapsado, layout mobile-first, horizontal scroll en juegos |
| `≥ 769px` | Menú lateral 280px, `margin-left: 280px` en contenido |
| `≥ 821px` | Home grid 2 columnas |
| `≥ 900px` | Login split view (panel bienvenida + formulario) |

---

## Archivos Relevantes

| Archivo | Propósito |
|---------|-----------|
| `app.js` | Entry point, migraciones, rutas, static cache, Service Worker |
| `config/db.js` | Pool PostgreSQL con SSL |
| `controllers/authController.js` | Login, registro, verificación, eliminación, solicitar ascenso |
| `controllers/juegoController.js` | CRUD juegos, responder, ranking, like (con reputación) |
| `controllers/temaController.js` | CRUD temas, like (con reputación), listar para mapa |
| `controllers/moduloController.js` | CRUD módulos, like (con reputación) |
| `middlewares/autenticacion.js` | `verificarSesion`, `esEspecialista` |
| `utils/reputacion.js` | Cálculo de rango de reputación |
| `utils/niveles.js` | Cálculo de nivel por puntos |
| `public/js/popup-valoracion.js` | Popup de estrellas compartido |
| `public/js/ubicacion-picker.js` | Selector de ubicación (Leaflet modal) |
| `public/js/qr-modal.js` | Modal de QR con blur reveal |
| `public/js/search.js` | Widget de búsqueda con categorías condicionales |
| `scripts/geocodificar-temas.js` | Batch geocoding Nominatim |
| `SPEC.md` | Este archivo |

---

## Convenciones de Código

- **Sin comentarios** en código fuente (salvo SPEC)
- Selectores CSS en kebab-case
- ES modules solo donde se usa `type="module"` (info-burbuja.js)
- Las vistas HTML se renderizan con `res.render()` y reciben `{{ cacheVersion }}` como variable global
- Archivos JS en `public/js/` usan funciones globales (no módulos) y se cargan como `<script src="...">` en el HTML
- No hay layout template compartido — cada HTML tiene su propio `<head>` completo
- Sin AI

---

## Feedback

| Método | Ruta | Auth |
|--------|------|------|
| POST | `/api/feedback` | No (desde ajustes-perfil) |
| GET | `/0505/api/feedback` | Admin |
| DELETE | `/0505/api/feedback/:id` | Admin |

- Guardado en tabla `feedback` de PostgreSQL
- Solo accesible desde `ajustes-perfil.html`

---

## Despliegue

1. Railway: configurar `DATABASE_URL` en Dashboard
2. No usar `.env` local — Railway lo maneja
3. `npm start` ejecuta `node app.js`
4. Deploy invalida caché del navegador vía `cacheVersion` (timestamp)
5. Service Worker se regenera automáticamente en cada deploy
