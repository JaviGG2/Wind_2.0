const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const db = require('./config/db'); // Importa tu Pool de Neon.tech
require('dotenv').config();

const app = express();

// ==========================================
// CONFIGURACIÓN DE MIDDLEWARES
// ==========================================

// Permite a Express entender datos en formato JSON enviados en el body
app.use(express.json());

// Permite leer formularios tradicionales codificados en URL
app.use(express.urlencoded({ extended: true }));

// Configuración del middleware de sesiones para recordar al usuario
app.use(session({
    secret: process.env.SESSION_SECRET || 'viento_caquetio_secret_key_2026',
    resave: false,                  // No guarda la sesión si no hubo cambios
    saveUninitialized: false,       // No crea sesiones vacías
    cookie: { 
        secure: false,              // Poner en true solo si usas HTTPS (producción)
        maxAge: 1000 * 60 * 60 * 2  // Duración de la sesión: 2 horas
    }
}));

// Servir automáticamente los HTML de la carpeta 'views'
app.use(express.static('views'));

// Servir automáticamente los estilos (css) y scripts (js) desde 'public'
app.use(express.static('public'));


// ==========================================
// RUTA POST: Registro de Usuarios
// ==========================================
app.post('/auth/registro', async (req, res) => {
    const { nombre, username, correo, contrasena } = req.body;

    // Validación básica en el servidor
    if (!nombre || !username || !correo || !contrasena) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    if (contrasena.length < 6) {
        return res.status(400).json({ mensaje: 'La contraseña debe tener mínimo 6 caracteres.' });
    }

    try {
        // Encriptar contraseña
        const contrasenaEncriptada = await bcrypt.hash(contrasena, 10);

        // Consulta SQL parametrizada
        const consultaSQL = `
            INSERT INTO usuarios (nombre, username, correo, contrasena, rol)
            VALUES ($1, $2, $3, $4, $5)
        `;
        const valores = [nombre, username, correo, contrasenaEncriptada, 'Natural'];

        await db.query(consultaSQL, valores);

        return res.status(201).json({ mensaje: '¡Usuario registrado con éxito en el sistema!' });

    } catch (error) {
        // Error de correo electrónico duplicado (Clave única en Postgres)
        if (error.code === '23505') {
            return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado.' });
        }

        console.error('Error en el servidor al insertar usuario:', error);
        return res.status(500).json({ mensaje: 'Error interno de la aplicación. Inténtelo más tarde.' });
    }
});


// ==========================================
// RUTA POST: Inicio de Sesión (Login)
// ==========================================
app.post('/auth/login', async (req, res) => {
    const { correo, username, contrasena } = req.body;
    const identificador = correo || username;

    // Validación básica
    if (!identificador || !contrasena) {
        return res.status(400).json({ mensaje: 'El correo/usuario y la contraseña son obligatorios.' });
    }

    try {
        // Buscar usuario en Neon por correo o nombre de usuario
        const consultaSQL = correo
            ? 'SELECT * FROM usuarios WHERE correo = $1'
            : 'SELECT * FROM usuarios WHERE username = $1';
        const resultadoBD = await db.query(consultaSQL, [identificador]);

        if (resultadoBD.rows.length === 0) {
            return res.status(401).json({ mensaje: 'El correo o la contraseña son incorrectos.' });
        }

        const usuario = resultadoBD.rows[0];
        const contrasenaCorrecta = await bcrypt.compare(contrasena, usuario.contrasena);

        if (!contrasenaCorrecta) {
            return res.status(401).json({ mensaje: 'El correo o la contraseña son incorrectos.' });
        }

        req.session.usuario = {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.rol
        };
        req.session.usuarioId = usuario.id;
        req.session.nombre = usuario.nombre;
        req.session.rol = usuario.rol;

        return res.status(200).json({
            mensaje: `¡Bienvenido de vuelta, ${usuario.nombre}!`,
            usuario: req.session.usuario
        });

    } catch (error) {
        console.error('Error en el servidor durante el login:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
});

// ==========================================
// RUTA: Obtener los Datos del Usuario Autenticado
// ==========================================
app.get('/auth/perfil', (req, res) => {
    if (!req.session.usuario && !req.session.usuarioId) {
        return res.status(401).json({ mensaje: 'No autorizado. Inicie sesión.' });
    }
    // Devolvemos el estado actual de la sesión
    res.json({
        id: req.session.usuario?.id || req.session.usuarioId,
        nombre: req.session.usuario?.nombre || req.session.nombre,
        rol: req.session.usuario?.rol || req.session.rol
    });
});

// ==========================================
// RUTA: Ascender Rol del Usuario en Tiempo Real
// ==========================================
app.post('/auth/ascender', async (req, res) => {
    if (!req.session.usuarioId) {
        return res.status(401).json({ mensaje: 'Debes iniciar sesión para realizar esta acción.' });
    }

    const { respuestaExamen } = req.body;

    // Regla de Negocio: Validamos la prueba interna en el servidor 
    if (respuestaExamen !== 'correcto') {
        return res.status(400).json({ mensaje: 'Evaluación reprobada. Revisa tus conocimientos históricos sobre Coro e inténtalo de nuevo.' });
    }

    try {
        // Ejecutamos la actualización directa en Neon.tech
        await db.query('UPDATE usuarios SET rol = $1 WHERE id = $2', ['Especialista', req.session.usuarioId]);
        
        // ¡SUPER IMPORTANTE! Actualizamos la sesión en la memoria de Node.js para que las demás rutas lean el cambio
        req.session.rol = 'Especialista';

        res.json({ 
            mensaje: '¡Felicidades! Has aprobado la prueba interna. Tu rol ha sido actualizado a Especialista.',
            nuevoRol: 'Especialista'
        });
    } catch (error) {
        console.error('Error al ascender rol:', error);
        res.status(500).json({ mensaje: 'Error interno al procesar la solicitud de ascenso.' });
    }
});

// ==========================================
// RUTA: Cerrar Sesión (Logout)
// ==========================================
app.post('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ mensaje: 'No se pudo cerrar la sesión.' });
        res.clearCookie('connect.sid'); // Limpia la cookie del navegador
        res.json({ mensaje: 'Sesión destruida con éxito.' });
    });
});

// ==========================================
// RUTA: Servir Vista de Creación de Juegos (Solo Especialistas)
// ==========================================
app.get('/crear-juego', (req, res) => {
    if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
        return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, 'views', 'crear-juego.html'));
});

// ==========================================
// RUTA: Insertar Nueva Trivia Creada por Especialista
// ==========================================
    // ==========================================
// RUTA: Insertar Nueva Trivia Creada por Especialista
// ==========================================
app.post('/admin/crear-juego', async (req, res) => {
    if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
        return res.status(403).json({ mensaje: 'Acceso denegado: Rol insuficiente.' });
    }

    const { categoria_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_correcta, puntos_recompensa } = req.body;
    const categoriaValida = categoria_id ? parseInt(categoria_id, 10) : null;

    if (!pregunta || !opcion_a || !opcion_b || !opcion_c || !opcion_correcta) {
        return res.status(400).json({ mensaje: 'Todos los campos de la trivia son obligatorios.' });
    }

    try {
        let queryTexto;
        let valores;

        if (categoriaValida && !Number.isNaN(categoriaValida)) {
            queryTexto = `
                INSERT INTO juegos (categoria_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_correcta, puntos_recompensa)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;
            valores = [
                categoriaValida,
                pregunta,
                opcion_a,
                opcion_b,
                opcion_c,
                opcion_correcta,
                parseInt(puntos_recompensa, 10) || 10
            ];
        } else {
            queryTexto = `
                INSERT INTO juegos (pregunta, opcion_a, opcion_b, opcion_c, opcion_correcta, puntos_recompensa)
                VALUES ($1, $2, $3, $4, $5, $6)
            `;
            valores = [
                pregunta,
                opcion_a,
                opcion_b,
                opcion_c,
                opcion_correcta,
                parseInt(puntos_recompensa, 10) || 10
            ];
        }

        await db.query(queryTexto, valores);

        return res.status(201).json({ mensaje: '¡Nueva trivia patrimonial publicada con éxito!' });

    } catch (error) {
        // ESTA LÍNEA ES CLAVE: Te pintará el error real de Postgres en la consola de VS Code
        console.error('❌ ERROR REAL DE POSTGRES:', error.message); 
        
        return res.status(500).json({ mensaje: 'Error interno al guardar la trivia.' });
    }
});

// ==========================================
// RUTA: Obtener todos los juegos para el historial del Especialista
// ==========================================
app.get('/admin/mis-juegos', async (req, res) => {
    // Si la sesión expiró o cambió de rol, salimos por seguridad
    if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
        return res.status(403).json({ mensaje: 'Acceso denegado.' });
    }

    try {
        // Hacemos el JOIN con categorías para ver el nombre del eje temático
        const queryTexto = `
            SELECT j.id, j.pregunta, j.opcion_a, j.opcion_b, j.opcion_c, j.opcion_correcta, j.puntos_recompensa, c.nombre AS categoria_nombre
            FROM juegos j
            LEFT JOIN categorias c ON j.categoria_id = c.id
            ORDER BY j.id DESC
        `;
        
        const resultado = await db.query(queryTexto);
        return res.json(resultado.rows);
    } catch (error) {
        console.error('❌ Error en el historial del dashboard:', error.message);
        return res.status(500).json({ mensaje: 'Error al cargar el historial de trivias.' });
    }
});

// ==========================================
// INICIAR EL ESCUCHADOR EN EL PUERTO LOCAL
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`El servidor de Wind se encuentra activo.`);
    console.log(`Registro: http://localhost:${PORT}/registro.html`);
    console.log(`Login: http://localhost:${PORT}/login.html`);
});