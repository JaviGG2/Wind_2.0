const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./config/db');
require('dotenv').config();

const app = express();

// Configuración para leer formularios HTML y JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de Sesiones
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // 1 hora de sesión
}));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

// Páginas HTML estáticas servidas manualmente
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

app.get('/registro', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'Registro.html'));
});

app.get('/registro.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'Registro.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// ==========================================
// RUTA 1: Registro Único de Usuarios
// ==========================================
app.post('/auth/registro', async (req, res) => {
    const { nombre, username, correo, contrasena } = req.body;
    
    if (!nombre || !username || !correo || !contrasena) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    try {
        const hash = await bcrypt.hash(contrasena, 10);
        
        // Creamos la consulta limpia
        const queryTexto = 'INSERT INTO usuarios (nombre, username, correo, contrasena, rol) VALUES ($1, $2, $3, $4, $5)';
        
        // Creamos el arreglo asegurando que 'username' vaya estrictamente en la segunda posición ($2)
        const valores = [nombre, username, correo, hash, 'Natural'];

        // Ejecutamos pasándole las variables ordenadas
        await db.query(queryTexto, valores);
        
        res.status(201).json({ mensaje: 'Registro exitoso. Ahora puedes iniciar sesión.' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ mensaje: 'El correo o nombre de usuario ya está registrado.' });
        }
        console.error('Error en registro:', error);
        res.status(500).json({ mensaje: 'Error en el registro. Inténtalo de nuevo más tarde.' });
    }
});

// ==========================================
// RUTA 2: Inicio de Sesión Único
// ==========================================
app.post('/auth/login', async (req, res) => {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena) {
        return res.status(400).json({ mensaje: 'Correo y contraseña son obligatorios.' });
    }

    try {
        const result = await db.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
        if (result.rows.length === 0) return res.status(401).json({ mensaje: 'Usuario no encontrado.' });

        const usuario = result.rows[0];
        const coincide = await bcrypt.compare(contrasena, usuario.contrasena);

        if (coincide) {
            // Guardamos los datos clave en la sesión del servidor
            req.session.usuarioId = usuario.id;
            req.session.rol = usuario.rol;
            req.session.nombre = usuario.nombre;
            res.json({ mensaje: `Bienvenido ${usuario.nombre}. Rol: ${usuario.rol}` });
        } else {
            res.status(401).json({ mensaje: 'Contraseña incorrecta.' });
        }
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ mensaje: 'Error en el servidor.' });
    }
});

// ==========================================
// RUTA 3: Subida de Temas Históricos (Solo Especialistas usando Plantilla)
// ==========================================
app.post('/admin/subir-tema', async (req, res) => {
    // Regla de Negocio: Validar si la sesión existe y tiene rol Especialista
    if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
        return res.status(403).send('Acceso denegado: Solo los Especialistas pueden subir contenido oficial.');
    }

    const { categoria_id, titulo, contenido_historico, ubicacion_monumento } = req.body;
    try {
        await db.query(
            'INSERT INTO temas (categoria_id, autor_id, titulo, contenido_historico, ubicacion_monumento) VALUES ($1, $2, $3, $4, $5)',
            [categoria_id, req.session.usuarioId, titulo, contenido_historico, ubicacion_monumento]
        );
        res.send('Contenido patrimonial publicado con éxito bajo la plantilla predefinida.');
    } catch (error) {
        res.status(500).send('Error al publicar el tema.');
    }
});

// ==========================================
// RUTA 4: Módulo de Juegos (Responder y ganar Puntos)
// ==========================================
app.post('/juegos/responder', async (req, res) => {
    if (!req.session.usuarioId) return res.status(401).send('Debes iniciar sesión para jugar.');

    const { juego_id, respuesta_usuario } = req.body;
    try {
        const juegoRes = await db.query('SELECT * FROM juegos WHERE id = $1', [juego_id]);
        if (juegoRes.rows.length === 0) return res.status(404).send('Juego no encontrado.');

        const juego = juegoRes.rows[0];

        if (respuesta_usuario === juego.opcion_correcta) {
            // Sumar puntos al perfil del Usuario Natural
            await db.query('UPDATE usuarios SET puntos = puntos + $1 WHERE id = $2', [juego.puntos_recompensa, req.session.usuarioId]);
            res.json({ correcto: true, mensaje: `¡Correcto! Has ganado ${juego.puntos_recompensa} pts.` });
        } else {
            res.json({ correcto: false, mensaje: 'Respuesta incorrecta. ¡Sigue intentando!' });
        }
    } catch (error) {
        res.status(500).send('Error al procesar el juego.');
    }
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de Wind corriendo en el puerto ${PORT}`);
});