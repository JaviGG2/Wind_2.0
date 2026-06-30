const db = require('../config/db');
const notificacion = require('./notificacionController');

exports.listarModulos = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.id, m.nombre, m.descripcion, m.id_usuario, u.nombre AS creador_nombre,
              (SELECT COUNT(*) FROM nivel WHERE id_modulo = m.id) AS total_niveles
       FROM modulo_juegos m
       JOIN usuarios u ON m.id_usuario = u.id
       ORDER BY m.id DESC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error al listar módulos:', error.message);
    return res.status(500).json({ mensaje: 'Error al cargar módulos.' });
  }
};

exports.obtenerModulo = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ mensaje: 'ID inválido.' });
  const usuarioId = req.session.usuarioId || null;

  try {
    const modResult = await db.query(
      `SELECT m.*, u.nombre AS creador_nombre FROM modulo_juegos m
       JOIN usuarios u ON m.id_usuario = u.id WHERE m.id = $1`, [id]
    );
    if (modResult.rows.length === 0) return res.status(404).json({ mensaje: 'Módulo no encontrado.' });

    const nivelesResult = await db.query(
      `SELECT n.id, n.nombre, n.descripcion, n.id_juego, n.orden,
              j.pregunta, j.tipo, j.puntos_recompensa,
              COALESCE(pm.completado, false) AS completado,
              COALESCE(pm.puntos_obtenidos, 0) AS puntos_obtenidos
       FROM nivel n
       LEFT JOIN juegos j ON n.id_juego = j.id
       LEFT JOIN progreso_modulo pm ON pm.nivel_id = n.id AND pm.usuario_id = $2
       WHERE n.id_modulo = $1
       ORDER BY n.orden ASC`,
      [id, usuarioId || 0]
    );

    const niveles = nivelesResult.rows;
    let bloqueado = false;
    const nivelesConEstado = niveles.map((n, i) => {
      if (i === 0) bloqueado = false;
      const estado = bloqueado ? 'bloqueado' : (n.completado ? 'completado' : 'disponible');
      if (i === 0 || n.completado) bloqueado = false;
      else if (!n.completado) bloqueado = true;
      return { ...n, estado };
    });

    return res.json({ ...modResult.rows[0], niveles: nivelesConEstado });
  } catch (error) {
    console.error('Error al obtener módulo:', error.message);
    return res.status(500).json({ mensaje: 'Error al cargar módulo.' });
  }
};

exports.misModulos = async (req, res) => {
  if (!req.session.usuarioId) return res.status(401).json({ mensaje: 'No autorizado.' });
  try {
    const result = await db.query(
      `SELECT m.id, m.nombre, m.descripcion,
              (SELECT COUNT(*) FROM nivel WHERE id_modulo = m.id) AS total_niveles
       FROM modulo_juegos m WHERE m.id_usuario = $1 ORDER BY m.id DESC`,
      [req.session.usuarioId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error al listar mis módulos:', error.message);
    return res.status(500).json({ mensaje: 'Error al cargar módulos.' });
  }
};

exports.crearModulo = async (req, res) => {
  if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
    return res.status(403).json({ mensaje: 'Acceso denegado.' });
  }
  const { nombre, descripcion } = req.body;
  if (!nombre || !nombre.trim()) return res.status(400).json({ mensaje: 'El nombre es obligatorio.' });

  try {
    const result = await db.query(
      'INSERT INTO modulo_juegos (id_usuario, nombre, descripcion) VALUES ($1, $2, $3) RETURNING id',
      [req.session.usuarioId, nombre.trim(), descripcion || '']
    );
    const moduloId = result.rows[0].id;
    notificacion.crear({
      creadorId: req.session.usuarioId,
      titulo: 'Nuevo módulo de juegos',
      mensaje: `"${nombre.trim()}" está disponible.`,
      enlace: `/modulos/${moduloId}`
    });
    return res.status(201).json({ mensaje: 'Módulo creado.', id: moduloId });
  } catch (error) {
    console.error('Error al crear módulo:', error.message);
    return res.status(500).json({ mensaje: 'Error al crear módulo.' });
  }
};

exports.agregarNivel = async (req, res) => {
  if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
    return res.status(403).json({ mensaje: 'Acceso denegado.' });
  }
  const moduloId = parseInt(req.params.id, 10);
  const { nombre, descripcion, tipo, pregunta, opcion_a, opcion_b, opcion_c, correcta, puntos } = req.body;
  if (Number.isNaN(moduloId)) return res.status(400).json({ mensaje: 'ID inválido.' });
  if (!nombre || !nombre.trim() || !tipo) {
    return res.status(400).json({ mensaje: 'Nombre y tipo de juego son obligatorios.' });
  }
  if (!['Quiz', 'Memory', 'Match', 'Scramblee'].includes(tipo)) {
    return res.status(400).json({ mensaje: 'Tipo de juego inválido.' });
  }

  try {
    const juegoRes = await db.query(
      `INSERT INTO juegos (usuario_id, pregunta, opcion_a, opcion_b, opcion_c, opcion_correcta, tipo, puntos_recompensa)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [req.session.usuarioId, (pregunta || '').trim(), (opcion_a || '').trim(), (opcion_b || '').trim(), (opcion_c || '').trim(), (correcta || 'A').trim(), tipo, parseInt(puntos, 10) || 10]
    );
    const juegoId = juegoRes.rows[0].id;

    const maxOrden = await db.query('SELECT COALESCE(MAX(orden),0)+1 AS sig FROM nivel WHERE id_modulo = $1', [moduloId]);
    const sigOrden = maxOrden.rows[0].sig;
    await db.query(
      'INSERT INTO nivel (nombre, descripcion, id_juego, id_modulo, orden) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [nombre.trim(), descripcion || '', juegoId, moduloId, sigOrden]
    );
    notificacion.crear({
      creadorId: req.session.usuarioId,
      titulo: 'Nuevo nivel agregado',
      mensaje: `Se agregó "${nombre.trim()}" a un módulo.`,
      enlace: `/modulos/${moduloId}`
    });
    return res.status(201).json({ mensaje: 'Nivel y juego creados.' });
  } catch (error) {
    console.error('Error al agregar nivel:', error.message);
    return res.status(500).json({ mensaje: 'Error al agregar nivel.' });
  }
};

exports.eliminarNivel = async (req, res) => {
  if (!req.session.usuarioId || req.session.rol !== 'Especialista') {
    return res.status(403).json({ mensaje: 'Acceso denegado.' });
  }
  const nivelId = parseInt(req.params.nivelId, 10);
  if (Number.isNaN(nivelId)) return res.status(400).json({ mensaje: 'ID inválido.' });

  try {
    const nivel = await db.query('SELECT id_juego FROM nivel WHERE id = $1', [nivelId]);
    if (nivel.rows.length > 0) {
      await db.query('DELETE FROM nivel WHERE id = $1', [nivelId]);
      await db.query('DELETE FROM juegos WHERE id = $1', [nivel.rows[0].id_juego]);
    }
    return res.json({ mensaje: 'Nivel y juego eliminados.' });
  } catch (error) {
    console.error('Error al eliminar nivel:', error.message);
    return res.status(500).json({ mensaje: 'Error al eliminar nivel.' });
  }
};

exports.completarNivel = async (req, res) => {
  if (!req.session.usuarioId) return res.status(401).json({ mensaje: 'Debes iniciar sesión.' });
  const moduloId = parseInt(req.params.id, 10);
  const nivelId = parseInt(req.params.nivelId, 10);
  if (Number.isNaN(moduloId) || Number.isNaN(nivelId)) return res.status(400).json({ mensaje: 'ID inválido.' });

  try {
    const nivel = await db.query('SELECT id_juego FROM nivel WHERE id = $1 AND id_modulo = $2', [nivelId, moduloId]);
    if (nivel.rows.length === 0) return res.status(404).json({ mensaje: 'Nivel no encontrado.' });

    console.log(`[completarNivel] usuario=${req.session.usuarioId}, moduloId=${moduloId}, nivelId=${nivelId}, id_juego=${nivel.rows[0].id_juego}`);

    await db.query(
      `INSERT INTO historial_vistas (usuario_id, tipo_contenido, contenido_id)
       VALUES ($1, 'juego', $2)
       ON CONFLICT (usuario_id, tipo_contenido, contenido_id) DO UPDATE SET fecha_vista = NOW()`,
      [req.session.usuarioId, nivel.rows[0].id_juego]
    ).catch(() => {});

    const juego = await db.query('SELECT puntos_recompensa FROM juegos WHERE id = $1', [nivel.rows[0].id_juego]);
    const puntos = juego.rows[0]?.puntos_recompensa || 10;

    const existente = await db.query(
      'SELECT id, puntos_obtenidos FROM progreso_modulo WHERE usuario_id = $1 AND modulo_id = $2 AND nivel_id = $3',
      [req.session.usuarioId, moduloId, nivelId]
    );

    if (existente.rows.length > 0) {
      console.log(`[completarNivel] YA COMPLETADO: usuario=${req.session.usuarioId}, nivel=${nivelId}`);
      return res.json({ mensaje: 'Ya completaste este nivel.', puntos_obtenidos: existente.rows[0].puntos_obtenidos });
    }

    console.log(`[completarNivel] dando ${puntos} pts por nivel ${nivelId}`);

    await db.query(
      'INSERT INTO progreso_modulo (usuario_id, modulo_id, nivel_id, completado, puntos_obtenidos) VALUES ($1,$2,$3,true,$4)',
      [req.session.usuarioId, moduloId, nivelId, puntos]
    );

    await db.query('UPDATE usuarios SET puntos = COALESCE(puntos,0) + $1 WHERE id = $2', [puntos, req.session.usuarioId]);

    console.log(`[completarNivel] PUNTOS ACTUALIZADOS: +${puntos} para usuario ${req.session.usuarioId}`);

    return res.json({ mensaje: 'Nivel completado.', puntos_obtenidos: puntos });
  } catch (error) {
    console.error('Error al completar nivel:', error.message);
    return res.status(500).json({ mensaje: 'Error al completar nivel.' });
  }
};
