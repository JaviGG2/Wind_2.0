const express = require('express');
const router = express.Router();
const path = require('path');
const moduloController = require('../controllers/moduloController');
const { verificarSesion, esEspecialista } = require('../middlewares/autenticacion');
router.get('/modulos', verificarSesion, (req, res) => {
  res.render('modulos');
});

router.get('/modulos/:id', verificarSesion, (req, res) => {
  res.render('modulo-detalle', { moduloId: req.params.id });
});

router.get('/admin/crear-modulo', verificarSesion, esEspecialista, (req, res) => {
  res.render('crear-modulo');
});

router.get('/admin/modulos', verificarSesion, esEspecialista, (req, res) => {
  res.render('admin-modulos');
});

router.get('/admin/editar-modulo', verificarSesion, esEspecialista, (req, res) => {
  res.render('editar-modulo');
});
router.get('/api/modulos', moduloController.listarModulos);
router.get('/api/modulos/:id', moduloController.obtenerModulo);
router.get('/api/modulos-admin', verificarSesion, moduloController.misModulos);
router.post('/api/modulos-admin', verificarSesion, moduloController.crearModulo);
router.post('/api/modulos-admin/:id/niveles', verificarSesion, moduloController.agregarNivel);
router.delete('/api/modulos-admin/:id/niveles/:nivelId', verificarSesion, moduloController.eliminarNivel);
router.delete('/api/modulos-admin/:id', verificarSesion, moduloController.eliminarModulo);
router.post('/api/modulos/:id/niveles/:nivelId/completar', verificarSesion, moduloController.completarNivel);
router.post('/api/modulos/:id/like', verificarSesion, moduloController.likeModulo);

module.exports = router;
