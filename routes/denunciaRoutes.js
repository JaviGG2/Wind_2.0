const express = require('express');
const router = express.Router();
const dc = require('../controllers/denunciaController');

router.post('/api/denuncias', dc.crearDenuncia);

module.exports = router;
