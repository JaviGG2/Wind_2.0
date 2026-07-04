# Wind — Especificación Técnica

## Descripción

Plataforma web para explorar, aprender y preservar el patrimonio cultural de Coro. Los usuarios pueden descubrir historias, tradiciones y secretos de la región a través de temas, relatos comunitarios y juegos interactivos.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express |
| Frontend | HTML + CSS + JS vanilla |
| Base de datos | PostgreSQL |
| Template engine | EJS (HTML renderizado con `res.render`) |
| Autenticación | Sesiones vía `express-session` + PostgreSQL (`session` table) |
| Estilos | CSS vanilla con variables, flexbox, grid |
| Iconos | Material Symbols (Google Fonts) |
| Tipografía | Rethink Sans (Google Fonts via `@import`) |
| PWAs | Service Worker dinámico con `CACHE_VERSION` |
| Despliegue | Railway (`DATABASE_URL` en Dashboard) |

---

## Arquitectura

```
Wind_2.0/
├── app.js                  # Entry point, Express config, rutas, static files
├── server.js               # (alternativo) Incluye static de views/
├── package.json            # main: app.js
├── config/
│   └── db.js               # Pool de conexión a PostgreSQL
├── controllers/            # Lógica de negocio por recurso
├── routes/                 # Definiciones de rutas Express
├── middlewares/
│   └── autenticacion.js    # verificarSesion, esEspecialista
├── utils/                  # Utilidades (niveles, recomendador)
├── views/                  # Plantillas HTML (EJS)
├── public/
│   ├── css/                # Estilos por página
│   ├── js/                 # Scripts por página
│   ├── images/             # SVGs de loading, imágenes
│   ├── img/                # Logo, iconos
│   └── uploads/            # Archivos subidos por usuarios
└── database/               # (opcional) Schemas SQL
```

### Flujo de Request

1. Express recibe request
2. Middleware de sesión verifica autenticación (donde aplica)
3. Route handler ejecuta controller
4. Controller consulta PostgreSQL vía `db.query()`
5. Respuesta: `res.render('vista', data)` o `res.json(data)`

---

## Base de Datos (PostgreSQL)

### Tablas principales

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
| `reacciones` | Likes/reacciones a relatos |
| `feedback` | Feedback de usuarios |
| `session` | Sesiones de Express |

### Tabla `historial_vistas` (polimórfica)

```sql
CREATE TABLE historial_vistas (
    id              SERIAL PRIMARY KEY,
    usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_contenido  VARCHAR(10) NOT NULL CHECK (tipo_contenido IN ('tema', 'juego')),
    contenido_id    INTEGER NOT NULL,
    fecha_vista     TIMESTAMP DEFAULT NOW(),
    UNIQUE (usuario_id, tipo_contenido, contenido_id)
);
```

- `contenido_id` es una FK polimórfica: apunta a `temas.id` o `juegos.id` según `tipo_contenido`
- No tiene constraint FK declarado porque PostgreSQL no permite FK a dos tablas

---

## Rutas Principales

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
| `/control` | control | Especialista |
| `/registro` | Registro | No |
| `/login` | login | No |
| `/ranking-game?id=X` | ranking-game | Sí |

### API (JSON)

| Método | Ruta | Propósito |
|--------|------|-----------|
| GET | `/api/buscar?q=...` | Búsqueda de contenido |
| POST | `/api/feedback` | Enviar feedback |
| GET | `/0505/api/feedback` | Listar feedback (admin) |
| DELETE | `/0505/api/feedback/:id` | Eliminar feedback |
| POST | `/api/modulos/:id/niveles/:nivelId/completar` | Completar nivel |
| POST | `/api/juegos/:id/responder` | Responder juego (otorga puntos) |

---

## Sistema de Puntos y Niveles

- **Único** que otorga puntos: `responderJuego` (vía `juegoController.js`)
- `completarNivel` solo marca nivel completado en `progreso_modulo` — **NO** da puntos
- Anti-duplicado: `historial_vistas` con UNIQUE + `ON CONFLICT DO UPDATE`
- `calcularNivel(puntos)` en `utils/niveles.js` mapea puntos → nivel

---

## Loaders y SVGs Animados

### Sistema de loading unificado

```html
<img src="/images/loading.svg" class="anim-loading" alt="Cargando...">
```

- `img.anim-loading` centrado, 36px de ancho, con animación `flotar` (translateY ±8px + rotate ±2°)
- La animación de trazo está dentro de cada SVG (inline `<style>`)
- Estilos disponibles: `dibujarContinuo` (dashes fluyendo), `secuenciaSuave` (fade-in + draw + fade-out), etc.

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

### Estilos de animación

| Sufijo | Descripción |
|--------|-------------|
| (base) | Dashes fluyendo continuo, 15s linear |
| `-reverse` | Flujo inverso |
| `-pingpong` | Va y viene |
| `-acelera` | Slow → fast (cubic-bezier) |
| `-ritmico` | Avanza en 8 pasos |
| `-salto` | Saltos bruscos |
| `-onda` | Oscila como ola |
| `-rebote` | Rebota al final |
| `-carrusel` | Tramos con pausa |
| `-tiron` | Acelera/frena bruscamente |
| `-marea` | Va y viene suave |
| `-escalera` | 4 escalones con meseta |
| `-latigo` | Arranque rápido + reinicio |
| `-secuencia-new` | Fade in → draw → fade out |
| `-destello-new` | Draw rápido → fade lento |
| `-revelar-new` | Draw lento → fade rápido |
| `-pulso-new` | Draw + fade + pausa |
| `-eco-new` | Fade lento en todo el ciclo |
| `-relampago-new` | Aparece instantáneo |

---

## Static Files y Caché

- Todos los assets: `Cache-Control: no-store`
- CSS/JS versioneados con `?v={{ cacheVersion }}` (timestamp al iniciar server)
- Service Worker dinámico: `{{CACHE_VERSION}}` inyectado en `/sw.js` al servir
- Estrategia del SW: network-first, limpieza de cachés viejas en activate

---

## Diseño Responsive

| Breakpoint | Comportamiento |
|-----------|---------------|
| `< 769px` | Menú colapsado, layout mobile-first |
| `≥ 769px` | Menú lateral 270px, `margin-left: 270px` en contenido |
| `≥ 821px` | Home grid 2 columnas |
| `≥ 900px` | Login split view (panel bienvenida + formulario) |

---

## Convenciones de Código

- **Sin comentarios** en código fuente (salvo SPEC)
- Selectores CSS en kebab-case
- ES modules solo donde se usa `type="module"` (info-burbuja.js)
- Las vistas HTML se renderizan con `res.render()` y reciben `{{ cacheVersion }}` como variable global
- Archivos JS en `public/js/` usan funciones globales (no módulos) y se cargan como `<script src="...">` en el HTML
- No hay layout template compartido — cada HTML tiene su propio `<head>` completo

---

## Autenticación

- Sesiones manejadas con `express-session` + tabla `session` en PostgreSQL
- Middleware `verificarSesion` en `middlewares/autenticacion.js`
- Middleware `esEspecialista` para rutas administrativas (`/control`, `/0505/*`)
- `req.session.usuarioId` disponible en controllers

---

## Feedback

| Método | Ruta | Auth |
|--------|------|------|
| POST | `/api/feedback` | No (desde ajustes-perfil) |
| GET | `/0505/api/feedback` | Especialista |
| DELETE | `/0505/api/feedback/:id` | Especialista |

- Guardado en tabla `feedback` de PostgreSQL
- Solo accesible desde `ajustes-perfil.html` (no hay FAB flotante)

---

## Despliegue

1. Railway: configurar `DATABASE_URL` en Dashboard
2. No usar `.env` local — Railway lo maneja
3. `npm start` ejecuta `node app.js`
4. Deploy invalida caché del navegador vía `cacheVersion` (timestamp)
5. Service Worker se regenera automáticamente en cada deploy
