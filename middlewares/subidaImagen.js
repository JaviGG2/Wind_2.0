// middlewares/subidaImagen.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de almacenamiento para las imágenes de portada (Extraído de tu app.js)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public', 'uploads');
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

module.exports = upload;