const db = require('../config/db');

exports.listar = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, titulo, mensaje, enlace, leida, fecha_creacion FROM notificaciones WHERE usuario_id = $1 ORDER BY fecha_creacion DESC LIMIT 50',
      [req.session.usuarioId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al listar notificaciones:', error.message);
    res.status(500).json({ mensaje: 'Error al cargar notificaciones.' });
  }
};

exports.noLeidas = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT COUNT(*) AS total FROM notificaciones WHERE usuario_id = $1 AND leida = false',
      [req.session.usuarioId]
    );
    res.json({ total: parseInt(result.rows[0].total, 10) });
  } catch (error) {
    console.error('Error al contar notificaciones:', error.message);
    res.status(500).json({ mensaje: 'Error al contar notificaciones.' });
  }
};

exports.marcarLeida = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ mensaje: 'ID inválido.' });
  try {
    await db.query(
      'UPDATE notificaciones SET leida = true WHERE id = $1 AND usuario_id = $2',
      [id, req.session.usuarioId]
    );
    res.json({ mensaje: 'Notificación marcada como leída.' });
  } catch (error) {
    console.error('Error al marcar notificación:', error.message);
    res.status(500).json({ mensaje: 'Error al marcar notificación.' });
  }
};

exports.marcarTodasLeidas = async (req, res) => {
  try {
    await db.query(
      'UPDATE notificaciones SET leida = true WHERE usuario_id = $1 AND leida = false',
      [req.session.usuarioId]
    );
    res.json({ mensaje: 'Todas las notificaciones marcadas como leídas.' });
  } catch (error) {
    console.error('Error al marcar todas:', error.message);
    res.status(500).json({ mensaje: 'Error al marcar notificaciones.' });
  }
};
