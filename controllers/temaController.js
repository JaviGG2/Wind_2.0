// controllers/temaController.js
const db = require('../config/db');

exports.subirTema = async (req, res) => {
    // 1. Verificación de seguridad
    if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
        return res.status(403).json({ mensaje: 'Acceso denegado: Se requieren permisos de Especialista.' });
    }

    const { categoria_id, titulo, contenido } = req.body;
    const rutaImagen = req.file ? `uploads/${req.file.filename}` : 'uploads/defecto.jpg';

    // Validación básica en el servidor
    if (!titulo || !contenido) {
        return res.status(400).json({ mensaje: 'El título y el contenido son obligatorios.' });
    }

    try {
        // Query directa y limpia. (Asegúrate de que estos campos existan en tu tabla)
        const queryFinal = `
            INSERT INTO temas (titulo, contenido, categoria_id, creador_id, imagen_portada, fecha_publicacion) 
            VALUES ($1, $2, $3, $4, $5, NOW())
        `;
        
        const parametros = [
            titulo, 
            contenido, 
            parseInt(categoria_id, 10) || null, 
            req.session.usuarioId, 
            rutaImagen
        ];

        await db.query(queryFinal, parametros);
        return res.status(201).json({ mensaje: '¡Tema histórico publicado con éxito!' });

    } catch (error) {
        console.error('❌ ERROR REAL EN NEON:', error.message);
        
        // Si el error es porque la columna se llama diferente, te lo dirá en la consola de VS Code
        return res.status(500).json({ 
            mensaje: 'Error en la base de datos. Verifica los nombres de tus columnas en Neon.' 
        });
    }
};

exports.actualizarTema = async (req, res) => {
    // 1. Verificación de seguridad
    if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
        return res.status(403).json({ mensaje: 'Acceso denegado: Se requieren permisos de Especialista.' });
    }

    const { id } = req.params;
    const { categoria_id, titulo, contenido } = req.body;
    
    // Validación básica en el servidor
    if (!titulo || !contenido) {
        return res.status(400).json({ mensaje: 'El título y el contenido son obligatorios.' });
    }

    try {
        let queryFinal, parametros;
        if (req.file) {
            const rutaImagen = `uploads/${req.file.filename}`;
            queryFinal = `
                UPDATE temas SET titulo = $1, contenido = $2, categoria_id = $3, imagen_portada = $4 
                WHERE id = $5 AND creador_id = $6
            `;
            parametros = [titulo, contenido, parseInt(categoria_id, 10) || null, rutaImagen, parseInt(id, 10), req.session.usuarioId];
        } else {
            queryFinal = `
                UPDATE temas SET titulo = $1, contenido = $2, categoria_id = $3 
                WHERE id = $4 AND creador_id = $5
            `;
            parametros = [titulo, contenido, parseInt(categoria_id, 10) || null, parseInt(id, 10), req.session.usuarioId];
        }

        const result = await db.query(queryFinal, parametros);
        if (result.rowCount === 0) {
             return res.status(404).json({ mensaje: 'Tema no encontrado o no tienes permiso para editarlo.' });
        }
        return res.status(200).json({ mensaje: '¡Tema actualizado con éxito!' });

    } catch (error) {
        console.error('❌ ERROR AL ACTUALIZAR TEMA:', error.message);
        return res.status(500).json({ mensaje: 'Error en la base de datos al actualizar el tema.' });
    }
};

exports.listarTemas = async (req, res) => {
    try {
        const categoriaId = req.query.categoria ? parseInt(req.query.categoria, 10) : null;
        let result;

        if (categoriaId && !Number.isNaN(categoriaId)) {
            result = await db.query(
                `SELECT t.id, t.titulo, t.contenido, t.imagen_portada, t.fecha_publicacion, t.creador_id,
                    c.nombre AS categoria_nombre,
                    u.nombre AS creador_nombre
             FROM temas t
             LEFT JOIN categorias c ON t.categoria_id = c.id
             LEFT JOIN usuarios u ON t.creador_id = u.id
             WHERE t.categoria_id = $1
             ORDER BY t.fecha_publicacion DESC
             LIMIT 50`,
                [categoriaId]
            );
        } else {
            result = await db.query(
                `SELECT t.id, t.titulo, t.contenido, t.imagen_portada, t.fecha_publicacion, t.creador_id,
                    c.nombre AS categoria_nombre,
                    u.nombre AS creador_nombre
             FROM temas t
             LEFT JOIN categorias c ON t.categoria_id = c.id
             LEFT JOIN usuarios u ON t.creador_id = u.id
             ORDER BY t.fecha_publicacion DESC
             LIMIT 50`
            );
        }
        return res.json(result.rows);
    } catch (error) {
        console.error('Error al listar temas:', error.message);
        return res.status(500).json({ mensaje: 'No se pudieron obtener los temas.' });
    }
};

exports.obtenerTemaPorId = async (req, res) => {
    const rawId = req.params.id;
    console.log(`obtenerTemaPorId: petición recibida para id='${rawId}'`);

    // Intentamos usar el valor tal cual: si es numérico lo tratamos como entero,
    // si no, haremos una búsqueda flexible por texto (útil si usas slugs).
    const temaIdNum = parseInt(rawId, 10);

    try {
        let result;

        if (!Number.isNaN(temaIdNum)) {
            result = await db.query(
                `SELECT t.id, t.titulo, t.contenido, t.imagen_portada, t.fecha_publicacion, t.creador_id,
                        c.nombre AS categoria_nombre,
                        u.nombre AS creador_nombre
                 FROM temas t
                 LEFT JOIN categorias c ON t.categoria_id = c.id
                 LEFT JOIN usuarios u ON t.creador_id = u.id
                 WHERE t.id = $1
                 LIMIT 1`,
                [temaIdNum]
            );
        }

        // Si no encontramos resultado con el entero (o no era numérico), intentamos búsqueda por texto
        if (!result || !result.rows || result.rows.length === 0) {
            console.log(`obtenerTemaPorId: intento alternativo por texto con '${rawId}'`);
            result = await db.query(
                `SELECT t.id, t.titulo, t.contenido, t.imagen_portada, t.fecha_publicacion, t.creador_id,
                        c.nombre AS categoria_nombre,
                        u.nombre AS creador_nombre
                 FROM temas t
                 LEFT JOIN categorias c ON t.categoria_id = c.id
                 LEFT JOIN usuarios u ON t.creador_id = u.id
                 WHERE t.id::text = $1 OR t.slug = $1
                 LIMIT 1`,
                [rawId]
            );
        }

        console.log('obtenerTemaPorId: filas devueltas =', (result.rows || []).length);

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Tema no encontrado.' });
        }

        return res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener tema por id:', error);
        return res.status(500).json({ mensaje: 'Error al obtener el tema.' });
    }
};

// 4. Historial de temas creados por el usuario (Especialista)
exports.misTemas = async (req, res) => {
    if (!req.session.usuarioId) return res.status(401).json({ mensaje: 'No autorizado.' });

    try {
        const consulta = `
            SELECT t.id, t.titulo, t.imagen_portada, t.fecha_publicacion, c.nombre AS categoria_nombre
            FROM temas t
            LEFT JOIN categorias c ON t.categoria_id = c.id
            WHERE t.creador_id = $1
            ORDER BY t.fecha_publicacion DESC
            LIMIT 50
        `;
        const resultado = await db.query(consulta, [req.session.usuarioId]);
        return res.json(resultado.rows);
    } catch (error) {
        console.error('Error al listar temas del usuario:', error.message);
        return res.status(500).json({ mensaje: 'Error al cargar tus temas.' });
    }
};
