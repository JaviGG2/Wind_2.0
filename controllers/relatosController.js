const db = require('../config/db'); // Tu conexión a PostgreSQL/Neon

exports.crearRelato = async (req, res) => {
    if (!req.session.usuarioId) {
        return res.status(401).json({ error: 'No autorizado. Inicie sesión.' });
    }

    const { titulo, contenido } = req.body;

    if (!titulo || !contenido) {
        return res.status(400).json({ error: 'Título y contenido son requeridos' });
    }

    try {
        // Si Multer atrapó la imagen, guardamos la ruta web. Si no, queda en null
        let imagenUrl = null;
        if (req.file) {
            imagenUrl = `/uploads/${req.file.filename}`;
        }

        const querySQL = `
            INSERT INTO relatos_community (titulo, contenido_relato, usuario_id, imagen_url, fecha_publicacion)
            VALUES ($1, $2, $3, $4, NOW()) RETURNING *
        `;
        
        const values = [titulo, contenido, req.session.usuarioId, imagenUrl];
        const resultado = await db.query(querySQL, values);

        res.status(201).json({ message: 'Relato creado con éxito', relato: resultado.rows[0] });
    } catch (error) {
        console.error('Error al insertar en Neon:', error);
        res.status(500).json({ error: 'Error al guardar el relato en la base de datos' });
    }
};

exports.obtenerRelatos = async (req, res) => {
    try {
        const querySQL = `
            SELECT id, titulo, contenido_relato, imagen_url, fecha_publicacion, usuario_id 
            FROM relatos_community 
            ORDER BY fecha_publicacion DESC
        `;
        const resultado = await db.query(querySQL);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener relatos:', error);
        res.status(500).json({ error: 'Error al obtener los relatos' });
    }
};

exports.obtenerMisRelatos = async (req, res) => {
    try {
        const querySQL = `
            SELECT id, titulo, contenido_relato, imagen_url, fecha_publicacion 
            FROM relatos_community 
            WHERE usuario_id = $1 
            ORDER BY fecha_publicacion DESC
        `;
        const resultado = await db.query(querySQL, [req.session.usuarioId]);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('Error al obtener mis relatos:', error);
        res.status(500).json({ error: 'Error al obtener tus relatos' });
    }
};