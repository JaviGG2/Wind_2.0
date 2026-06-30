const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// ===== EDIT AQUI TU NOTIFICACION =====
const NOTIFICACION = {
  titulo: 'Wind Update',
  mensaje: 'Se agragaron muchos mas estilos de Avatares. Se mejoro el Diseño en varios apartados',
  enlace: '/select-avatar'
};
//node scripts/enviar-notificacion.js

// ===== NO TOCAR DEBAJO =====

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const usuarios = await pool.query(
      'SELECT id FROM usuarios WHERE cuenta_activa = true'
    );

    if (usuarios.rows.length === 0) {
      console.log('No hay usuarios activos.');
      await pool.end();
      return;
    }

    for (const u of usuarios.rows) {
      await pool.query(
        'INSERT INTO notificaciones (usuario_id, titulo, mensaje, enlace) VALUES ($1, $2, $3, $4)',
        [u.id, NOTIFICACION.titulo, NOTIFICACION.mensaje, NOTIFICACION.enlace]
      );
    }

    console.log(`Notificación enviada a ${usuarios.rows.length} usuario(s).`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
})();
