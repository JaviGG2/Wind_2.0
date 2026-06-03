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
        secure: false,
        maxAge: 1000 * 60 * 60 * 2 // 2 Horas
    }
}));

// Servir estáticos

app.use(express.static('public'));

// ==========================================
// IMPORTACIÓN E INYECCIÓN DE RUTAS MODULARES
// ==========================================
const authRoutes = require('./routes/authRoutes');
const juegoRoutes = require('./routes/juegoRoutes');
const temaRoutes = require('./routes/temaRoutes');

app.use(authRoutes);
app.use(juegoRoutes);
app.use(temaRoutes);
app.use('/auth', authRoutes); // Prefijo para rutas de autenticación

// Aquí puedes añadir más adelante app.use(comentarioRoutes); si creas sus archivos

// 1. Importas los filtros de seguridad al principio de tus rutas en app.js
const { verificarSesion} = require('./middlewares/autenticacion');


// RUTAS DE VISTAS (Protegidas y Públicas con Nunjucks)


// El HOME ahora está protegido: Si no hay sesión, rebota al login
app.get('/home', verificarSesion, (req, res) => {
    res.render('home'); // Renderiza views/home.html usando Nunjucks
});

// El DASHBOARD está super protegido: Solo entra si es Especialista
app.get('/dashboard', verificarSesion, (req, res) => {
    res.render('dashboard'); // Renderiza views/dashboard.html
});

// Las demás páginas se quedan públicas o accesibles según tu lógica:
app.get('/comunidad', (req, res) => res.render('comunidad'));
app.get('/relatos', (req, res) => res.render('relatos'));
app.get('/historias', (req, res) => res.render('historias'));
app.get('/juegos', (req, res) => res.render('juegos'));
app.get('/barra_navegacion', (req, res) => res.render('barra_navegacion'));
app.get('/registro', (req, res) => res.render('Registro'));
app.get('/login', (req, res) => res.render('login'));

// INICIAR EL ESCUCHADOR EN EL PUERTO LOCAL


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`El servidor de Wind se encuentra activo.`);
    console.log(`Registro: http://localhost:${PORT}/registro.html`);
    console.log(`Login: http://localhost:${PORT}/login.html`);
});