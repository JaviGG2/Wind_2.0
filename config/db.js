const { Pool } = require('pg'); // Asegúrate de usar llaves { Pool } y no paréntesis
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Esto es obligatorio para conectar con Neon de forma segura
    }
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error crítico al conectar con Neon.tech:', err.stack);
    }
    console.log('¡Éxito! Conectado correctamente al servidor PostgreSQL en Neon.');
    release();
});

module.exports = {
    query: (text, params) => pool.query(text, params)
};