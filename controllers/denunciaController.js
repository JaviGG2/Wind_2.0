const db = require('../config/db');
const notificacion = require('./notificacionController');

exports.crearDenuncia = async (req, res) => {
    if (!req.session.usuarioId) {
        return res.status(401).json({ mensaje: 'Debes iniciar sesión.' });
    }
    const { tema_id, motivo } = req.body;
    if (!tema_id || !motivo) {
        return res.status(400).json({ mensaje: 'Faltan datos.' });
    }
    const validos = ['Contenido inapropiado', 'Información incorrecta', 'Spam o publicidad'];
    if (!validos.includes(motivo)) {
        return res.status(400).json({ mensaje: 'Motivo no válido.' });
    }
    try {
        const existente = await db.query(
            'SELECT id FROM denuncias WHERE usuario_id = $1 AND tema_id = $2 AND estado = $3',
            [req.session.usuarioId, tema_id, 'pendiente']
        );
        if (existente.rows.length > 0) {
            return res.status(400).json({ mensaje: 'Ya denunciaste este tema.' });
        }
        await db.query(
            'INSERT INTO denuncias (usuario_id, tema_id, motivo) VALUES ($1, $2, $3)',
            [req.session.usuarioId, tema_id, motivo]
        );
        try {
            const adminRes = await db.query('SELECT id FROM usuarios WHERE rol = $1 LIMIT 1', ['Admin']);
            if (adminRes.rows.length > 0) {
                notificacion.crearParaUsuario({
                    usuarioId: adminRes.rows[0].id,
                    titulo: 'Nueva denuncia',
                    mensaje: `Motivo: ${motivo}`,
                    enlace: `/0505`
                });
            }
        } catch {}
        res.json({ mensaje: 'Denuncia enviada. Gracias por ayudar a mantener la comunidad.' });
    } catch (error) {
        console.error('Error al crear denuncia:', error.message);
        res.status(500).json({ mensaje: 'Error al enviar la denuncia.' });
    }
};

exports.listarDenuncias = async (req, res) => {
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
};

exports.resolverDenuncia = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE denuncias SET estado = $1 WHERE id = $2', ['revisado', id]);
        res.json({ mensaje: 'Denuncia marcada como revisada.' });
    } catch (error) {
        console.error('Error al resolver denuncia:', error.message);
        res.status(500).json({ mensaje: 'Error al resolver denuncia.' });
    }
};
