// routes/juegoRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const juegoController = require('../controllers/juegoController');

router.get('/crear-juego', (req, res) => {
    if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
        return res.redirect('/login.html'); // Redirige a login si no tiene permisos de Especialista
    }
    res.sendFile(path.join(__dirname, '../views', 'crear-juego.html'));
});

router.post('/admin/crear-juego', juegoController.crearJuego);
router.get('/admin/mis-juegos', juegoController.misJuegos);
router.get('/api/juegos', juegoController.listarPublicos);
router.delete('/admin/juegos/:id', juegoController.eliminarJuego);

module.exports = router;