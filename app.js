const express = require('express');
const session = require('express-session');
const nunjucks = require('nunjucks');
require('dotenv').config();
const path = require('path');

const app = express();

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
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 2
    }
}));

app.use('/css', express.static(path.join(__dirname, 'public', 'css'), {
    maxAge: 0,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
    }
}));
app.use('/js', express.static(path.join(__dirname, 'public', 'js'), {
    maxAge: 0,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
    }
}));
app.use('/img', express.static(path.join(__dirname, 'public', 'img'), { maxAge: '7d' }));
app.use('/fonts', express.static(path.join(__dirname, 'public', 'fonts'), { maxAge: '7d' }));
app.use('/manifest.json', express.static(path.join(__dirname, 'public', 'manifest.json'), { maxAge: '1h' }));
app.use('/sw.js', express.static(path.join(__dirname, 'public', 'sw.js'), { maxAge: '1h' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), { maxAge: '7d' }));

app.use((req, res, next) => {
    const staticExts = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico', '.json'];
    const ext = path.extname(req.path).toLowerCase();

    if (staticExts.includes(ext) || req.path.startsWith('/uploads') || req.path.startsWith('/img') || req.path.startsWith('/css') || req.path.startsWith('/js')) {
        return next();
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

const authRoutes = require('./routes/authRoutes');
const juegoRoutes = require('./routes/juegoRoutes');
const temaRoutes = require('./routes/temaRoutes');
const relatoRoutes = require('./routes/relatoRoutes');
const searchRoutes = require('./routes/searchRoutes');
const historialRoutes = require('./routes/historialRoutes');
const comentarioRoutes = require('./routes/comentarioRoutes');
const moduloRoutes = require('./routes/moduloRoutes');


app.use(authRoutes);
app.use(juegoRoutes);
app.use(temaRoutes);
app.use(juegoRoutes);
app.use(relatoRoutes);
app.use(searchRoutes);
app.use(historialRoutes);
app.use(comentarioRoutes);
app.use(moduloRoutes);

const { verificarSesion, esEspecialista } = require('./middlewares/autenticacion');

app.get('/home', verificarSesion, (req, res) => {
    res.render('home');
});

app.get('/dashboard', verificarSesion, (req, res) => {
    res.render('dashboard');
});

app.get('/relatos', verificarSesion, (req, res) => {
    res.render('relatos');
});

app.get('/ver-relato', verificarSesion, (req, res) => {
    res.render('ver-relato');
});

app.get('/crear-relato', verificarSesion, (req, res) => {
    res.render('crear-relato');
});

app.get('/subir-tema', verificarSesion, esEspecialista, (req, res) => {
    res.render('subir-tema');
});

app.get('/editar-tema', verificarSesion, esEspecialista, (req, res) => {
    res.render('editar-tema');
});

app.get('/ver-tema', verificarSesion, (req, res) => {
    res.render('ver-tema');
});

app.get('/comunidad', (req, res) => res.render('comunidad'));
app.get('/historias', (req, res) => res.render('historias'));
app.get('/juegos', verificarSesion, (req, res) => res.render('juegos'));
app.get('/barra_navegacion', (req, res) => res.render('barra_navegacion'));
app.get('/registro', (req, res) => res.render('Registro'));
app.get('/login', (req, res) => res.render('login'));
app.get('/ajustes-perfil', verificarSesion, (req, res) => res.render('ajustes-perfil'));
app.get('/recuperar-contrasena', (req, res) => res.render('recuperar-contrasena'));
app.get('/restablecer-contrasena', (req, res) => res.render('restablecer-contrasena'));
app.get('/', (req, res) => res.render('login'));

const db = require('./config/db');
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`El servidor de Wind se encuentra activo.`);
    console.log(`Registro: http://localhost:${PORT}/registro`);
    console.log(`Login: http://localhost:${PORT}/login`);

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS historial_vistas (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                tipo_contenido VARCHAR(10) NOT NULL CHECK (tipo_contenido IN ('tema', 'juego')),
                contenido_id INTEGER NOT NULL,
                fecha_vista TIMESTAMP DEFAULT NOW(),
                UNIQUE (usuario_id, tipo_contenido, contenido_id)
            )
        `);
        console.log('Tabla historial_vistas lista.');
    } catch (err) {
        console.error('Error creando tabla historial_vistas:', err.message);
    }

    try {
        await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64)`);
        await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token_expiracion TIMESTAMP`);
        console.log('Columnas reset_token listas.');
    } catch (err) {
        console.error('Error agregando columnas reset_token:', err.message);
    }
});