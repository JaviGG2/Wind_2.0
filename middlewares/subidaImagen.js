const multer = require('multer');
const path = require('path');
const fs = require('fs');
const supabase = require('../config/supabase');

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

const BUCKET = 'wind-images';

async function subirASupabase(file, folder = '') {
    if (!file) return null;
    try {
        const fileBuffer = fs.readFileSync(file.path);
        const filePath = folder
            ? `${folder}/${Date.now()}-${file.originalname}`
            : `${Date.now()}-${file.originalname}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(filePath, fileBuffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.error('Error subiendo a Supabase:', uploadError.message);
            return `/uploads/${file.filename}`;
        }

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
        return data.publicUrl;
    } catch (error) {
        console.error('Error en subirASupabase, usando almacenamiento local:', error.message);
        return `/uploads/${file.filename}`;
    }
}

module.exports = upload;
module.exports.subirASupabase = subirASupabase;
