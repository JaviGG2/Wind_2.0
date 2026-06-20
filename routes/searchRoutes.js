const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

router.get('/api/buscar', searchController.buscarContenido);
router.post('/api/buscar-ia', searchController.consultarIA);

module.exports = router;
