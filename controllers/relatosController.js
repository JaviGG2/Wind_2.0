const db = require('../config/db');
const { subirAImagekit } = require('../middlewares/subidaImagen');

exports.crearRelato = async (req, res) => {
    if (!req.session.usuarioId) {
        return res.status(401).json({ error: 'No autorizado. Inicie sesión.' });
    }

    const { titulo, contenido } = req.body;

    if (!titulo || !contenido) {
        return res.status(400).json({ error: 'Título y contenido son requeridos' });
    }

    try {
        const imagenUrl = req.file ? await subirAImagekit(req.file, 'comunidad') : null;

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
        let querySQL;
        let params = [];

        const categoria = req.query.categoria ? String(req.query.categoria).trim() : '';

        if (categoria && categoria !== 'undefined' && categoria !== 'null') {
            querySQL = `
                SELECT r.id, r.titulo, r.contenido_relato, r.fecha_publicacion,
                       r.usuario_id, r.imagen_url,
                       u.nombre AS autor_nombre
                FROM relatos_community r
                LEFT JOIN usuarios u ON r.usuario_id = u.id
                WHERE r.categoria = $1
                ORDER BY r.fecha_publicacion DESC
                LIMIT 200
            `;
            params = [categoria];
        } else {
            querySQL = `
                SELECT r.id, r.titulo, r.contenido_relato, r.fecha_publicacion,
                       r.usuario_id, r.imagen_url,
                       u.nombre AS autor_nombre
                FROM relatos_community r
                LEFT JOIN usuarios u ON r.usuario_id = u.id
                ORDER BY r.fecha_publicacion DESC
                LIMIT 200
            `;
        }

        console.log('[relatosController] Ejecutando query:', querySQL.replace(/\s+/g, ' ').trim());
        console.log('[relatosController] Params:', params);

        const resultado = await db.query(querySQL, params);

        console.log('[relatosController] Relatos encontrados:', resultado.rows.length);
        return res.json(resultado.rows);
    } catch (error) {
        console.error('[relatosController] ERROR al obtener relatos:');
        console.error('  Codigo:', error.code);
        console.error('  Mensaje:', error.message);
        console.error('  Detail:', error.detail);
        console.error('  Hint:', error.hint);
        console.error('  Position:', error.position);
        console.error('  Query completo:', error.query);
        return res.status(500).json({
            error: 'Error al obtener los relatos',
            detalle: error.message,
            codigo: error.code
        });
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