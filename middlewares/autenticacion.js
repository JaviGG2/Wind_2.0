const db = require('../config/db');

exports.verificarSesion = (req, res, next) => {
    if (!req.session || !req.session.usuarioId) {
        const acceptsJson = req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1);
        return acceptsJson
            ? res.status(401).json({ mensaje: 'No autenticado' })
            : res.redirect('/login');
    }
    next();
};

exports.esEspecialista = async (req, res, next) => {
    if (!req.session || !req.session.usuarioId) {
        return res.redirect('/login');
    }
    try {
        const result = await db.query('SELECT rol FROM usuarios WHERE id = $1', [req.session.usuarioId]);
        if (result.rows.length > 0 && result.rows[0].rol === 'Especialista') {
            req.session.rol = 'Especialista';
            return next();
        }
    } catch (e) {
        console.error('Error al verificar rol:', e.message);
    }
    const acceptsJson = req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1);
    return acceptsJson
        ? res.status(403).json({ mensaje: 'Se requieren permisos de Especialista.' })
        : res.redirect('/login');
};

exports.verificarRolDesdeDB = async (req) => {
    if (!req.session || !req.session.usuarioId) return false;
    try {
        const result = await db.query('SELECT rol FROM usuarios WHERE id = $1', [req.session.usuarioId]);
        if (result.rows.length > 0) {
            req.session.rol = result.rows[0].rol;
            return result.rows[0].rol === 'Especialista';
        }
    } catch (e) {
        console.error('Error al verificar rol:', e.message);
    }
    return false;
};
