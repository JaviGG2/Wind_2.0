const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialController');

router.post('/api/historial/registrar', historialController.registrarVista);
router.get('/api/historial', historialController.obtenerHistorial);

module.exports = router;
