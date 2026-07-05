const db = require('../config/db');
const notificacion = require('./notificacionController');

exports.crearJuego = async (req, res) => {
    if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
        return res.status(403).json({ mensaje: 'Acceso denegado: Rol insuficiente.' });
    }

    const { categoria_id, titulo, pregunta, opcion_a, opcion_b, opcion_c, opcion_correcta, puntos_recompensa, tipo } = req.body;
    const categoriaValida = categoria_id ? parseInt(categoria_id, 10) : null;
    const tipoJuego = ['Quiz', 'Memory', 'Match', 'Scramblee'].includes(tipo) ? tipo : 'Quiz';

    if (tipoJuego === 'Quiz') {
        if (!pregunta || !opcion_a || !opcion_b || !opcion_c || !opcion_correcta) {
            return res.status(400).json({ mensaje: 'Todos los campos de la trivia son obligatorios.' });
        }
    } else if (!pregunta) {
        return res.status(400).json({ mensaje: 'La pregunta/datos del juego son obligatorios.' });
    }

    try {
        let queryTexto;
        let valores;
        const usuarioId = req.session.usuarioId;

        if (categoriaValida && !Number.isNaN(categoriaValida)) {
            queryTexto = `
                INSERT INTO juegos (categoria_id, titulo, pregunta, opcion_a, opcion_b, opcion_c, opcion_correcta, tipo, puntos_recompensa, usuario_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `;
            valores = [
                categoriaValida, (titulo || '').trim(), pregunta || '', opcion_a || '', opcion_b || '', opcion_c || '', opcion_correcta || 'A', tipoJuego,
                parseInt(puntos_recompensa, 10) || 10,
                usuarioId
            ];
        } else {
            queryTexto = `
                INSERT INTO juegos (titulo, pregunta, opcion_a, opcion_b, opcion_c, opcion_correcta, tipo, puntos_recompensa, usuario_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `;
            valores = [
                (titulo || '').trim(), pregunta || '', opcion_a || '', opcion_b || '', opcion_c || '', opcion_correcta || 'A', tipoJuego,
                parseInt(puntos_recompensa, 10) || 10,
                usuarioId
            ];
        }

        await db.query(queryTexto, valores);
        notificacion.crear({
            creadorId: req.session.usuarioId,
            titulo: 'Nueva trivia patrimonial',
            mensaje: `"${(titulo || pregunta || '').substring(0, 80)}" ha sido agregado.`,
            enlace: `/juegos`
        });
        return res.status(201).json({ mensaje: '¡Nueva trivia patrimonial publicada con éxito!' });

    } catch (error) {
        console.error('ERROR REAL DE POSTGRES:', error.message);
        return res.status(500).json({ mensaje: 'Error interno al guardar la trivia.' });
    }
};

exports.misJuegos = async (req, res) => {
    if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
        return res.status(403).json({ mensaje: 'Acceso denegado.' });
    }

    try {
        const queryTexto = `
            SELECT j.id, j.titulo, j.pregunta, j.opcion_a, j.opcion_b, j.opcion_c, j.opcion_correcta, j.tipo, j.puntos_recompensa, c.nombre AS categoria_nombre
            FROM juegos j
            LEFT JOIN categorias c ON j.categoria_id = c.id
            WHERE j.usuario_id = $1
            ORDER BY j.id DESC
        `;
        const resultado = await db.query(queryTexto, [req.session.usuarioId]);
        return res.json(resultado.rows);
    } catch (error) {
        console.error('Error en el historial del dashboard:', error.message);
        return res.status(500).json({ mensaje: 'Error al cargar el historial de trivias.' });
    }
};

// 3. Obtener un juego por ID (incluye los de módulos)
exports.obtenerJuego = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ mensaje: 'ID inválido.' });

    try {
        const result = await db.query(
            `SELECT j.*, c.nombre AS categoria_nombre
             FROM juegos j
             LEFT JOIN categorias c ON j.categoria_id = c.id
             WHERE j.id = $1`, [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ mensaje: 'Juego no encontrado.' });
        return res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener juego:', error.message);
        return res.status(500).json({ mensaje: 'Error al cargar juego.' });
    }
};

exports.listarPublicos = async (req, res) => {
    try {
        const categoriaId = req.query.categoria ? parseInt(req.query.categoria, 10) : null;
        const filtroUsuario = req.query.usuario_id ? parseInt(req.query.usuario_id, 10) : null;
        const usuarioSesion = req.session?.usuarioId || null;
        let queryTexto;
        let params = [];

        if (filtroUsuario && !Number.isNaN(filtroUsuario)) {
            queryTexto = `
                SELECT j.id, j.titulo, j.pregunta, j.opcion_a, j.opcion_b, j.opcion_c, j.opcion_correcta, j.tipo, j.categoria_id, j.puntos_recompensa, c.nombre AS categoria_nombre, false AS jugado
                FROM juegos j
                LEFT JOIN categorias c ON j.categoria_id = c.id
                WHERE j.usuario_id = $1
                ORDER BY j.id DESC
                LIMIT 100
            `;
            params = [filtroUsuario];
        } else if (categoriaId && !Number.isNaN(categoriaId)) {
            const jugadoJoin = usuarioSesion
                ? `LEFT JOIN historial_vistas hv ON hv.contenido_id = j.id AND hv.tipo_contenido = 'juego' AND hv.usuario_id = $2`
                : '';
            const jugadoSelect = usuarioSesion ? ', CASE WHEN hv.id IS NOT NULL THEN true ELSE false END AS jugado' : ', false AS jugado';
            params = usuarioSesion ? [categoriaId, usuarioSesion] : [categoriaId];
            queryTexto = `
                SELECT j.id, j.titulo, j.pregunta, j.opcion_a, j.opcion_b, j.opcion_c, j.opcion_correcta, j.tipo, j.categoria_id, j.puntos_recompensa, c.nombre AS categoria_nombre${jugadoSelect}
                FROM juegos j
                LEFT JOIN categorias c ON j.categoria_id = c.id
                ${jugadoJoin}
                WHERE j.id NOT IN (SELECT id_juego FROM nivel WHERE id_juego IS NOT NULL) AND j.categoria_id = $1
                ORDER BY j.id DESC
                LIMIT 100
            `;
        } else {
            const jugadoJoin = usuarioSesion
                ? `LEFT JOIN historial_vistas hv ON hv.contenido_id = j.id AND hv.tipo_contenido = 'juego' AND hv.usuario_id = $1`
                : '';
            const jugadoSelect = usuarioSesion ? ', CASE WHEN hv.id IS NOT NULL THEN true ELSE false END AS jugado' : ', false AS jugado';
            params = usuarioSesion ? [usuarioSesion] : [];
            queryTexto = `
                SELECT j.id, j.titulo, j.pregunta, j.opcion_a, j.opcion_b, j.opcion_c, j.opcion_correcta, j.tipo, j.categoria_id, j.puntos_recompensa, c.nombre AS categoria_nombre${jugadoSelect}
                FROM juegos j
                LEFT JOIN categorias c ON j.categoria_id = c.id
                ${jugadoJoin}
                WHERE j.id NOT IN (SELECT id_juego FROM nivel WHERE id_juego IS NOT NULL)
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

exports.rankingGlobal = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, nombre, username, puntos, imagen_perfil, avatar_fondo
             FROM usuarios
             WHERE puntos > 0
             ORDER BY puntos DESC
             LIMIT 100`
        );
        return res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener ranking:', error.message);
        return res.status(500).json({ mensaje: 'Error al cargar ranking.' });
    }
};

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

exports.responderJuego = async (req, res) => {
    if (!req.session.usuarioId) {
        return res.status(401).json({ mensaje: 'Debes iniciar sesión para jugar.' });
    }

    const { juego_id, respuesta_usuario } = req.body;

    if (!juego_id || respuesta_usuario === undefined || respuesta_usuario === null) {
        return res.status(400).json({ mensaje: 'Faltan datos de la respuesta.' });
    }

    try {
        const juegoRes = await db.query('SELECT * FROM juegos WHERE id = $1', [juego_id]);
        if (juegoRes.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Juego no encontrado.' });
        }

        const juego = juegoRes.rows[0];
        const tipo = juego.tipo || 'Quiz';
        let esCorrecta = false;

        console.log(`[responderJuego] usuario=${req.session.usuarioId}, juego_id=${juego_id}, tipo=${tipo}, puntos_recompensa=${juego.puntos_recompensa}`);

        if (tipo === 'Quiz') {
            const respuestaUpper = String(respuesta_usuario).trim().toUpperCase();
            const correctaRaw = String(juego.opcion_correcta || juego.correcta || '').trim().toUpperCase();
            esCorrecta = respuestaUpper === correctaRaw || respuestaUpper === (['A', 'B', 'C'].includes(correctaRaw) ? correctaRaw : '');
        } else if (tipo === 'Memory') {
            esCorrecta = true;
        } else if (tipo === 'Match') {
            esCorrecta = true;
        } else if (tipo === 'Scramblee') {
            const palabraCorrecta = (juego.opcion_a || '').trim().toUpperCase();
            const respuesta = String(respuesta_usuario).trim().toUpperCase();
            esCorrecta = respuesta === palabraCorrecta;
        }

        if (!esCorrecta) {
            return res.json({
                correcto: false,
                puntos_ganados: 0,
                mensaje: 'Respuesta incorrecta. ¡Sigue intentando!'
            });
        }

        const yaCompletado = await db.query(
            'SELECT id FROM historial_vistas WHERE usuario_id = $1 AND tipo_contenido = $2 AND contenido_id = $3',
            [req.session.usuarioId, 'juego', juego_id]
        );

        if (yaCompletado.rows.length > 0) {
            console.log(`[responderJuego] YA COMPLETADO: usuario=${req.session.usuarioId}, juego=${juego_id}`);
            return res.json({
                correcto: true,
                puntos_ganados: 0,
                mensaje: 'Ya completaste este juego anteriormente.'
            });
        }

        const puntos = Number(juego.puntos_recompensa) || 10;
        console.log(`[responderJuego] puntos_a_añadir=${puntos}, isFinite=${Number.isFinite(puntos)}`);
        if (!Number.isFinite(puntos)) {
            return res.json({
                correcto: false,
                puntos_ganados: 0,
                mensaje: 'Puntos inválidos en el juego.'
            });
        }

        await db.query('UPDATE usuarios SET puntos = COALESCE(puntos,0) + $1 WHERE id = $2', [puntos, req.session.usuarioId]);
        console.log(`[responderJuego] PUNTOS ACTUALIZADOS en BD: +${puntos} para usuario ${req.session.usuarioId}`);

        await db.query(
            'INSERT INTO historial_vistas (usuario_id, tipo_contenido, contenido_id) VALUES ($1, $2, $3)',
            [req.session.usuarioId, 'juego', juego_id]
        ).catch(() => {});

        return res.json({
            correcto: true,
            puntos_ganados: puntos,
            mensaje: `¡Correcto! Has ganado ${puntos} pts.`
        });
    } catch (error) {
        console.error('Error al procesar el juego:', error.message);
        return res.status(500).json({ mensaje: 'Error al procesar el juego.' });
    }
};