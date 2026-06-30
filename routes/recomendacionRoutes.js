const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/recomendacionController');
const { verificarSesion } = require('../middlewares/autenticacion');

router.post('/api/recomendaciones/entrenar', verificarSesion, ctrl.entrenar);
router.get('/api/recomendaciones/temas/:id', verificarSesion, ctrl.similaresTema);
router.get('/api/recomendaciones/relatos/:id', verificarSesion, ctrl.similaresRelato);
router.get('/api/recomendaciones/usuario', verificarSesion, ctrl.recomendarUsuario);
router.get('/api/recomendaciones/estado', verificarSesion, ctrl.estado);

module.exports = router;
