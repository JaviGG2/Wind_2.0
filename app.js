const express = require('express');
const session = require('express-session');
const nunjucks = require('nunjucks');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

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

const noCache = { maxAge: 0, setHeaders: (res) => { res.setHeader('Cache-Control', 'no-store'); } };
app.locals.cacheVersion = Date.now();
app.use('/css', express.static(path.join(__dirname, 'public', 'css'), noCache));
app.use('/js', express.static(path.join(__dirname, 'public', 'js'), noCache));
app.use('/img', express.static(path.join(__dirname, 'public', 'img'), noCache));
app.use('/fonts', express.static(path.join(__dirname, 'public', 'fonts'), noCache));
app.get('/manifest.json', (req, res) => {
    let manifest = fs.readFileSync(path.join(__dirname, 'public', 'manifest.json'), 'utf8');
    manifest = JSON.parse(manifest);
    manifest.icons = manifest.icons.map(icon => ({
        ...icon,
        src: icon.src + '?v=' + app.locals.cacheVersion
    }));
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json(manifest);
});
app.get('/sw.js', (req, res) => {
    let sw = fs.readFileSync(path.join(__dirname, 'views', 'sw.js'), 'utf8');
    sw = sw.replace(/{{CACHE_VERSION}}/g, app.locals.cacheVersion);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.type('application/javascript').send(sw);
});
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), noCache));
app.use(express.static(path.join(__dirname, 'public'), noCache));

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

const authRoutes = require('./routes/authRoutes');
const juegoRoutes = require('./routes/juegoRoutes');
const temaRoutes = require('./routes/temaRoutes');
const relatoRoutes = require('./routes/relatoRoutes');
const searchRoutes = require('./routes/searchRoutes');
const historialRoutes = require('./routes/historialRoutes');
const comentarioRoutes = require('./routes/comentarioRoutes');
const moduloRoutes = require('./routes/moduloRoutes');
const notificacionRoutes = require('./routes/notificacionRoutes');
const recomendacionRoutes = require('./routes/recomendacionRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const denunciaRoutes = require('./routes/denunciaRoutes');
const seguidoresController = require('./controllers/seguidoresController');
const traduccionController = require('./controllers/traduccionController');
const { verificarSesion, esEspecialista } = require('./middlewares/autenticacion');
const { calcularNivel } = require('./utils/niveles');
const { calcularRangoReputacion } = require('./utils/reputacion');

app.get('/api/usuario/nivel', verificarSesion, async (req, res) => {
    try {
        const result = await db.query('SELECT puntos FROM usuarios WHERE id = $1', [req.session.usuarioId]);
        const puntos = result.rows[0]?.puntos || 0;
        res.json(calcularNivel(puntos));
    } catch (error) {
        console.error('Error al obtener nivel:', error);
        res.status(500).json({ mensaje: 'Error al cargar nivel.' });
    }
});

app.get('/api/usuario/reputacion', verificarSesion, async (req, res) => {
    try {
        const result = await db.query('SELECT reputacion FROM usuarios WHERE id = $1', [req.session.usuarioId]);
        const reputacion = result.rows[0]?.reputacion || 0;
        res.json(calcularRangoReputacion(reputacion));
    } catch (error) {
        console.error('Error al obtener reputacion:', error);
        res.status(500).json({ mensaje: 'Error al cargar reputacion.' });
    }
});

// --- Perfil público de usuario ---
app.get('/api/usuarios/:id/perfil', verificarSesion, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ mensaje: 'ID inválido.' });
        const r = await db.query(
            'SELECT id, nombre, username, rol, puntos, imagen_perfil, avatar_fondo, reputacion FROM usuarios WHERE id = $1',
            [id]
        );
        if (r.rows.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        const user = r.rows[0];
        const nivel = calcularNivel(user.puntos || 0);

        let conteo_relatos = 0, conteo_temas = 0, conteo_juegos = 0;
        try { const q = await db.query('SELECT COUNT(*)::int as c FROM relatos_community WHERE usuario_id = $1', [id]); conteo_relatos = q.rows[0].c; } catch (_) {}
        try { const q = await db.query('SELECT COUNT(*)::int as c FROM temas WHERE creador_id = $1 AND estado = $2', [id, 'aprobado']); conteo_temas = q.rows[0].c; } catch (_) {}
        try { const q = await db.query('SELECT COUNT(*)::int as c FROM juegos WHERE usuario_id = $1', [id]); conteo_juegos = q.rows[0].c; } catch (_) {}

        let seguidores_count = 0, siguiendo_count = 0, siguiendo = false;
        try {
          const sc = await db.query('SELECT COUNT(*)::int as c FROM seguidores WHERE siguiendo_id = $1', [id]);
          seguidores_count = sc.rows[0].c;
        } catch (_) {}
        try {
          const sc = await db.query('SELECT COUNT(*)::int as c FROM seguidores WHERE seguidor_id = $1', [id]);
          siguiendo_count = sc.rows[0].c;
        } catch (_) {}
        if (req.session.usuarioId && req.session.usuarioId !== id) {
          try {
            const sf = await db.query('SELECT id FROM seguidores WHERE seguidor_id = $1 AND siguiendo_id = $2',
              [req.session.usuarioId, id]);
            siguiendo = sf.rows.length > 0;
          } catch (_) {}
        }

        let reputacionRango = null;
        try {
            reputacionRango = calcularRangoReputacion(user.reputacion || 0);
        } catch (_) {}

        res.json({ ...user, nivel, reputacionRango, conteo_relatos, conteo_temas, conteo_juegos, seguidores_count, siguiendo_count, siguiendo });
    } catch (e) {
        console.error('Error al obtener perfil:', e);
        res.status(500).json({ mensaje: 'Error al cargar perfil.' });
    }
});


app.use(authRoutes);
app.use(juegoRoutes);
app.use(temaRoutes);
app.use(relatoRoutes);
app.use(searchRoutes);
app.use(historialRoutes);
app.use(comentarioRoutes);
app.use(moduloRoutes);
app.use(notificacionRoutes);
app.use(recomendacionRoutes);
app.use(feedbackRoutes);
app.use(denunciaRoutes);
app.post('/api/seguir/:id', seguidoresController.toggleSeguir);
app.get('/api/seguidores/:id', seguidoresController.obtenerSeguidores);
app.get('/api/siguiendo/:id', seguidoresController.obteniendoSigo);
app.post('/api/traducir', traduccionController.traducir);

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

app.get('/notificaciones', verificarSesion, (req, res) => {
    res.render('notificaciones');
});

app.get('/ver-tema', verificarSesion, (req, res) => {
    res.render('ver-tema');
});

app.get('/ver-perfil', verificarSesion, (req, res) => {
    res.render('ver-perfil');
});

app.get('/recomendaciones', verificarSesion, async (req, res) => {
    try {
        const r = await db.query('SELECT nombre FROM usuarios WHERE id = $1', [req.session.usuarioId]);
        const nombre = r.rows[0]?.nombre || '';
        res.render('recomendaciones', { nombreUsuario: nombre });
    } catch {
        res.render('recomendaciones', { nombreUsuario: '' });
    }
});
app.get('/ser-rol', verificarSesion, (req, res) => res.render('ser-rol'));
app.get('/comunidad', (req, res) => res.render('comunidad'));
app.get('/historias', (req, res) => res.render('historias'));
app.get('/juegos', verificarSesion, (req, res) => res.render('juegos'));
app.get('/mapa', verificarSesion, (req, res) => res.render('mapa'));
app.get('/prueba-qr', (req, res) => res.render('prueba-qr'));
app.get('/play-game', verificarSesion, (req, res) => res.render('play-game'));
app.get('/ranking-game', verificarSesion, (req, res) => res.render('ranking-game'));
app.get('/barra_navegacion', (req, res) => res.render('barra_navegacion'));
app.get('/registro', (req, res) => res.render('Registro'));
app.get('/login', (req, res) => res.render('login'));
app.get('/rachas', verificarSesion, (req, res) => res.render('rachas'));
app.get('/ajustes-perfil', verificarSesion, (req, res) => res.render('ajustes-perfil'));
app.get('/select-avatar', verificarSesion, (req, res) => res.render('select-avatar'));
app.get('/recuperar-contrasena', (req, res) => res.render('recuperar-contrasena'));
app.get('/restablecer-contrasena', (req, res) => res.render('restablecer-contrasena'));
app.get('/', (req, res) => res.render('login'));

// --- Panel de control 0505 (read-only, admin/Wind2.0) ---
function verificar0505(req, res, next) {
    if (req.session && req.session.admin0505) return next();
    res.status(401).json({ mensaje: 'No autorizado.' });
}

app.get('/0505', (req, res) => {
    if (req.session && req.session.admin0505) {
        return res.render('control');
    }
    res.render('control');
});

app.post('/0505/auth', (req, res) => {
    const { usuario, contrasena } = req.body;
    if (usuario === 'admin' && contrasena === 'Wind2.0') {
        req.session.admin0505 = true;
        return res.json({ mensaje: 'ok' });
    }
    res.status(401).json({ mensaje: 'Credenciales incorrectas.' });
});

app.post('/0505/logout', (req, res) => {
    delete req.session.admin0505;
    res.json({ mensaje: 'ok' });
});

app.get('/0505/api/usuarios', verificar0505, async (req, res) => {
    try {
        const r = await db.query('SELECT id, nombre, username, correo, rol, puntos, cuenta_activa FROM usuarios ORDER BY id ASC');
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

app.get('/0505/api/categorias', verificar0505, async (req, res) => {
    try {
        const r = await db.query(`
            SELECT c.id, c.nombre,
              (SELECT COUNT(*) FROM temas WHERE categoria_id = c.id) AS conteo_temas,
              (SELECT COUNT(*) FROM juegos WHERE categoria_id = c.id) AS conteo_juegos
            FROM categorias c ORDER BY c.nombre ASC`);
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

app.get('/0505/api/juegos', verificar0505, async (req, res) => {
    try {
        const r = await db.query(`
            SELECT j.id, j.titulo, j.pregunta, j.tipo, j.puntos_recompensa, c.nombre AS categoria_nombre
            FROM juegos j LEFT JOIN categorias c ON j.categoria_id = c.id
            ORDER BY j.id DESC LIMIT 100`);
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

app.get('/0505/api/temas', verificar0505, async (req, res) => {
    try {
        const r = await db.query(`
            SELECT t.id, t.titulo, t.likes, t.estado, c.nombre AS categoria_nombre,
                   u.nombre AS creador_nombre, u.username AS creador_username
            FROM temas t
            LEFT JOIN categorias c ON t.categoria_id = c.id
            LEFT JOIN usuarios u ON t.creador_id = u.id
            ORDER BY t.id DESC LIMIT 50`);
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

app.get('/0505/api/temas/recientes', verificar0505, async (req, res) => {
    try {
        const r = await db.query(`
            SELECT t.id, t.titulo, t.likes, t.estado, t.fecha_publicacion,
                   c.nombre AS categoria_nombre,
                   u.nombre AS creador_nombre, u.username AS creador_username
            FROM temas t
            LEFT JOIN categorias c ON t.categoria_id = c.id
            LEFT JOIN usuarios u ON t.creador_id = u.id
            ORDER BY t.fecha_publicacion DESC
            LIMIT 50`);
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

app.get('/0505/api/relatos', verificar0505, async (req, res) => {
    try {
        const r = await db.query(`
            SELECT r.id, r.titulo, r.fecha_publicacion, u.nombre AS autor_nombre, u.username AS autor_username
            FROM relatos_community r LEFT JOIN usuarios u ON r.usuario_id = u.id
            ORDER BY r.id DESC LIMIT 100`);
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

app.get('/0505/api/modulos', verificar0505, async (req, res) => {
    try {
        const r = await db.query(`
            SELECT m.id, m.nombre, m.descripcion, u.nombre AS creador_nombre
            FROM modulo_juegos m LEFT JOIN usuarios u ON m.id_usuario = u.id
            ORDER BY m.id DESC`);
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

// --- Solicitudes de Especialista ---
app.get('/0505/api/solicitudes', verificar0505, async (req, res) => {
    try {
        const r = await db.query(`
            SELECT s.*, u.imagen_perfil AS usuario_avatar
            FROM solicitudes_especialista s
            LEFT JOIN usuarios u ON s.usuario_id = u.id
            ORDER BY s.fecha_creacion DESC LIMIT 100`);
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

app.put('/0505/api/solicitudes/:id/aprobar', verificar0505, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const sol = await db.query('SELECT usuario_id FROM solicitudes_especialista WHERE id = $1 AND estado = $2', [id, 'pendiente']);
        if (sol.rows.length === 0) return res.status(404).json({ mensaje: 'Solicitud no encontrada o ya procesada.' });
        await db.query('UPDATE usuarios SET rol = $1 WHERE id = $2', ['Especialista', sol.rows[0].usuario_id]);
        await db.query('UPDATE solicitudes_especialista SET estado = $1 WHERE id = $2', ['aprobada', id]);
        res.json({ mensaje: 'Solicitud aprobada. Usuario ahora es Especialista.' });
    } catch (e) { res.status(500).json({ mensaje: 'Error al aprobar.' }); }
});

app.put('/0505/api/solicitudes/:id/rechazar', verificar0505, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await db.query('UPDATE solicitudes_especialista SET estado = $1 WHERE id = $2', ['rechazada', id]);
        res.json({ mensaje: 'Solicitud rechazada.' });
    } catch (e) { res.status(500).json({ mensaje: 'Error al rechazar.' }); }
});

app.get('/0505/api/feedback', verificar0505, async (req, res) => {
    try {
        const r = await db.query(`
            SELECT f.id, f.mensaje, f.pagina, f.fecha_creacion, u.nombre AS usuario_nombre, u.username AS usuario_username
            FROM feedback f LEFT JOIN usuarios u ON f.usuario_id = u.id
            ORDER BY f.id DESC`);
        res.json(r.rows);
    } catch (e) { res.status(500).json([]); }
});

app.get('/0505/api/denuncias', verificar0505, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT d.id, d.motivo, d.fecha_creacion, d.estado,
                   d.tema_id, t.titulo AS tema_titulo,
                   u.username AS denunciante
            FROM denuncias d
            JOIN temas t ON d.tema_id = t.id
            JOIN usuarios u ON d.usuario_id = u.id
            ORDER BY d.fecha_creacion DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al listar denuncias:', error.message);
        res.status(500).json({ mensaje: 'Error al listar denuncias.' });
    }
});

app.post('/0505/api/denuncias/:id/resolver', verificar0505, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE denuncias SET estado = $1 WHERE id = $2', ['revisado', id]);
        res.json({ mensaje: 'Denuncia marcada como revisada.' });
    } catch (error) {
        console.error('Error al resolver denuncia:', error.message);
        res.status(500).json({ mensaje: 'Error al resolver denuncia.' });
    }
});

// --- Acciones CRUD 0505 ---

// Usuarios
app.put('/0505/api/usuarios/:id', verificar0505, async (req, res) => {
    try {
        const { nombre, username, rol } = req.body;
        const id = parseInt(req.params.id, 10);
        await db.query(
            'UPDATE usuarios SET nombre = COALESCE($1, nombre), username = COALESCE($2, username), rol = COALESCE($3, rol) WHERE id = $4',
            [nombre || null, username || null, rol || null, id]
        );
        res.json({ mensaje: 'Usuario actualizado.' });
    } catch (e) { res.status(500).json({ mensaje: 'Error al actualizar.' }); }
});

app.delete('/0505/api/usuarios/:id', verificar0505, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await db.query('DELETE FROM notificaciones WHERE usuario_id = $1', [id]);
        await db.query('DELETE FROM historial_vistas WHERE usuario_id = $1', [id]);
        await db.query('DELETE FROM progreso_modulo WHERE usuario_id = $1', [id]);
        await db.query('DELETE FROM comentarios WHERE usuario_id = $1', [id]);
        await db.query('DELETE FROM relatos WHERE usuario_id = $1', [id]);
        await db.query('DELETE FROM temas WHERE usuario_id = $1', [id]);
        await db.query('DELETE FROM juegos WHERE usuario_id = $1', [id]);
        await db.query('DELETE FROM feedback WHERE usuario_id = $1', [id]);
        await db.query('DELETE FROM usuarios WHERE id = $1', [id]);
        res.json({ mensaje: 'Usuario eliminado.' });
    } catch (e) { res.status(500).json({ mensaje: 'Error al eliminar.' }); }
});

app.post('/0505/api/usuarios/:id/advertir', verificar0505, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { titulo, mensaje } = req.body;
        if (!titulo || !mensaje) return res.status(400).json({ mensaje: 'Faltan campos.' });
        const r = await db.query('SELECT id FROM usuarios WHERE id = $1', [id]);
        if (r.rows.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        const notificacion = require('./controllers/notificacionController');
        await notificacion.crearParaUsuario({
            usuarioId: id, titulo, mensaje, enlace: '/0505'
        });
        res.json({ mensaje: 'Advertencia enviada.' });
    } catch (e) { res.status(500).json({ mensaje: 'Error al enviar.' }); }
});

// Categorias
app.post('/0505/api/categorias', verificar0505, async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre || !nombre.trim()) return res.status(400).json({ mensaje: 'Nombre requerido.' });
        const r = await db.query('INSERT INTO categorias (nombre) VALUES ($1) RETURNING id, nombre', [nombre.trim()]);
        res.status(201).json(r.rows[0]);
    } catch (e) { res.status(500).json({ mensaje: 'Error al crear.' }); }
});

app.put('/0505/api/categorias/:id', verificar0505, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { nombre } = req.body;
        await db.query('UPDATE categorias SET nombre = $1 WHERE id = $2', [nombre, id]);
        res.json({ mensaje: 'Categoría actualizada.' });
    } catch (e) { res.status(500).json({ mensaje: 'Error al actualizar.' }); }
});

app.delete('/0505/api/categorias/:id', verificar0505, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await db.query('UPDATE temas SET categoria_id = NULL WHERE categoria_id = $1', [id]);
        await db.query('UPDATE juegos SET categoria_id = NULL WHERE categoria_id = $1', [id]);
        await db.query('DELETE FROM categorias WHERE id = $1', [id]);
        res.json({ mensaje: 'Categoría eliminada.' });
    } catch (e) { res.status(500).json({ mensaje: 'Error al eliminar.' }); }
});

// Temas
app.delete('/0505/api/temas/:id', verificar0505, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await db.query('DELETE FROM historial_vistas WHERE contenido_id = $1 AND tipo_contenido = $2', [id, 'tema']);
        await db.query('DELETE FROM comentarios WHERE tema_id = $1', [id]);
        await db.query('DELETE FROM temas WHERE id = $1', [id]);
        res.json({ mensaje: 'Tema eliminado.' });
    } catch (e) { res.status(500).json({ mensaje: 'Error al eliminar.' }); }
});

app.post('/0505/api/temas/:id/aprobar', verificar0505, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const r = await db.query('UPDATE temas SET estado = $1 WHERE id = $2 RETURNING titulo, creador_id', ['aprobado', id]);
        if (r.rowCount === 0) return res.status(404).json({ mensaje: 'Tema no encontrado.' });
        const { titulo, creador_id } = r.rows[0];
        await db.query(
            `INSERT INTO notificaciones (usuario_id, titulo, mensaje, enlace) VALUES ($1, $2, $3, $4)`,
            [creador_id, 'Tema aprobado', `Tu tema "${titulo}" ha sido aprobado y ya está visible.`, `/ver-tema?id=${id}`]
        );
        res.json({ mensaje: 'Tema aprobado.' });
    } catch (e) { res.status(500).json({ mensaje: 'Error al aprobar.' }); }
});

app.post('/0505/api/temas/:id/rechazar', verificar0505, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const r = await db.query('UPDATE temas SET estado = $1 WHERE id = $2 RETURNING titulo, creador_id', ['rechazado', id]);
        if (r.rowCount === 0) return res.status(404).json({ mensaje: 'Tema no encontrado.' });
        const { titulo, creador_id } = r.rows[0];
        await db.query(
            `INSERT INTO notificaciones (usuario_id, titulo, mensaje, enlace) VALUES ($1, $2, $3, $4)`,
            [creador_id, 'Tema no aprobado', `Tu tema "${titulo}" no ha sido aprobado. Revisa el contenido e inténtalo de nuevo.`, `/dashboard`]
        );
        res.json({ mensaje: 'Tema rechazado.' });
    } catch (e) { res.status(500).json({ mensaje: 'Error al rechazar.' }); }
});

// Juegos
app.delete('/0505/api/juegos/:id', verificar0505, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await db.query('UPDATE nivel SET id_juego = NULL WHERE id_juego = $1', [id]);
        await db.query('DELETE FROM historial_vistas WHERE contenido_id = $1 AND tipo_contenido = $2', [id, 'juego']);
        await db.query('DELETE FROM juegos WHERE id = $1', [id]);
        res.json({ mensaje: 'Juego eliminado.' });
    } catch (e) { res.status(500).json({ mensaje: 'Error al eliminar.' }); }
});

// Relatos
app.delete('/0505/api/relatos/:id', verificar0505, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await db.query('DELETE FROM relatos_community WHERE id = $1', [id]);
        res.json({ mensaje: 'Relato eliminado.' });
    } catch (e) { res.status(500).json({ mensaje: 'Error al eliminar.' }); }
});

// Feedback
app.delete('/0505/api/feedback/:id', verificar0505, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        await db.query('DELETE FROM feedback WHERE id = $1', [id]);
        res.json({ mensaje: 'Feedback eliminado.' });
    } catch (e) { res.status(500).json({ mensaje: 'Error al eliminar.' }); }
});

app.get('/ping', async (req, res) => {
    try {
        const supabase = require('./config/supabase');
        await supabase.storage.listBuckets();
        res.status(200).send('OK');
    } catch (err) {
        res.status(500).send('ERROR');
    }
});

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
        await db.query(`
            CREATE TABLE IF NOT EXISTS rachas (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
                racha_actual INTEGER NOT NULL DEFAULT 0,
                racha_maxima INTEGER NOT NULL DEFAULT 0,
                ultimo_activo DATE,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('Tabla rachas lista.');
    } catch (err) {
        console.error('Error creando tabla rachas:', err.message);
    }

    try {
        await db.query(`ALTER TABLE rachas ADD COLUMN IF NOT EXISTS racha_creacion_actual INTEGER DEFAULT 0`);
        await db.query(`ALTER TABLE rachas ADD COLUMN IF NOT EXISTS racha_creacion_maxima INTEGER DEFAULT 0`);
        await db.query(`ALTER TABLE rachas ADD COLUMN IF NOT EXISTS ultimo_creacion DATE`);
        console.log('Columnas de racha de creación listas.');
    } catch (err) {
        console.error('Error agregando columnas de creación:', err.message);
    }

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS denuncias (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                tema_id INTEGER NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
                motivo VARCHAR(50) NOT NULL,
                fecha_creacion TIMESTAMP DEFAULT NOW(),
                estado VARCHAR(20) DEFAULT 'pendiente'
            )
        `);
        console.log('Tabla denuncias lista.');
    } catch (err) {
        console.error('Error creando tabla denuncias:', err.message);
    }

    try {
        await db.query(`ALTER TABLE temas ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'aprobado'`);
        console.log('Columna estado en temas lista.');
    } catch (err) {
        console.error('Error agregando columna estado a temas:', err.message);
    }

    try {
        await db.query(`ALTER TABLE temas ADD COLUMN IF NOT EXISTS latitud DECIMAL(10,7)`);
        await db.query(`ALTER TABLE temas ADD COLUMN IF NOT EXISTS longitud DECIMAL(10,7)`);
        console.log('Columnas latitud/longitud en temas listas.');
    } catch (err) {
        console.error('Error agregando columnas latitud/longitud:', err.message);
    }

    try {
        await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64)`);
        await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token_expiracion TIMESTAMP`);
        console.log('Columnas reset_token listas.');
    } catch (err) {
        console.error('Error agregando columnas reset_token:', err.message);
    }

    try {
        await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS session_token VARCHAR(64)`);
        console.log('Columna session_token lista.');
    } catch (err) {
        console.error('Error agregando session_token:', err.message);
    }

    try {
        await db.query(`ALTER TABLE usuarios ALTER COLUMN imagen_perfil TYPE TEXT USING imagen_perfil::TEXT`);
        console.log('Columna imagen_perfil migrada a TEXT.');
    } catch (err) {
        if (err.code !== '42703') {
            console.error('Error migrando imagen_perfil:', err.message);
        }
    }

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS solicitudes_especialista (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                nombre VARCHAR(255) NOT NULL,
                username VARCHAR(255) NOT NULL,
                correo VARCHAR(255) NOT NULL,
                mensaje TEXT DEFAULT '',
                foto_url TEXT DEFAULT '',
                estado VARCHAR(20) DEFAULT 'pendiente',
                fecha_creacion TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('Tabla solicitudes_especialista lista.');
    } catch (err) {
        console.error('Error creando tabla solicitudes_especialista:', err.message);
    }

    try {
        await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar_fondo VARCHAR(7) DEFAULT '#e8e8e8'`);
        console.log('Columna avatar_fondo lista.');
    } catch (err) {
        console.error('Error agregando avatar_fondo:', err.message);
    }

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS feedback (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                mensaje TEXT NOT NULL,
                pagina VARCHAR(500) DEFAULT '',
                leido BOOLEAN DEFAULT false,
                fecha_creacion TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('Tabla feedback lista.');
    } catch (err) {
        console.error('Error creando tabla feedback:', err.message);
    }

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS seguidores (
                id SERIAL PRIMARY KEY,
                seguidor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                siguiendo_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                fecha_seguido TIMESTAMP DEFAULT NOW(),
                UNIQUE(seguidor_id, siguiendo_id)
            )
        `);
        console.log('Tabla seguidores lista.');
    } catch (err) {
        console.error('Error creando tabla seguidores:', err.message);
    }

    try {
        await db.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reputacion INTEGER DEFAULT 0');
        console.log('Columna reputacion lista.');
    } catch (err) {
        console.error('Error agregando reputacion:', err.message);
    }

    try {
        await db.query('ALTER TABLE relatos_community ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0');
        console.log('Columna likes en relatos_community lista.');
    } catch (err) {
        console.error('Error agregando likes a relatos_community:', err.message);
    }

    try {
        await db.query('ALTER TABLE juegos ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0');
        console.log('Columna likes en juegos lista.');
    } catch (err) {
        console.error('Error agregando likes a juegos:', err.message);
    }

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS relatos_likes (
                id SERIAL PRIMARY KEY,
                relato_id INTEGER NOT NULL REFERENCES relatos_community(id) ON DELETE CASCADE,
                usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                puntuacion INTEGER CHECK (puntuacion >= 1 AND puntuacion <= 5),
                UNIQUE(relato_id, usuario_id)
            )
        `);
        console.log('Tabla relatos_likes lista.');
    } catch (err) {
        console.error('Error creando tabla relatos_likes:', err.message);
    }

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS juegos_likes (
                id SERIAL PRIMARY KEY,
                juego_id INTEGER NOT NULL REFERENCES juegos(id) ON DELETE CASCADE,
                usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                puntuacion INTEGER CHECK (puntuacion >= 1 AND puntuacion <= 5),
                UNIQUE(juego_id, usuario_id)
            )
        `);
        console.log('Tabla juegos_likes lista.');
    } catch (err) {
        console.error('Error creando tabla juegos_likes:', err.message);
    }

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS temas_likes (
                id SERIAL PRIMARY KEY,
                tema_id INTEGER NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
                usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                puntuacion INTEGER CHECK (puntuacion >= 1 AND puntuacion <= 5),
                UNIQUE(tema_id, usuario_id)
            )
        `);
        console.log('Tabla temas_likes lista.');
    } catch (err) {
        console.error('Error creando tabla temas_likes:', err.message);
    }

    // agregar columna puntuacion por si las tablas ya existen sin ella
    for (const tbl of ['temas_likes', 'relatos_likes', 'juegos_likes']) {
        try {
            await db.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS puntuacion INTEGER CHECK (puntuacion >= 1 AND puntuacion <= 5)`);
        } catch (_) {}
    }

    // tabla modulos_likes para valoración de módulos
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS modulos_likes (
                id SERIAL PRIMARY KEY,
                modulo_id INTEGER NOT NULL REFERENCES modulo_juegos(id) ON DELETE CASCADE,
                usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                puntuacion INTEGER CHECK (puntuacion >= 1 AND puntuacion <= 5),
                UNIQUE(modulo_id, usuario_id)
            )
        `);
        console.log('Tabla modulos_likes lista.');
    } catch (err) {
        console.error('Error creando tabla modulos_likes:', err.message);
    }

    // columna likes en modulo_juegos
    try {
        await db.query(`ALTER TABLE modulo_juegos ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0`);
        console.log('Columna likes agregada a modulo_juegos.');
    } catch (err) {
        console.error('Error agregando columna likes:', err.message);
    }

    // Crear índices para rendimiento
    const indices = [
        'CREATE INDEX IF NOT EXISTS idx_historial_usuario_tipo ON historial_vistas(usuario_id, tipo_contenido, fecha_vista DESC)',
        'CREATE INDEX IF NOT EXISTS idx_temas_categoria ON temas(categoria_id)',
        'CREATE INDEX IF NOT EXISTS idx_temas_creador_fecha ON temas(creador_id, fecha_publicacion DESC)',
        'CREATE INDEX IF NOT EXISTS idx_juegos_categoria ON juegos(categoria_id)',
        'CREATE INDEX IF NOT EXISTS idx_relatos_usuario_fecha ON relatos_community(usuario_id, fecha_publicacion DESC)',
        'CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_leida ON notificaciones(usuario_id, leida)',
        'CREATE INDEX IF NOT EXISTS idx_usuarios_puntos ON usuarios(puntos DESC)',
        'CREATE INDEX IF NOT EXISTS idx_nivel_modulo ON nivel(id_modulo)',
        'CREATE INDEX IF NOT EXISTS idx_nivel_juego ON nivel(id_juego)',
        'CREATE INDEX IF NOT EXISTS idx_modulos_usuario ON modulo_juegos(id_usuario)'
    ];
    for (const sql of indices) {
        try {
            await db.query(sql);
        } catch (err) {
            console.warn('Índice no creado (posiblemente no existe la tabla aún):', err.message);
        }
    }
    console.log('Índices verificados/creados.');

    try {
        const recomendador = require('./utils/recomendador');
        await recomendador.entrenar();
        console.log('Recomendador entrenado al iniciar.');
    } catch (err) {
        console.error('Error entrenando recomendador al iniciar:', err.message);
    }
});