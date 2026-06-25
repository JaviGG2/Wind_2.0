//ok segun todo lo que tenemos me vas a explicar poco a poco como distrubir el app.js: const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const db = require('./config/db');
const nunjucks = require('nunjucks');
require('dotenv').config();

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
        maxAge: 1000 * 60 * 60 * 2
    }
}));

app.use(express.static('views'));

app.use(express.static('public'));


app.post('/auth/registro', async (req, res) => {
    const { nombre, username, correo, contrasena } = req.body;

    if (!nombre || !username || !correo || !contrasena) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    if (contrasena.length < 6) {
        return res.status(400).json({ mensaje: 'La contraseña debe tener mínimo 6 caracteres.' });
    }

    try {
        const contrasenaEncriptada = await bcrypt.hash(contrasena, 10);

        const consultaSQL = `
            INSERT INTO usuarios (nombre, username, correo, contrasena, rol)
            VALUES ($1, $2, $3, $4, $5)
        `;
        const valores = [nombre, username, correo, contrasenaEncriptada, 'Natural'];

        await db.query(consultaSQL, valores);

        return res.status(201).json({ mensaje: '¡Usuario registrado con éxito en el sistema!' });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado.' });
        }

        console.error('Error en el servidor al insertar usuario:', error);
        return res.status(500).json({ mensaje: 'Error interno de la aplicación. Inténtelo más tarde.' });
    }
});


app.post('/auth/login', async (req, res) => {
    const { correo, username, contrasena } = req.body;
    const identificador = correo || username;

    if (!identificador || !contrasena) {
        return res.status(400).json({ mensaje: 'El correo/usuario y la contraseña son obligatorios.' });
    }

    try {
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

app.get('/auth/perfil', (req, res) => {
    if (!req.session.usuario && !req.session.usuarioId) {
        return res.status(401).json({ mensaje: 'No autorizado. Inicie sesión.' });
    }
    res.json({
        id: req.session.usuario?.id || req.session.usuarioId,
        nombre: req.session.usuario?.nombre || req.session.nombre,
        rol: req.session.usuario?.rol || req.session.rol
    });
});

app.post('/auth/ascender', async (req, res) => {
    if (!req.session.usuarioId) {
        return res.status(401).json({ mensaje: 'Debes iniciar sesión para realizar esta acción.' });
    }

    const { respuestaExamen } = req.body;

    if (respuestaExamen !== 'correcto') {
        return res.status(400).json({ mensaje: 'Evaluación reprobada. Revisa tus conocimientos históricos sobre Coro e inténtalo de nuevo.' });
    }

    try {
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

app.post('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ mensaje: 'No se pudo cerrar la sesión.' });
        res.clearCookie('connect.sid');
        res.json({ mensaje: 'Sesión destruida con éxito.' });
    });
});

app.get('/crear-juego', (req, res) => {
    if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
        return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, 'views', 'crear-juego.html'));
});



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
	console.error('ERROR REAL DE POSTGRES:', error.message);
        
        return res.status(500).json({ mensaje: 'Error interno al guardar la trivia.' });
    }
});

app.get('/admin/mis-juegos', async (req, res) => {
    if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
        return res.status(403).json({ mensaje: 'Acceso denegado.' });
    }

    try {
        const queryTexto = `
            SELECT j.id, j.pregunta, j.opcion_a, j.opcion_b, j.opcion_c, j.opcion_correcta, j.puntos_recompensa, c.nombre AS categoria_nombre
            FROM juegos j
            LEFT JOIN categorias c ON j.categoria_id = c.id
            ORDER BY j.id DESC
        `;
        
        const resultado = await db.query(queryTexto);
        return res.json(resultado.rows);
    } catch (error) {
	console.error('Error en el historial del dashboard:', error.message);
        return res.status(500).json({ mensaje: 'Error al cargar el historial de trivias.' });
    }
});

app.get('/subir-tema.html', (req, res) => {
    if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
        return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, 'views', 'subir-tema.html'));
});

const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

app.post('/admin/subir-tema', (req, res) => {
    upload.single('imagen_portada')(req, res, async function (err) {
        if (err) {
			console.error('Error de Multer:', err.message);
            return res.status(400).json({ mensaje: 'Error al procesar la imagen de portada.' });
        }

        if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
            return res.status(403).json({ mensaje: 'Acceso denegado.' });
        }

        const { categoria_id, titulo, contenido } = req.body;
        const rutaImagen = req.file ? `uploads/${req.file.filename}` : 'uploads/defecto.jpg';

        try {
            const columnasInfo = await db.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'temas';
            `);
            
            const listaColumnas = columnasInfo.rows.map(c => c.column_name.toLowerCase());
			console.log('Columnas reales encontradas en Neon:', listaColumnas);

            const colCategoria = listaColumnas.includes('categoria_id') ? 'categoria_id' : 'id_categoria';
            const colCreador = listaColumnas.includes('creador_id') ? 'creador_id' : (listaColumnas.includes('usuario_id') ? 'usuario_id' : 'id_usuario');
            const colImagen = listaColumnas.includes('imagen_portada') ? 'imagen_portada' : (listaColumnas.includes('imagen') ? 'imagen' : 'portada');
            const colFecha = listaColumnas.includes('fecha_publicacion') ? 'fecha_publicacion' : (listaColumnas.includes('fecha') ? 'fecha' : null);

            if (!listaColumnas.includes('titulo') || !listaColumnas.includes('contenido')) {
                return res.status(500).json({ mensaje: 'Las columnas básicas (titulo o contenido) no existen en la tabla temas.' });
            }

            let campos = `titulo, contenido, ${colCategoria}, ${colCreador}`;
            let valoresAsignados = `$1, $2, $3, $4`;
            let parametros = [titulo, contenido, parseInt(categoria_id), req.session.usuarioId];

            if (listaColumnas.includes(colImagen)) {
                campos += `, ${colImagen}`;
                valoresAsignados += `, $5`;
                parametros.push(rutaImagen);
            }

            if (colFecha) {
                campos += `, ${colFecha}`;
                valoresAsignados += `, NOW()`;
            }

            const queryFinal = `INSERT INTO temas (${campos}) VALUES (${valoresAsignados})`;
            
            await db.query(queryFinal, parametros);
            return res.status(201).json({ mensaje: '¡Tema histórico publicado con éxito!' });

        } catch (error) {
            // Revisa tu consola de VS Code, aquí saldrá la verdad absoluta de Neon
			console.error('ERROR CRÍTICO EN NEON:', error.message);
            return res.status(500).json({ mensaje: 'Error interno en el servidor al guardar el tema.' });
        }
    });
});

app.get('/barra_navegacion', (req, res) => {
res.render('barra_navegacion');
});

app.get('/relatos', (req, res) => {
res.render('relatos');
});

app.get('/comunidad', (req, res) => {
res.render('comunidad');
});

app.get('/historias', (req, res) => {
res.render('historias');
});

app.get('/juegos', (req, res) => {
res.render('juegos');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`El servidor de Wind se encuentra activo.`);
    console.log(`Registro: http://localhost:${PORT}/registro.html`);
    console.log(`Login: http://localhost:${PORT}/login.html`);
});