const express = require('express');
const router = express.Router();
const relatoController = require('../controllers/relatosController');
const { verificarSesion } = require('../middlewares/autenticacion'); 
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/'); 
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('El archivo cargado no es una imagen válida'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

router.get('/relatos', verificarSesion, (req, res) => {
    res.render('relatos'); 
});

router.get('/api/relatos', relatoController.obtenerRelatos);
router.post('/api/relatos', verificarSesion, upload.single('imagen'), relatoController.crearRelato);
router.get('/api/mis-relatos', verificarSesion, relatoController.obtenerMisRelatos);

module.exports = router;