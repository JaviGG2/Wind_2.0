const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
    console.error('ERROR CRITICO: DATABASE_URL no está definida en el archivo .env');
    if (!process.env.VERCEL) {
        process.exit(1);
    }
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/wind',
    ssl: process.env.DATABASE_URL ? {
        rejectUnauthorized: false
    } : false
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
        console.error('Verifica que DATABASE_URL sea correcta en tu archivo .env');
        return;
    }
    console.log('Base de datos conectada correctamente');
    release();
});

module.exports = {
    pool,
    query: async (text, params) => {
        try {
            const result = await pool.query(text, params);
            return result;
        } catch (error) {
            console.error('Error en consulta SQL:', error.message);
            console.error('Query:', text);
            console.error('Params:', params);
            throw error;
        }
    }
};
