const recomendador = require('../utils/recomendador');

async function entrenar(req, res) {
    try {
        await recomendador.entrenar();
        res.json({ mensaje: 'Recomendador listo.' });
    } catch (err) {
        console.error('Error entrenando recomendador:', err);
        res.status(500).json({ mensaje: 'Error al entrenar.' });
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

module.exports = { entrenar, recomendarUsuario, estado };
