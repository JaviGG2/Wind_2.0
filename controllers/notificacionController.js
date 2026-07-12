const db = require('../config/db');

exports.crear = async ({ creadorId, titulo, mensaje, enlace, soloSeguidores }) => {
    try {
        let usuarios;
        if (soloSeguidores) {
            usuarios = await db.query(
                `SELECT u.id FROM usuarios u
                 JOIN seguidores s ON s.seguidor_id = u.id
                 WHERE s.siguiendo_id = $1 AND u.cuenta_activa = true`,
                [creadorId]
            );
        } else {
            usuarios = await db.query(
                'SELECT id FROM usuarios WHERE id != $1 AND cuenta_activa = true',
                [creadorId]
            );
        }
        if (usuarios.rows.length === 0) return;

        const values = usuarios.rows.map(u =>
            `(${u.id}, '${titulo.replace(/'/g, "''")}', '${mensaje.replace(/'/g, "''")}', '${enlace.replace(/'/g, "''")}', NOW())`
        ).join(',');
        await db.query(`INSERT INTO notificaciones (usuario_id, titulo, mensaje, enlace, fecha_creacion) VALUES ${values}`);
    } catch (error) {
        console.error('Error creando notificación:', error.message);
    }
};

exports.crearParaUsuario = async ({ usuarioId, titulo, mensaje, enlace }) => {
    try {
        await db.query(
            'INSERT INTO notificaciones (usuario_id, titulo, mensaje, enlace, fecha_creacion) VALUES ($1, $2, $3, $4, NOW())',
            [usuarioId, titulo, mensaje, enlace]
        );
    } catch (error) {
        console.error('Error creando notificación para usuario:', error.message);
    }
};

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

exports.vaciar = async (req, res) => {
  try {
    await db.query(
      'DELETE FROM notificaciones WHERE usuario_id = $1',
      [req.session.usuarioId]
    );
    res.json({ mensaje: 'Notificaciones eliminadas.' });
  } catch (error) {
    console.error('Error al vaciar notificaciones:', error.message);
    res.status(500).json({ mensaje: 'Error al vaciar notificaciones.' });
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
