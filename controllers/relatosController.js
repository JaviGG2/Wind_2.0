const db = require('../config/db');

exports.crearRelato = async (req, res) => {
   if (!req.session.usuarioId) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const { titulo, contenido } = req.body;

    if (!titulo || !contenido) {
        return res.status(400).json({ error: 'Título y contenido son requeridos' });
    }

    try {
        const querySQL = `
            INSERT INTO relatos_community (titulo, contenido, usuario_id, fecha_publicacion)
            VALUES ($1, $2, $3, NOW())
        `;

        const values = [titulo, contenido, req.session.usuarioId];
        await db.query(querySQL, values);
        res.status(201).json({ message: 'Relato creado con éxito' });
    } catch (error) {
        console.error('Error al crear relato:', error);
        res.status(500).json({ error: 'Error al crear el relato' });
    }
};