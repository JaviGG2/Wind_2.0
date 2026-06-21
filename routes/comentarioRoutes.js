const express = require('express');
const router = express.Router();
const comentarioController = require('../controllers/comentarioController');

router.get('/api/temas/:temaId/comentarios', comentarioController.listarComentarios);
router.post('/api/temas/:temaId/comentarios', comentarioController.crearComentario);
router.delete('/api/comentarios/:id', comentarioController.eliminarComentario);

module.exports = router;
