const db = require('../config/db');
const notificacion = require('./notificacionController');

exports.toggleSeguir = async (req, res) => {
  if (!req.session.usuarioId) return res.status(401).json({ mensaje: 'Debes iniciar sesión.' });
  const siguiendoId = parseInt(req.params.id, 10);
  if (Number.isNaN(siguiendoId)) return res.status(400).json({ mensaje: 'ID inválido.' });
  if (siguiendoId === req.session.usuarioId) return res.status(400).json({ mensaje: 'No puedes seguirte a ti mismo.' });

  try {
    const existente = await db.query(
      'SELECT id FROM seguidores WHERE seguidor_id = $1 AND siguiendo_id = $2',
      [req.session.usuarioId, siguiendoId]
    );

    if (existente.rows.length > 0) {
      await db.query('DELETE FROM seguidores WHERE seguidor_id = $1 AND siguiendo_id = $2',
        [req.session.usuarioId, siguiendoId]);
      return res.json({ siguiendo: false, mensaje: 'Dejaste de seguir a este usuario.' });
    }

    await db.query('INSERT INTO seguidores (seguidor_id, siguiendo_id) VALUES ($1, $2)',
      [req.session.usuarioId, siguiendoId]);

    const user = await db.query('SELECT nombre FROM usuarios WHERE id = $1', [req.session.usuarioId]);
    notificacion.crearParaUsuario({
      usuarioId: siguiendoId,
      titulo: 'Nuevo seguidor',
      mensaje: `${user.rows[0]?.nombre || 'Alguien'} empezó a seguirte.`,
      enlace: `/ver-perfil?id=${req.session.usuarioId}`
    });

    return res.json({ siguiendo: true, mensaje: 'Ahora sigues a este usuario.' });
  } catch (error) {
    console.error('Error en toggleSeguir:', error.message);
    return res.status(500).json({ mensaje: 'Error al procesar la solicitud.' });
  }
};

exports.obtenerSeguidores = async (req, res) => {
  const usuarioId = parseInt(req.params.id, 10);
  if (Number.isNaN(usuarioId)) return res.status(400).json({ mensaje: 'ID inválido.' });
  try {
    const result = await db.query(
      `SELECT u.id, u.nombre, u.username, u.imagen_perfil, u.avatar_fondo, s.fecha_seguido
       FROM seguidores s JOIN usuarios u ON s.seguidor_id = u.id
       WHERE s.siguiendo_id = $1 ORDER BY s.fecha_seguido DESC`,
      [usuarioId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener seguidores:', error.message);
    res.status(500).json({ mensaje: 'Error al cargar seguidores.' });
  }
};

exports.obteniendoSigo = async (req, res) => {
  const usuarioId = parseInt(req.params.id, 10);
  if (Number.isNaN(usuarioId)) return res.status(400).json({ mensaje: 'ID inválido.' });
  try {
    const result = await db.query(
      `SELECT u.id, u.nombre, u.username, u.imagen_perfil, u.avatar_fondo, s.fecha_seguido
       FROM seguidores s JOIN usuarios u ON s.siguiendo_id = u.id
       WHERE s.seguidor_id = $1 ORDER BY s.fecha_seguido DESC`,
      [usuarioId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obteniendo siguiendo:', error.message);
    res.status(500).json({ mensaje: 'Error al cargar seguidos.' });
  }
};
