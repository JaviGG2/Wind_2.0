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