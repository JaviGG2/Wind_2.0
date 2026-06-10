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
        console.error('ERROR REAL EN NEON:', error.message);
        
        // Si el error es porque la columna se llama diferente, te lo dirá en la consola de VS Code
        return res.status(500).json({ 
            mensaje: 'Error en la base de datos. Verifica los nombres de tus columnas en Neon.' 
        });
    }
};