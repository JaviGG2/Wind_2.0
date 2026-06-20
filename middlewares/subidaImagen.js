const multer = require('multer');
const path = require('path');
const fs = require('fs');
const imagekit = require('../config/imagekit');

const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public', 'uploads');
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: diskStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes'), false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

async function subirAImagekit(file, folder = '') {
    if (!file) return null;
    try {
        const imageFile = new File([file.buffer || fs.readFileSync(file.path)], file.originalname, { type: file.mimetype });
        const result = await imagekit.files.upload({
            file: imageFile,
            fileName: `${Date.now()}-${file.originalname}`,
            folder: folder ? `/wind/${folder}` : '/wind',
            useUniqueFileName: true,
        });
        return result.url;
    } catch (error) {
        console.error('Error subiendo a ImageKit, usando almacenamiento local:', error.message);
        return `/uploads/${file.filename}`;
    }
}

module.exports = upload;
module.exports.subirAImagekit = subirAImagekit;
