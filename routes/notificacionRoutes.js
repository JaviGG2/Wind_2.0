const express = require('express');
const router = express.Router();
const notificacionController = require('../controllers/notificacionController');

router.get('/api/notificaciones', notificacionController.listar);
router.get('/api/notificaciones/no-leidas', notificacionController.noLeidas);
router.put('/api/notificaciones/:id/leer', notificacionController.marcarLeida);
router.put('/api/notificaciones/leer-todas', notificacionController.marcarTodasLeidas);
router.delete('/api/notificaciones', notificacionController.vaciar);

module.exports = router;
