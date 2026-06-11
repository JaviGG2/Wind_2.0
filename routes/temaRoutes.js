// routes/temaRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const temaController = require('../controllers/temaController');
const upload = require('../middlewares/subidaImagen'); // Importa Multer modularizado

router.get('/subir-tema.html', (req, res) => {
    if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
        return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, '../views', 'subir-tema.html'));
});

// Pasamos el cargador de imágenes directo en el enrutador
router.get('/api/temas', temaController.listarTemas);
router.post('/admin/subir-tema', upload.single('imagen_portada'), temaController.subirTema);

module.exports = router;