const db = require('../config/db');

exports.registrarVista = async (req, res) => {
    if (!req.session.usuarioId) return res.status(401).json({ mensaje: 'No autorizado.' });

    const { tipo_contenido, contenido_id } = req.body;
    if (!tipo_contenido || !contenido_id) {
        return res.status(400).json({ mensaje: 'Faltan datos requeridos.' });
    }

    try {
        await db.query(`
            INSERT INTO historial_vistas (usuario_id, tipo_contenido, contenido_id, fecha_vista)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (usuario_id, tipo_contenido, contenido_id)
            DO UPDATE SET fecha_vista = NOW()
        `, [req.session.usuarioId, tipo_contenido, contenido_id]);

        return res.json({ mensaje: 'Vista registrada.' });
    } catch (error) {
        console.error('Error al registrar vista:', error);
        return res.status(500).json({ mensaje: 'Error al registrar la vista.' });
    }
};

exports.obtenerHistorial = async (req, res) => {
    if (!req.session.usuarioId) return res.status(401).json({ mensaje: 'No autorizado.' });

    try {
        const [temasRes, juegosRes] = await Promise.all([
            db.query(`
                SELECT t.id, t.titulo, t.imagen_portada, t.fecha_publicacion,
                       c.nombre AS categoria_nombre, hv.fecha_vista
                FROM historial_vistas hv
                JOIN temas t ON t.id = hv.contenido_id
                LEFT JOIN categorias c ON t.categoria_id = c.id
                WHERE hv.usuario_id = $1 AND hv.tipo_contenido = 'tema'
                ORDER BY hv.fecha_vista DESC
                LIMIT 20
            `, [req.session.usuarioId]),
            db.query(`
                SELECT j.id, j.pregunta, j.puntos_recompensa,
                       c.nombre AS categoria_nombre, hv.fecha_vista
                FROM historial_vistas hv
                JOIN juegos j ON j.id = hv.contenido_id
                LEFT JOIN categorias c ON j.categoria_id = c.id
                WHERE hv.usuario_id = $1 AND hv.tipo_contenido = 'juego'
                ORDER BY hv.fecha_vista DESC
                LIMIT 20
            `, [req.session.usuarioId])
        ]);

        return res.json({
            temas: temasRes.rows,
            juegos: juegosRes.rows
        });
    } catch (error) {
        console.error('Error al obtener historial:', error);
        return res.status(500).json({ mensaje: 'Error al cargar el historial.' });
    }
};
