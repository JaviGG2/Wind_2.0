const express = require('express');
const router = express.Router();
const relatoController = require('../controllers/relatosController');
const { verificarSesion } = require('../middlewares/autenticacion'); // El guardián

router.get('/relatos', verificarSesion, (req, res) => {
    res.render('relatos'); // Renderiza views/relatos.html usando Nunjucks
});

router.post('/api/relatos', verificarSesion, relatoController.crearRelato);

module.exports = router;