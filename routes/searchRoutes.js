const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

router.get('/api/buscar', searchController.buscarContenido);

module.exports = router;
