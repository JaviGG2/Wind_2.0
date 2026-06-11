// server.js (o app.js)
// server.js (o app.js)
const express = require('express');
const session = require('express-session');
const nunjucks = require('nunjucks');
require('dotenv').config();

const app = express();

// CONFIGURACIÓN DE MIDDLEWARES y TEMPLATES
nunjucks.configure('views', {
    autoescape: true,
    express: app,
    watch: true 
});
app.set('view engine', 'html');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'viento_caquetio_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Perfecto para entorno de desarrollo local (HTTP)
        httpOnly: true, // Protege contra robo de cookies por scripts malignos
        maxAge: 1000 * 60 * 60 * 2 // 2 Horas de sesión activa
    }
}));

// Evitar que el navegador almacene páginas privadas en caché
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Servir estáticos
app.use(express.static('public'));

// IMPORTACIÓN DE RUTAS MODULARES
const authRoutes = require('./routes/authRoutes');
const juegoRoutes = require('./routes/juegoRoutes');
const temaRoutes = require('./routes/temaRoutes');
const relatoRoutes = require('./routes/relatoRoutes');


// CORRECCIÓN CLAVE: Inyectamos todas las rutas de forma limpia en la raíz

app.use(authRoutes);   // Deja pasar las rutas internas como /auth/login, /auth/registro, etc.
app.use(juegoRoutes);
app.use(temaRoutes);
app.use(relatoRoutes);

// IMPORTACIÓN DE FILTROS DE SEGURIDAD (MIDDLEWARES)
const { verificarSesion, esEspecialista } = require('./middlewares/autenticacion');


// RUTAS DE VISTAS (Protegidas y Públicas con Nunjucks)

// El HOME: Solo accesible con sesión activa
app.get('/home', verificarSesion, (req, res) => {
    res.render('home'); 
});

// El DASHBOARD: Accesible para cualquier usuario verificado
app.get('/dashboard', verificarSesion, (req, res) => {
    res.render('dashboard'); 
});

// Sección de Relatos: Protegida con guardián
app.get('/relatos', verificarSesion, (req, res) => {
    res.render('relatos');
});

app.get('/subir-tema', verificarSesion, esEspecialista, (req, res) => {
    res.render('subir-tema');
});

// Las demás páginas públicas o de información general
app.get('/comunidad', (req, res) => res.render('comunidad'));
app.get('/historias', (req, res) => res.render('historias'));
app.get('/juegos', (req, res) => res.render('juegos'));
app.get('/barra_navegacion', (req, res) => res.render('barra_navegacion'));
app.get('/registro', (req, res) => res.render('Registro'));
app.get('/login', (req, res) => res.render('login'));
app.get('/', (req, res) => res.render('login'));

// INICIAR EL ESCUCHADOR EN EL PUERTO LOCAL
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`El servidor de Wind se encuentra activo.`);
    console.log(`Registro: http://localhost:${PORT}/registro`);
    console.log(`Login: http://localhost:${PORT}/login`);
});