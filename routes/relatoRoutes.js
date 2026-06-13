const express = require('express');
const router = express.Router();
const relatoController = require('../controllers/relatosController');
const { verificarSesion } = require('../middlewares/autenticacion'); 

router.get('/relatos', verificarSesion, (req, res) => {
    res.render('relatos'); // Renderiza views/relatos.html usando Nunjucks
});

router.get('/api/relatos', relatoController.obtenerRelatos);

router.post('/api/relatos', verificarSesion, relatoController.crearRelato);

router.get('/api/mis-relatos', verificarSesion, relatoController.obtenerMisRelatos);

module.exports = router;