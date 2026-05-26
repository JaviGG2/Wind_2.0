const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
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
    const { nombre, correo, contrasena } = req.body;

    // Validación básica en el servidor
    if (!nombre || !correo || !contrasena) {
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
            INSERT INTO usuarios (nombre, correo, contrasena, rol)
            VALUES ($1, $2, $3, $4)
        `;
        const valores = [nombre, correo, contrasenaEncriptada, 'Natural'];

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
    const { correo, contrasena } = req.body;

    // Validación básica
    if (!correo || !contrasena) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    try {
        // Buscar usuario en Neon por correo
        const consultaSQL = 'SELECT * FROM usuarios WHERE correo = $1';
        const resultadoBD = await db.query(consultaSQL, [correo]);

        // Si no devuelve filas, el correo no existe en el sistema
        if (resultadoBD.rows.length === 0) {
            return res.status(401).json({ mensaje: 'El correo o la contraseña son incorrectos.' });
        }

        const usuario = resultadoBD.rows[0];

        // Comparar contraseña ingresada con el hash encriptado
        const contrasenaCorrecta = await bcrypt.compare(contrasena, usuario.contrasena);

        if (!contrasenaCorrecta) {
            return res.status(401).json({ mensaje: 'El correo o la contraseña son incorrectos.' });
        }

        // Crear la sesión del usuario en el servidor
        req.session.usuario = {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.rol
        };

        // Responder con éxito
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
// INICIAR EL ESCUCHADOR EN EL PUERTO LOCAL
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`El servidor de Wind se encuentra activo.`);
    console.log(`Registro: http://localhost:${PORT}/registro.html`);
    console.log(`Login: http://localhost:${PORT}/login.html`);
});