const db = require('../config/db');
const { contieneMalasPalabras } = require('../utils/filter');
const notificacion = require('./notificacionController');

exports.listarComentarios = async (req, res) => {
    const temaId = parseInt(req.params.temaId, 10);
    if (Number.isNaN(temaId)) return res.status(400).json({ mensaje: 'ID inválido.' });
    try {
        const result = await db.query(
            `SELECT c.id, c.contenido, c.fecha_creacion, c.usuario_id,
                    u.nombre AS usuario_nombre, u.imagen_perfil AS usuario_avatar, u.avatar_fondo AS usuario_avatar_fondo, u.rol AS usuario_rol
             FROM comentarios c
             JOIN usuarios u ON c.usuario_id = u.id
             WHERE c.tema_id = $1
             ORDER BY c.fecha_creacion ASC`,
            [temaId]
        );
        return res.json(result.rows);
    } catch (error) {
        console.error('Error al listar comentarios:', error.message);
        return res.status(500).json({ mensaje: 'Error al cargar comentarios.' });
    }
};

exports.crearComentario = async (req, res) => {
    if (!req.session.usuarioId) return res.status(401).json({ mensaje: 'Debes iniciar sesión.' });
    const temaId = parseInt(req.params.temaId, 10);
    const { contenido } = req.body;
    if (Number.isNaN(temaId)) return res.status(400).json({ mensaje: 'ID inválido.' });
    if (!contenido || !contenido.trim()) return res.status(400).json({ mensaje: 'El comentario no puede estar vacío.' });
    if (contieneMalasPalabras(contenido)) return res.status(400).json({ mensaje: 'Por favor, revisa tu texto y evita lenguaje ofensivo.' });
    try {
        const result = await db.query(
            `INSERT INTO comentarios (usuario_id, tema_id, contenido)
             VALUES ($1, $2, $3)
             RETURNING id, contenido, fecha_creacion, usuario_id`,
            [req.session.usuarioId, temaId, contenido.trim()]
        );
        const comentario = result.rows[0];
        comentario.usuario_nombre = req.session.nombre || 'Anónimo';
        comentario.usuario_avatar = null;
        notificacion.crear({
            creadorId: req.session.usuarioId,
            titulo: 'Nuevo comentario',
            mensaje: `${req.session.nombre || 'Alguien'} comentó en un tema.`,
            enlace: `/paginaTema.html?id=${temaId}`
        });
        return res.status(201).json(comentario);
    } catch (error) {
        console.error('Error al crear comentario:', error.message);
        return res.status(500).json({ mensaje: 'Error al publicar comentario.' });
    }
};

exports.eliminarComentario = async (req, res) => {
    if (!req.session.usuarioId) return res.status(401).json({ mensaje: 'Debes iniciar sesión.' });
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ mensaje: 'ID inválido.' });
    try {
        const result = await db.query(
            'DELETE FROM comentarios WHERE id = $1 AND usuario_id = $2 RETURNING id',
            [id, req.session.usuarioId]
        );
        if (result.rows.length === 0) return res.status(404).json({ mensaje: 'Comentario no encontrado o no tienes permiso.' });
        return res.json({ mensaje: 'Comentario eliminado.' });
    } catch (error) {
        console.error('Error al eliminar comentario:', error.message);
        return res.status(500).json({ mensaje: 'Error al eliminar comentario.' });
    }
};
