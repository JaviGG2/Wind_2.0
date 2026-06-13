// routes/temaRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const temaController = require('../controllers/temaController');
const upload = require('../middlewares/subidaImagen'); // Importa Multer modularizado
const { verificarSesion } = require('../middlewares/autenticacion');

router.get('/subir-tema.html', (req, res) => {
    if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
        return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, '../views', 'subir-tema.html'));
});

// Pasamos el cargador de imágenes directo en el enrutador
router.get('/api/temas', temaController.listarTemas);
router.post('/admin/subir-tema', upload.single('imagen_portada'), temaController.subirTema);
// Ruta pública para obtener un tema por ID o slug
router.get('/api/temas/:id', temaController.obtenerTemaPorId);
router.get('/admin/mis-temas', verificarSesion, temaController.misTemas);

// DELETE tema (solo especialista)
router.put('/admin/temas/:id', verificarSesion, upload.single('imagen_portada'), temaController.actualizarTema);

router.delete('/admin/temas/:id', verificarSesion, async (req, res) => {
    // delegar a controller para mantener consistencia
    try {
        // simple permiso: verificar rol
        if (!req.session.rol || req.session.rol !== 'Especialista') return res.status(403).json({ mensaje: 'Acceso denegado.' });
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ mensaje: 'Id inválido.' });
        await require('../config/db').query('DELETE FROM temas WHERE id = $1 AND creador_id = $2', [id, req.session.usuarioId]);
        return res.json({ mensaje: 'Tema eliminado.' });
    } catch (err) {
        console.error('Error al borrar tema:', err);
        return res.status(500).json({ mensaje: 'Error al eliminar tema.' });
    }
});

module.exports = router;