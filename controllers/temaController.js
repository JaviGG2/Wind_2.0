const db = require('../config/db');
const { subirASupabase } = require('../middlewares/subidaImagen');
const { contieneMalasPalabras, encontrarMalasPalabras } = require('../utils/filter');
const notificacion = require('./notificacionController');
const { verificarRolDesdeDB } = require('../middlewares/autenticacion');
const { actualizarRachaCreacion } = require('../utils/rachas');

exports.subirTema = async (req, res) => {
    if (!await verificarRolDesdeDB(req)) {
        return res.status(403).json({ mensaje: 'Acceso denegado: Se requieren permisos de Especialista.' });
    }

    const { categoria_id, titulo, contenido, latitud, longitud } = req.body;

    if (!titulo || !contenido) {
        return res.status(400).json({ mensaje: 'El título y el contenido son obligatorios.' });
    }

    try {
        const rutaImagen = req.file ? await subirASupabase(req.file, 'temas') : null;

        const malasPalabras = encontrarMalasPalabras(titulo, contenido);
        if (malasPalabras.length > 0) {
            return res.status(400).json({ mensaje: 'Se detectaron palabras inapropiadas. Revisa los campos marcados.', malasPalabras });
        }

        const queryFinal = `
            INSERT INTO temas (titulo, contenido, categoria_id, creador_id, imagen_portada, fecha_publicacion, estado, latitud, longitud) 
            VALUES ($1, $2, $3, $4, $5, NOW(), 'aprobado', $6, $7)
        `;
        
        const parametros = [
            titulo, 
            contenido, 
            parseInt(categoria_id, 10) || null, 
            req.session.usuarioId, 
            rutaImagen,
            latitud && !isNaN(latitud) ? parseFloat(latitud) : null,
            longitud && !isNaN(longitud) ? parseFloat(longitud) : null
        ];

        const temaRes = await db.query(queryFinal + ' RETURNING id', parametros);
        const temaId = temaRes.rows[0].id;

        actualizarRachaCreacion(req.session.usuarioId).catch(() => {});

        notificacion.crear({
            creadorId: req.session.usuarioId,
            titulo: 'Nuevo tema histórico',
            mensaje: `"${titulo}" ha sido publicado.`,
            enlace: `/ver-tema?id=${temaId}`,
            soloSeguidores: true
        });
        return res.status(201).json({ mensaje: '¡Tema publicado con éxito!' });

    } catch (error) {
        console.error('❌ ERROR REAL EN NEON:', error.message, error.stack);
        return res.status(500).json({ 
            mensaje: 'Error: ' + error.message 
        });
    }
};

exports.actualizarTema = async (req, res) => {
    if (!await verificarRolDesdeDB(req)) {
        return res.status(403).json({ mensaje: 'Acceso denegado: Se requieren permisos de Especialista.' });
    }

    const { id } = req.params;
    const { categoria_id, titulo, contenido, latitud, longitud } = req.body;
    
    if (!titulo || !contenido) {
        return res.status(400).json({ mensaje: 'El título y el contenido son obligatorios.' });
    }

    const malasPalabras = encontrarMalasPalabras(titulo, contenido);
    if (malasPalabras.length > 0) {
        return res.status(400).json({ mensaje: 'Se detectaron palabras inapropiadas. Revisa los campos marcados.', malasPalabras });
    }

    try {
        let queryFinal, parametros;
        if (req.file) {
            const rutaImagen = await subirASupabase(req.file, 'temas');
            queryFinal = `
                UPDATE temas SET titulo = $1, contenido = $2, categoria_id = $3, imagen_portada = $4, latitud = $5, longitud = $6
                WHERE id = $7 AND creador_id = $8
            `;
            parametros = [titulo, contenido, parseInt(categoria_id, 10) || null, rutaImagen,
                latitud && !isNaN(latitud) ? parseFloat(latitud) : null,
                longitud && !isNaN(longitud) ? parseFloat(longitud) : null,
                parseInt(id, 10), req.session.usuarioId];
        } else {
            queryFinal = `
                UPDATE temas SET titulo = $1, contenido = $2, categoria_id = $3, latitud = $4, longitud = $5
                WHERE id = $6 AND creador_id = $7
            `;
            parametros = [titulo, contenido, parseInt(categoria_id, 10) || null,
                latitud && !isNaN(latitud) ? parseFloat(latitud) : null,
                longitud && !isNaN(longitud) ? parseFloat(longitud) : null,
                parseInt(id, 10), req.session.usuarioId];
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
        const filtroCreador = req.query.creador_id ? parseInt(req.query.creador_id, 10) : null;
        const usuarioId = req.session.usuarioId || null;
        const puntuacionSubquery = usuarioId
            ? ', (SELECT puntuacion FROM temas_likes WHERE tema_id = t.id AND usuario_id = $1 LIMIT 1) AS mi_puntuacion'
            : ', null AS mi_puntuacion';
        let result;
        let params;
        let idx = 1;

        const promedioSubquery = ', ROUND(COALESCE((SELECT AVG(puntuacion) FROM temas_likes WHERE tema_id = t.id), 0), 1)::float AS promedio_valoracion';

        const commentCountSubquery = ', (SELECT COUNT(*) FROM comentarios WHERE tema_id = t.id) AS comentarios_count';

        const baseSelect = `SELECT t.id, t.titulo, t.contenido, t.imagen_portada, t.fecha_publicacion, t.creador_id, t.likes, t.latitud, t.longitud
            ${usuarioId ? puntuacionSubquery.replace('$1', `$${idx}`) : ', null AS mi_puntuacion'}
            ${promedioSubquery}
            ${commentCountSubquery},
            c.nombre AS categoria_nombre,
            u.nombre AS creador_nombre,
            u.imagen_perfil AS creador_avatar,
            u.avatar_fondo AS creador_avatar_fondo,
            u.rol AS creador_rol
     FROM temas t
     LEFT JOIN categorias c ON t.categoria_id = c.id
     LEFT JOIN usuarios u ON t.creador_id = u.id
     WHERE t.estado = 'aprobado'`;

        const conds = [];
        const vals = [];

        if (usuarioId) { vals.push(usuarioId); idx++; }
        if (categoriaId && !Number.isNaN(categoriaId)) { conds.push(`t.categoria_id = $${idx++}`); vals.push(categoriaId); }
        if (filtroCreador && !Number.isNaN(filtroCreador)) { conds.push(`t.creador_id = $${idx++}`); vals.push(filtroCreador); }

        const whereExtra = conds.length > 0 ? ' AND ' + conds.join(' AND ') : '';
        params = vals;

        result = await db.query(
            baseSelect + whereExtra + ' ORDER BY t.fecha_publicacion DESC LIMIT 50',
            params
        );
        return res.json(result.rows);
    } catch (error) {
        console.error('Error al listar temas:', error.message);
        return res.status(500).json({ mensaje: 'No se pudieron obtener los temas.' });
    }
};

exports.obtenerTemaPorId = async (req, res) => {
    const rawId = req.params.id;
    console.log(`obtenerTemaPorId: petición recibida para id='${rawId}'`);

    const temaIdNum = parseInt(rawId, 10);

    try {
        const usuarioId = req.session.usuarioId || null;
        let result;

        if (!Number.isNaN(temaIdNum)) {
            result = await db.query(
                `SELECT t.id, t.titulo, t.contenido, t.imagen_portada, t.fecha_publicacion, t.creador_id, t.likes, t.estado, t.latitud, t.longitud,
                        ROUND(COALESCE((SELECT AVG(puntuacion) FROM temas_likes WHERE tema_id = t.id), 0), 1)::float AS promedio_valoracion,
                        ${usuarioId ? '(SELECT puntuacion FROM temas_likes WHERE tema_id = t.id AND usuario_id = $2 LIMIT 1)' : 'null'} AS mi_puntuacion,
                        c.nombre AS categoria_nombre,
                        u.nombre AS creador_nombre,
                    u.imagen_perfil AS creador_avatar,
                    u.avatar_fondo AS creador_avatar_fondo,
                    u.rol AS creador_rol
                 FROM temas t
                 LEFT JOIN categorias c ON t.categoria_id = c.id
                 LEFT JOIN usuarios u ON t.creador_id = u.id
                 WHERE t.id = $1 AND t.estado = 'aprobado'
                 LIMIT 1`,
                usuarioId ? [temaIdNum, usuarioId] : [temaIdNum]
            );
        }

        if (!result || !result.rows || result.rows.length === 0) {
            console.log(`obtenerTemaPorId: intento alternativo por texto con '${rawId}'`);
            result = await db.query(
                `SELECT t.id, t.titulo, t.contenido, t.imagen_portada, t.fecha_publicacion, t.creador_id, t.likes, t.estado, t.latitud, t.longitud,
                        ROUND(COALESCE((SELECT AVG(puntuacion) FROM temas_likes WHERE tema_id = t.id), 0), 1)::float AS promedio_valoracion,
                        ${usuarioId ? '(SELECT puntuacion FROM temas_likes WHERE tema_id = t.id AND usuario_id = $2 LIMIT 1)' : 'null'} AS mi_puntuacion,
                        c.nombre AS categoria_nombre,
                        u.nombre AS creador_nombre,
                        u.imagen_perfil AS creador_avatar,
                        u.avatar_fondo AS creador_avatar_fondo,
                        u.rol AS creador_rol
                 FROM temas t
                 LEFT JOIN categorias c ON t.categoria_id = c.id
                 LEFT JOIN usuarios u ON t.creador_id = u.id
                 WHERE (t.id::text = $1 OR t.slug = $1) AND t.estado = 'aprobado'
                 LIMIT 1`,
                usuarioId ? [rawId, usuarioId] : [rawId]
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

exports.likeTema = async (req, res) => {
    if (!req.session.usuarioId) return res.status(401).json({ mensaje: 'Debes iniciar sesión.' });
    const id = parseInt(req.params.id, 10);
    const usuarioId = req.session.usuarioId;
    if (Number.isNaN(id)) return res.status(400).json({ mensaje: 'ID inválido.' });
    const puntuacion = Math.min(5, Math.max(1, parseInt(req.body.puntuacion, 10) || 5));
    try {
        // obtener valor anterior si existe
        const anterior = await db.query('SELECT puntuacion FROM temas_likes WHERE tema_id = $1 AND usuario_id = $2', [id, usuarioId]);
        const oldP = anterior.rows.length > 0 ? anterior.rows[0].puntuacion : 0;

        await db.query(`
            INSERT INTO temas_likes (tema_id, usuario_id, puntuacion)
            VALUES ($1, $2, $3)
            ON CONFLICT (tema_id, usuario_id)
            DO UPDATE SET puntuacion = EXCLUDED.puntuacion
        `, [id, usuarioId, puntuacion]);

        const stats = await db.query(`
            SELECT COUNT(*)::int AS total, ROUND(COALESCE(AVG(puntuacion),0), 1)::float AS promedio
            FROM temas_likes WHERE tema_id = $1
        `, [id]);
        const { total, promedio } = stats.rows[0];

        await db.query('UPDATE temas SET likes = $1 WHERE id = $2', [total, id]);

        // reputación: ajustar por la diferencia
        const creador = await db.query('SELECT creador_id FROM temas WHERE id = $1', [id]);
        if (creador.rows.length > 0) {
            const creadorId = creador.rows[0].creador_id;
            const diff = puntuacion - oldP;
            if (diff !== 0) {
                await db.query('UPDATE usuarios SET reputacion = GREATEST(0, COALESCE(reputacion,0) + $1) WHERE id = $2 AND rol = $3',
                    [diff, creadorId, 'Especialista']);
            }
        }

        return res.json({ likes: total, promedio, mi_puntuacion: puntuacion, mensaje: oldP > 0 ? 'Valoración actualizada' : 'Gracias por tu valoración' });
    } catch (error) {
        console.error('Error al valorar:', error.message);
        return res.status(500).json({ mensaje: 'Error al procesar la valoración.' });
    }
};

exports.eliminarTema = async (req, res) => {
    if (!await verificarRolDesdeDB(req)) {
        return res.status(403).json({ mensaje: 'Acceso denegado.' });
    }

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ mensaje: 'Id inválido.' });

    try {
        const result = await db.query('SELECT imagen_portada FROM temas WHERE id = $1 AND creador_id = $2', [id, req.session.usuarioId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Tema no encontrado o no tienes permiso.' });
        }

        const imagenUrl = result.rows[0].imagen_portada;

        if (imagenUrl && imagenUrl.includes('supabase.co')) {
            try {
                const supabase = require('../config/supabase');
                const bucket = 'wind-images';
                const parts = imagenUrl.split(`/object/public/${bucket}/`);
                if (parts.length === 2) {
                    const filePath = decodeURIComponent(parts[1]);
                    await supabase.storage.from(bucket).remove([filePath]);
                }
            } catch (err) {
                console.error('Error eliminando imagen de Supabase:', err.message);
            }
        }

        await db.query('DELETE FROM temas WHERE id = $1', [id]);
        res.json({ mensaje: 'Tema eliminado con éxito.' });
    } catch (err) {
        console.error('Error al eliminar tema:', err);
        res.status(500).json({ mensaje: 'Error al eliminar tema.' });
    }
};

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

exports.listarTemasMapa = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT t.id, t.titulo, t.latitud, t.longitud, t.imagen_portada,
                   u.nombre AS creador_nombre, u.username AS creador_username,
                   c.nombre AS categoria_nombre
            FROM temas t
            LEFT JOIN usuarios u ON t.creador_id = u.id
            LEFT JOIN categorias c ON t.categoria_id = c.id
            WHERE t.estado = 'aprobado'
              AND t.latitud IS NOT NULL
              AND t.longitud IS NOT NULL
            ORDER BY t.fecha_publicacion DESC
            LIMIT 200
        `);
        return res.json(result.rows);
    } catch (error) {
        console.error('Error al listar temas para mapa:', error.message);
        return res.status(500).json({ mensaje: 'Error al cargar datos del mapa.' });
    }
};
