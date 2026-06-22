# Wind 2.0 — Plataforma de Patrimonio Cultural

Plataforma web para la difusión del patrimonio cultural de Coro, Venezuela. Incluye gestión de contenido histórico (temas, relatos), juegos patrimoniales (trivias, memoria, asociación, palabras), sistema de módulos con niveles, gamificación (puntos), y perfiles de usuario.

---

## Diagrama de Clases

```mermaid
classDiagram
    class Usuario {
        +int id
        +string nombre
        +string username
        +string correo
        +string contrasena
        +string rol  "Natural | Especialista"
        +int puntos
        +string imagen_perfil
        +string session_token
        +bool cuenta_activa
        +string codigo_verificacion
        +login()
        +registro()
        +logout()
    }

    class Tema {
        +int id
        +string titulo
        +string contenido
        +int categoria_id
        +int creador_id
        +string imagen_portada
        +datetime fecha_publicacion
        +int likes
        +string slug
        +crear()
        +actualizar()
        +listar()
        +darLike()
    }

    class Categoria {
        +int id
        +string nombre
    }

    class Comentario {
        +int id
        +int usuario_id
        +int tema_id
        +string contenido
        +datetime fecha_creacion
        +listar()
        +crear()
        +eliminar()
    }

    class Juego {
        +int id
        +int categoria_id
        +int usuario_id
        +string pregunta
        +string opcion_a
        +string opcion_b
        +string opcion_c
        +string opcion_correcta
        +string tipo  "Quiz | Memory | Match | Scramblee"
        +int puntos_recompensa
        +crear()
        +responder()
        +listar()
    }

    class Modulo {
        +int id
        +int id_usuario
        +string nombre
        +string descripcion
        +crear()
        +listar()
        +obtener()
    }

    class Nivel {
        +int id
        +string nombre
        +string descripcion
        +int id_juego
        +int id_modulo
        +int orden
        +string estado  "bloqueado | disponible | completado"
        +agregar()
        +eliminar()
        +completar()
    }

    class ProgresoModulo {
        +int id
        +int usuario_id
        +int modulo_id
        +int nivel_id
        +bool completado
        +int puntos_obtenidos
    }

    class Relato {
        +int id
        +string titulo
        +string contenido_relato
        +int usuario_id
        +string imagen_url
        +datetime fecha_publicacion
        +string categoria
        +crear()
        +listar()
    }

    class HistorialVista {
        +int id
        +int usuario_id
        +string tipo_contenido  "tema | juego"
        +int contenido_id
        +datetime fecha_vista
    }

    Usuario "1" --> "*" Tema : crea
    Usuario "1" --> "*" Juego : crea
    Usuario "1" --> "*" Comentario : escribe
    Usuario "1" --> "*" Relato : publica
    Usuario "1" --> "*" HistorialVista : genera
    Usuario "1" --> "*" Modulo : crea
    Usuario "1" --> "*" ProgresoModulo : tiene
    Usuario "1" --> "0..1" TemasLike : da

    Tema "1" --> "*" Comentario : contiene
    Tema "1" --> "*" TemasLike : recibe
    Tema "*" --> "1" Categoria : pertenece

    Juego "*" --> "1" Categoria : pertenece
    Juego "1" --> "1" Nivel : asignado
    Juego "1" --> "0..*" HistorialVista : registrado

    Modulo "1" --> "*" Nivel : contiene
    Modulo "1" --> "*" ProgresoModulo : seguimiento

    Nivel "1" --> "0..*" ProgresoModulo : progreso
```

---

## Arquitectura

```
app.js                    ← Punto de entrada
├── config/
│   ├── db.js             ← Pool de PostgreSQL
│   └── imagekit.js       ← Cliente ImageKit CDN
├── middlewares/
│   ├── autenticacion.js  ← verificarSesion, esEspecialista
│   └── subidaImagen.js   ← Multer + subirAImagekit()
├── controllers/          ← Lógica de negocio
│   ├── authController.js
│   ├── temaController.js
│   ├── juegoController.js
│   ├── moduloController.js
│   ├── comentarioController.js
│   ├── relatosController.js
│   ├── historialController.js
│   └── searchController.js
├── routes/               ← Definición de rutas HTTP
│   ├── authRoutes.js
│   ├── temaRoutes.js
│   ├── juegoRoutes.js
│   ├── moduloRoutes.js
│   ├── comentarioRoutes.js
│   ├── relatoRoutes.js
│   ├── searchRoutes.js
│   └── historialRoutes.js
├── views/                ← Plantillas HTML (21 páginas)
├── public/
│   ├── css/
│   ├── js/
│   └── uploads/
└── .env                  ← Variables de entorno
```

---

## Inicio Rápido

```bash
npm install
cp .env.example .env      # Configurar credenciales
npm run dev               # http://localhost:3000
```

## Stack

| Capa       | Tecnología               |
|------------|--------------------------|
| Backend    | Node.js + Express 5      |
| Base datos | PostgreSQL (Neon.tech)   |
| Frontend   | HTML + CSS + JS vanilla  |
| Templates  | Nunjucks                 |
| Sesiones   | express-session          |
| CDN        | ImageKit                 |
| Auth       | bcryptjs + sesión única  |

## Tipos de Juego

| Tipo       | Mecánica                            |
|------------|-------------------------------------|
| Quiz       | Pregunta con 3 opciones (A/B/C)     |
| Memory     | Encontrar pares de cartas           |
| Match      | Conectar concepto con su respuesta  |
| Scramblee  | Ordenar letras para formar palabra  |

## Roles

- **Natural** — Usuario registrado, puede jugar, comentar, escribir relatos
- **Especialista** — Puede crear temas, juegos, módulos y gestionar contenido
