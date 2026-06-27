const express = require('express');
const router = express.Router();
const relatoController = require('../controllers/relatosController');
const { verificarSesion } = require('../middlewares/autenticacion'); 
const upload = require('../middlewares/subidaImagen');

router.get('/relatos', verificarSesion, (req, res) => {
    res.render('relatos'); 
});

router.get('/api/relatos', relatoController.obtenerRelatos);
router.get('/api/relatos/:id', relatoController.obtenerRelato);
router.post('/api/relatos', verificarSesion, upload.single('imagen'), relatoController.crearRelato);
router.get('/api/mis-relatos', verificarSesion, relatoController.obtenerMisRelatos);
router.delete('/api/relatos/:id', verificarSesion, relatoController.eliminarRelato);

module.exports = router;