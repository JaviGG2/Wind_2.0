// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../middlewares/subidaImagen');
const db = require('../config/db');

router.post('/auth/registro', authController.registro);
router.post('/auth/login', authController.login);
router.get('/auth/perfil', authController.perfil);
router.post('/auth/ascender', authController.ascender);
router.post('/auth/logout', authController.logout);
router.post('/auth/verificar', authController.verificarCodigo);
router.post('/auth/actualizar-foto', upload.single('foto_perfil'), authController.actualizarFotoPerfil);

// Ruta pública: listar todas las categorías disponibles
router.get('/api/categorias', async (req, res) => {
    try {
        const result = await db.query('SELECT id, nombre FROM categorias ORDER BY nombre ASC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        return res.status(500).json({ mensaje: 'Error al cargar categorías.' });
    }
});

module.exports = router;