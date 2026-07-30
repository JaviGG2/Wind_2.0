const db = require('../config/db');
const notificacion = require('./notificacionController');
const { generarJuegoLocal } = require('../utils/ia');

exports.crearBatalla = async (req, res) => {
    try {
        const ranking = await db.query(
            'SELECT id FROM usuarios WHERE puntos > 0 AND (rol IS NULL OR rol != $1) ORDER BY puntos DESC LIMIT 3',
            ['Especialista']
        );
        const top3 = ranking.rows.map(r => r.id);
        if (!top3.includes(req.session.usuarioId)) {
            return res.status(403).json({ mensaje: 'Solo los 3 mejores pueden crear una batalla.' });
        }

        const yaParticipo = await db.query(`
            SELECT COUNT(*) AS count FROM batallas_participantes
            WHERE usuario_id = $1 AND completado = TRUE
            AND fecha_completado >= date_trunc('week', NOW())
        `, [req.session.usuarioId]);
        if (parseInt(yaParticipo.rows[0].count) > 0) {
            return res.status(400).json({ mensaje: 'Ya participaste en una batalla esta semana. Vuelve la próxima semana.' });
        }

        let juegos = await db.query(`
            SELECT pregunta, opcion_a, opcion_b, opcion_c, opcion_correcta
            FROM juegos WHERE tipo = 'Quiz' ORDER BY RANDOM() LIMIT 10
        `);

        if (juegos.rows.length < 10) {
            const faltan = 10 - juegos.rows.length;
            const temas = await db.query(`
                SELECT id, titulo, contenido, categoria_id FROM temas
                WHERE contenido IS NOT NULL AND contenido != ''
                ORDER BY RANDOM() LIMIT $1
            `, [faltan * 2]);

            const nuevos = [];
            for (const tema of temas.rows) {
                if (nuevos.length >= faltan) break;
                try {
                    const q = generarJuegoLocal({ tema, indice: 0 });
                    if (q && q.tipo === 'Quiz') {
                        await db.query(`
                            INSERT INTO juegos (categoria_id, titulo, pregunta, opcion_a, opcion_b, opcion_c, opcion_correcta, tipo, puntos_recompensa, usuario_id, source)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        `, [tema.categoria_id, q.titulo, q.pregunta, q.opcion_a, q.opcion_b, q.opcion_c, q.opcion_correcta, 'Quiz', q.puntos_recompensa || 10, req.session.usuarioId, 'wind']);
                        nuevos.push(q);
                    }
                } catch (e) {}
            }

            juegos = await db.query(`
                SELECT pregunta, opcion_a, opcion_b, opcion_c, opcion_correcta
                FROM juegos WHERE tipo = 'Quiz' ORDER BY RANDOM() LIMIT 10
            `);
        }

        if (juegos.rows.length < 5) {
            return res.status(400).json({ mensaje: 'No hay suficientes temas con contenido para generar preguntas Quiz.' });
        }

        const batalla = await db.query(
            'INSERT INTO batallas (creador_id, estado) VALUES ($1, $2) RETURNING id',
            [req.session.usuarioId, 'activa']
        );
        const batallaId = batalla.rows[0].id;

        const preguntasValues = juegos.rows.map((j, i) =>
            `(${batallaId}, '${j.pregunta.replace(/'/g, "''")}', '${JSON.stringify([j.opcion_a, j.opcion_b, j.opcion_c]).replace(/'/g, "''")}', '${j.opcion_correcta.replace(/'/g, "''")}', ${i + 1})`
        ).join(',');
        await db.query(`INSERT INTO batallas_preguntas (batalla_id, pregunta, opciones, respuesta_correcta, orden) VALUES ${preguntasValues}`);

        const participantesValues = top3.map(uid => `(${batallaId}, ${uid}, ${juegos.rows.length})`).join(',');
        await db.query(`INSERT INTO batallas_participantes (batalla_id, usuario_id, total_preguntas) VALUES ${participantesValues}`);

        const otros = top3.filter(id => id !== req.session.usuarioId);
        for (const uid of otros) {
            await notificacion.crearParaUsuario({
                usuarioId: uid,
                titulo: 'Batalla en la cima',
                mensaje: 'Has sido retado a una batalla contra los mejores. Responde las preguntas y demuestra quién es el mejor.',
                enlace: `/batalla?id=${batallaId}`
            });
        }

        return res.json({ batalla_id: batallaId, total: juegos.rows.length });
    } catch (error) {
        console.error('Error al crear batalla:', error);
        return res.status(500).json({ mensaje: 'Error al crear la batalla.' });
    }
};

exports.obtenerBatalla = async (req, res) => {
    try {
        const batalla = await db.query(
            'SELECT id, creador_id, estado, fecha_creacion FROM batallas WHERE id = $1',
            [req.params.id]
        );
        if (batalla.rows.length === 0) return res.status(404).json({ mensaje: 'Batalla no encontrada.' });

        const participante = await db.query(
            'SELECT * FROM batallas_participantes WHERE batalla_id = $1 AND usuario_id = $2',
            [req.params.id, req.session.usuarioId]
        );
        if (participante.rows.length === 0) {
            return res.status(403).json({ mensaje: 'No participas en esta batalla.' });
        }

        if (participante.rows[0].completado) {
            return res.json({ completado: true, batalla: batalla.rows[0], participante: participante.rows[0] });
        }

        const preguntas = await db.query(
            'SELECT id, pregunta, opciones, orden, respuesta_correcta FROM batallas_preguntas WHERE batalla_id = $1 ORDER BY orden',
            [req.params.id]
        );

        const participantes = await db.query(`
            SELECT u.id, u.nombre, u.username, u.imagen_perfil, u.avatar_fondo,
                   bp.completado, bp.aciertos, bp.tiempo_total_segundos
            FROM batallas_participantes bp
            JOIN usuarios u ON u.id = bp.usuario_id
            WHERE bp.batalla_id = $1
        `, [req.params.id]);

        return res.json({
            completado: false,
            batalla: batalla.rows[0],
            preguntas: preguntas.rows,
            participantes: participantes.rows,
            miParticipacion: participante.rows[0]
        });
    } catch (error) {
        console.error('Error al obtener batalla:', error);
        return res.status(500).json({ mensaje: 'Error al cargar la batalla.' });
    }
};

exports.responderBatalla = async (req, res) => {
    try {
        const { respuestas } = req.body;
        if (!respuestas || !Array.isArray(respuestas) || respuestas.length === 0) {
            return res.status(400).json({ mensaje: 'Respuestas inválidas.' });
        }

        const participante = await db.query(
            'SELECT * FROM batallas_participantes WHERE batalla_id = $1 AND usuario_id = $2',
            [req.params.id, req.session.usuarioId]
        );
        if (participante.rows.length === 0) return res.status(403).json({ mensaje: 'No participas en esta batalla.' });
        if (participante.rows[0].completado) return res.status(400).json({ mensaje: 'Ya completaste esta batalla.' });

        const preguntas = await db.query(
            'SELECT id, respuesta_correcta FROM batallas_preguntas WHERE batalla_id = $1 ORDER BY orden',
            [req.params.id]
        );

        let aciertos = 0;
        let tiempoTotal = 0;

        for (const r of respuestas) {
            const p = preguntas.rows.find(q => q.id === r.pregunta_id);
            if (!p) continue;
            if (p.respuesta_correcta.toUpperCase() === String(r.respuesta).toUpperCase().trim()) {
                aciertos++;
            }
            tiempoTotal += r.tiempo_segundos || 0;
        }

        await db.query(`
            UPDATE batallas_participantes
            SET aciertos = $1, tiempo_total_segundos = $2, completado = TRUE, fecha_completado = NOW()
            WHERE batalla_id = $3 AND usuario_id = $4
        `, [aciertos, tiempoTotal, req.params.id, req.session.usuarioId]);

        const PUNTOS_POR_ACIERTO = 3;
        const puntosGanados = aciertos * PUNTOS_POR_ACIERTO;
        if (puntosGanados > 0) {
            await db.query('UPDATE usuarios SET puntos = COALESCE(puntos,0) + $1 WHERE id = $2', [puntosGanados, req.session.usuarioId]);
        }

        return res.json({ mensaje: 'Respuestas registradas.', aciertos, tiempoTotal, puntos_ganados: puntosGanados });
    } catch (error) {
        console.error('Error al responder batalla:', error);
        return res.status(500).json({ mensaje: 'Error al registrar respuestas.' });
    }
};

exports.resultadosBatalla = async (req, res) => {
    try {
        const batalla = await db.query('SELECT * FROM batallas WHERE id = $1', [req.params.id]);
        if (batalla.rows.length === 0) return res.status(404).json({ mensaje: 'Batalla no encontrada.' });

        const participantes = await db.query(`
            SELECT u.id, u.nombre, u.username, u.imagen_perfil, u.avatar_fondo,
                   bp.aciertos, bp.total_preguntas, bp.tiempo_total_segundos, bp.completado
            FROM batallas_participantes bp
            JOIN usuarios u ON u.id = bp.usuario_id
            WHERE bp.batalla_id = $1
            ORDER BY bp.aciertos DESC, bp.tiempo_total_segundos ASC
        `, [req.params.id]);

        const PUNTOS_POR_ACIERTO = 3;
        const resultados = participantes.rows.map((p, i) => ({
            ...p,
            posicion: i + 1,
            puntos_ganados: p.aciertos * PUNTOS_POR_ACIERTO
        }));

        return res.json({ batalla: batalla.rows[0], resultados });
    } catch (error) {
        console.error('Error al obtener resultados:', error);
        return res.status(500).json({ mensaje: 'Error al cargar resultados.' });
    }
};

exports.yaParticipeEstaSemana = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT COUNT(*) AS count FROM batallas_participantes
            WHERE usuario_id = $1 AND completado = TRUE
            AND fecha_completado >= date_trunc('week', NOW())
        `, [req.session.usuarioId]);
        return res.json({ yaParticipe: parseInt(result.rows[0].count) > 0 });
    } catch (error) {
        console.error('Error al verificar participacion:', error);
        return res.status(500).json({ mensaje: 'Error al verificar.' });
    }
};