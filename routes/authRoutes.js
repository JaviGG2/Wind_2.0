// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/auth/registro', authController.registro);
router.post('/auth/login', authController.login);
router.get('/auth/perfil', authController.perfil);
router.post('/auth/ascender', authController.ascender);
router.post('/auth/logout', authController.logout);
router.post('/auth/verificar', authController.verificarCodigo);

module.exports = router;