const express = require('express');
const router = express.Router();
const batallaController = require('../controllers/batallaController');
const { verificarSesion } = require('../middlewares/autenticacion');

router.post('/api/batallas/crear', verificarSesion, batallaController.crearBatalla);
router.get('/api/batallas/:id', verificarSesion, batallaController.obtenerBatalla);
router.post('/api/batallas/:id/responder', verificarSesion, batallaController.responderBatalla);
router.get('/api/batallas/:id/resultados', verificarSesion, batallaController.resultadosBatalla);
router.get('/api/batallas/ya-participe', verificarSesion, batallaController.yaParticipeEstaSemana);

module.exports = router;