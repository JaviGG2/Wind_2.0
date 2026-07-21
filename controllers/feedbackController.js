const db = require('../config/db');
const notificacion = require('./notificacionController');

exports.enviarFeedback = async (req, res) => {
    const { mensaje } = req.body;
    if (!mensaje || !mensaje.trim()) {
        return res.status(400).json({ mensaje: 'Escribe un mensaje.' });
    }
    try {
        await db.query(
            `INSERT INTO feedback (usuario_id, mensaje, pagina) VALUES ($1, $2, $3)`,
            [req.session.usuarioId, mensaje.trim(), req.body.pagina || '']
        );

        const esp = await db.query('SELECT id FROM usuarios WHERE rol = $1 AND cuenta_activa = true', ['Especialista']);
        for (const e of esp.rows) {
            notificacion.crearParaUsuario({
                usuarioId: e.id,
                titulo: 'Nuevo feedback',
                mensaje: mensaje.trim().substring(0, 120),
                enlace: '/admin'
            });
        }

        res.status(201).json({ mensaje: 'Feedback enviado. ¡Gracias!' });
    } catch (err) {
        console.error('Error al guardar feedback:', err.message);
        res.status(500).json({ mensaje: 'Error al enviar feedback.' });
    }
};

exports.listarFeedback = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT f.id, f.mensaje, f.pagina, f.fecha_creacion,
                   u.nombre AS usuario_nombre, u.username AS usuario_username
            FROM feedback f LEFT JOIN usuarios u ON f.usuario_id = u.id
            ORDER BY f.id DESC`);
        res.json(result.rows);
    } catch (err) {
        console.error('Error al listar feedback:', err.message);
        res.status(500).json({ mensaje: 'Error al cargar feedback.' });
    }
};

exports.eliminarFeedback = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ mensaje: 'ID inválido.' });
    try {
        await db.query('DELETE FROM feedback WHERE id = $1', [id]);
        res.json({ mensaje: 'Feedback eliminado.' });
    } catch (err) {
        console.error('Error al eliminar feedback:', err.message);
        res.status(500).json({ mensaje: 'Error al eliminar feedback.' });
    }
};
