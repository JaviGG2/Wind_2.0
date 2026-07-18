const express = require('express');
const router = express.Router();
const path = require('path');
const temaController = require('../controllers/temaController');
const upload = require('../middlewares/subidaImagen');
const { verificarSesion, verificarRolDesdeDB } = require('../middlewares/autenticacion');

router.get('/subir-tema.html', async (req, res) => {
    if (!await verificarRolDesdeDB(req)) {
        return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, '../views', 'subir-tema.html'));
});
router.get('/api/temas/mapa', temaController.listarTemasMapa);
router.get('/api/temas', temaController.listarTemas);
router.post('/admin/subir-tema', upload.single('imagen_portada'), temaController.subirTema);
router.get('/api/temas/:id', temaController.obtenerTemaPorId);
router.get('/admin/mis-temas', verificarSesion, temaController.misTemas);
router.post('/api/temas/:id/like', temaController.likeTema);
router.put('/admin/temas/:id', verificarSesion, upload.single('imagen_portada'), temaController.actualizarTema);

router.delete('/admin/temas/:id', verificarSesion, temaController.eliminarTema);

module.exports = router;