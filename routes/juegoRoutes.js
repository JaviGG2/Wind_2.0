const express = require('express');
const router = express.Router();
const path = require('path');
const juegoController = require('../controllers/juegoController');
const { verificarRolDesdeDB } = require('../middlewares/autenticacion');

router.get('/crear-juego', async (req, res) => {
    if (!await verificarRolDesdeDB(req)) {
        return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, '../views', 'crear-juego.html'));
});

router.post('/admin/crear-juego', juegoController.crearJuego);
router.get('/admin/mis-juegos', juegoController.misJuegos);
router.get('/api/juegos', juegoController.listarPublicos);
router.get('/api/juegos/ranking', juegoController.rankingGlobal);
router.get('/api/juegos/:id', juegoController.obtenerJuego);
router.post('/api/juegos/responder', juegoController.responderJuego);
router.post('/api/juegos/:id/like', juegoController.likeJuego);
router.delete('/admin/juegos/:id', juegoController.eliminarJuego);

module.exports = router;