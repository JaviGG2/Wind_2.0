const recomendador = require('../utils/recomendador');
const db = require('../config/db');

async function entrenar(req, res) {
    try {
        await recomendador.entrenar();
        res.json({ mensaje: 'Recomendador entrenado correctamente.' });
    } catch (err) {
        console.error('Error entrenando recomendador:', err);
        res.status(500).json({ mensaje: 'Error al entrenar.' });
    }
}

async function similaresTema(req, res) {
    try {
        const id = parseInt(req.params.id);
        const resultados = recomendador.similares(id, 'tema', 6);
        if (!resultados.length) return res.json([]);
        const ids = resultados.map(r => r.id);
        const ph = ids.map((_, i) => `$${i + 1}`).join(',');
        const data = await db.query(
            `SELECT id, titulo, LEFT(contenido, 200) AS resumen, likes FROM temas WHERE id IN (${ph})`, ids
        );
        const map = {};
        resultados.forEach(r => { map[r.id] = r; });
        res.json(data.rows.map(row => ({ ...row, ...map[row.id] })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al obtener recomendaciones.' });
    }
}

async function similaresRelato(req, res) {
    try {
        const id = parseInt(req.params.id);
        const resultados = recomendador.similares(id, 'relato', 6);
        if (!resultados.length) return res.json([]);
        const ids = resultados.map(r => r.id);
        const ph = ids.map((_, i) => `$${i + 1}`).join(',');
        const data = await db.query(
            `SELECT id, titulo, LEFT(contenido_relato, 200) AS resumen FROM relatos_community WHERE id IN (${ph})`, ids
        );
        const map = {};
        resultados.forEach(r => { map[r.id] = r; });
        res.json(data.rows.map(row => ({ ...row, ...map[row.id] })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al obtener recomendaciones.' });
    }
}

async function recomendarUsuario(req, res) {
    try {
        const userId = req.session.usuarioId;
        const data = await recomendador.recomendar(userId, 6);
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al recomendar.' });
    }
}

async function estado(req, res) {
    res.json({ listo: recomendador.listo });
}

module.exports = { entrenar, similaresTema, similaresRelato, recomendarUsuario, estado };
