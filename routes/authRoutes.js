const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../middlewares/subidaImagen');
const db = require('../config/db');

router.post('/auth/registro', authController.registro);
router.post('/auth/login', authController.login);
router.get('/auth/perfil', authController.perfil);
router.post('/auth/logout', authController.logout);
router.post('/auth/verificar', authController.verificarCodigo);
router.post('/auth/actualizar-foto', upload.single('foto_perfil'), authController.actualizarFotoPerfil);
router.get('/api/categorias', async (req, res) => {
    try {
        const result = await db.query('SELECT id, nombre FROM categorias ORDER BY nombre ASC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        return res.status(500).json({ mensaje: 'Error al cargar categorías.' });
    }
});

router.post('/api/categorias', async (req, res) => {
    if (req.session.rol !== 'Especialista') {
        return res.status(403).json({ mensaje: 'Acceso denegado.' });
    }
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ mensaje: 'El nombre de la categoría es obligatorio.' });
    }
    try {
        const result = await db.query(
            'INSERT INTO categorias (nombre) VALUES ($1) RETURNING id, nombre',
            [nombre.trim()]
        );
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear categoría:', error);
        return res.status(500).json({ mensaje: 'Error al crear la categoría.' });
    }
});


router.delete('/api/categorias/:id', async (req, res) => {
    if (req.session.rol !== 'Especialista') {
        return res.status(403).json({ mensaje: 'Acceso denegado.' });
    }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ mensaje: 'ID inválido.' });

    try {
        // Opcional: liberar las referencias antes de borrar
        await db.query('UPDATE temas SET categoria_id = NULL WHERE categoria_id = $1', [id]);
        await db.query('UPDATE juegos SET categoria_id = NULL WHERE categoria_id = $1', [id]);
        
        await db.query('DELETE FROM categorias WHERE id = $1', [id]);
        return res.json({ mensaje: 'Categoría eliminada.' });
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        return res.status(500).json({ mensaje: 'Error al eliminar la categoría.' });
    }
})

router.get('/api/usuarios', async (req, res) => {
    if (req.session.rol !== 'Especialista') {
        return res.status(403).json({ mensaje: 'Acceso denegado.' });
    }
    try {
        const result = await db.query(
            'SELECT id, nombre, username, correo, rol, puntos, cuenta_activa FROM usuarios ORDER BY id ASC'
        );
        return res.json(result.rows);
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        return res.status(500).json({ mensaje: 'Error al cargar usuarios.' });
    }
});

module.exports = router;