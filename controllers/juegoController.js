// controllers/juegoController.js
const db = require('../config/db');

// 1. Insertar Nueva Trivia
exports.crearJuego = async (req, res) => {
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
                categoriaValida, pregunta, opcion_a, opcion_b, opcion_c, opcion_correcta,
                parseInt(puntos_recompensa, 10) || 10
            ];
        } else {
            queryTexto = `
                INSERT INTO juegos (pregunta, opcion_a, opcion_b, opcion_c, opcion_correcta, puntos_recompensa)
                VALUES ($1, $2, $3, $4, $5, $6)
            `;
            valores = [
                pregunta, opcion_a, opcion_b, opcion_c, opcion_correcta,
                parseInt(puntos_recompensa, 10) || 10
            ];
        }

        await db.query(queryTexto, valores);
        return res.status(201).json({ mensaje: '¡Nueva trivia patrimonial publicada con éxito!' });

    } catch (error) {
        console.error('ERROR REAL DE POSTGRES:', error.message);
        return res.status(500).json({ mensaje: 'Error interno al guardar la trivia.' });
    }
};

// 2. Historial de juegos del Especialista
exports.misJuegos = async (req, res) => {
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
};

// 3. Listar juegos publicados (público)
exports.listarPublicos = async (req, res) => {
    try {
        const categoriaId = req.query.categoria ? parseInt(req.query.categoria, 10) : null;
        let queryTexto;
        let params = [];

        if (categoriaId && !Number.isNaN(categoriaId)) {
            queryTexto = `
                SELECT j.id, j.pregunta, j.opcion_a, j.opcion_b, j.opcion_c, j.opcion_correcta, j.categoria_id, j.puntos_recompensa, c.nombre AS categoria_nombre
                FROM juegos j
                LEFT JOIN categorias c ON j.categoria_id = c.id
                WHERE j.categoria_id = $1
                ORDER BY j.id DESC
                LIMIT 100
            `;
            params = [categoriaId];
        } else {
            queryTexto = `
                SELECT j.id, j.pregunta, j.opcion_a, j.opcion_b, j.opcion_c, j.opcion_correcta, j.categoria_id, j.puntos_recompensa, c.nombre AS categoria_nombre
                FROM juegos j
                LEFT JOIN categorias c ON j.categoria_id = c.id
                ORDER BY j.id DESC
                LIMIT 100
            `;
        }
        const resultado = await db.query(queryTexto, params);
        return res.json(resultado.rows);
    } catch (error) {
        console.error('Error al listar juegos públicos:', error.message);
        return res.status(500).json({ mensaje: 'Error al cargar juegos publicados.' });
    }
};

// 4. Eliminar juego (sólo Especialista)
exports.eliminarJuego = async (req, res) => {
    if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
        return res.status(403).json({ mensaje: 'Acceso denegado.' });
    }

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ mensaje: 'Id inválido.' });

    try {
        await db.query('DELETE FROM juegos WHERE id = $1', [id]);
        return res.json({ mensaje: 'Juego eliminado.' });
    } catch (error) {
        console.error('Error al eliminar juego:', error.message);
        return res.status(500).json({ mensaje: 'Error al eliminar el juego.' });
    }
};

// 5. Responder trivia y guardar puntos
exports.responderJuego = async (req, res) => {
    if (!req.session.usuarioId) {
        return res.status(401).json({ mensaje: 'Debes iniciar sesión para jugar.' });
    }

    const { juego_id, respuesta_usuario } = req.body;

    if (!juego_id || !respuesta_usuario) {
        return res.status(400).json({ mensaje: 'Faltan datos de la respuesta.' });
    }

    try {
        const juegoRes = await db.query('SELECT * FROM juegos WHERE id = $1', [juego_id]);
        if (juegoRes.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Juego no encontrado.' });
        }

        const juego = juegoRes.rows[0];

        const respuestaUpper = String(respuesta_usuario).trim().toUpperCase();
        const correctaRaw = String(juego.opcion_correcta).trim();
        const correctaUpper = correctaRaw.toUpperCase();

        const letraCorrecta = ['A', 'B', 'C'].includes(correctaUpper) ? correctaUpper : null;

        const resolverLetra = (texto) => {
            const t = texto.toUpperCase();
            if (t === (juego.opcion_a || '').trim().toUpperCase()) return 'A';
            if (t === (juego.opcion_b || '').trim().toUpperCase()) return 'B';
            if (t === (juego.opcion_c || '').trim().toUpperCase()) return 'C';
            return null;
        };

        const targetUpper = letraCorrecta || resolverLetra(correctaRaw) || '';
        const esCorrecta = ['A', 'B', 'C'].includes(respuestaUpper) && respuestaUpper === targetUpper;

        if (!esCorrecta) {
            return res.json({
                correcto: false,
                puntos_ganados: 0,
                mensaje: 'Respuesta incorrecta. ¡Sigue intentando!'
            });
        }

        const puntos = Number(juego.puntos_recompensa) || 10;
        if (!Number.isFinite(puntos)) {
            return res.json({
                correcto: false,
                puntos_ganados: 0,
                mensaje: 'Puntos inválidos en la trivia.'
            });
        }

        await db.query('UPDATE usuarios SET puntos = puntos + $1 WHERE id = $2', [puntos, req.session.usuarioId]);

        return res.json({
            correcto: true,
            puntos_ganados: puntos,
            mensaje: `¡Correcto! Has ganado ${puntos} pts.`
        });
    } catch (error) {
        console.error('Error al procesar la trivia:', error.message);
        return res.status(500).json({ mensaje: 'Error al procesar el juego.' });
    }
};