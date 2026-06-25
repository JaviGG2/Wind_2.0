const db = require('../config/db');

exports.verificarSesion = async (req, res, next) => {
    if (!req.session || !req.session.usuarioId) {
        const acceptsJson = req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1);
        return acceptsJson
            ? res.status(401).json({ mensaje: 'No autenticado' })
            : res.redirect('/login');
    }

    if (req.session.session_token) {
        try {
            const result = await db.query(
                'SELECT session_token FROM usuarios WHERE id = $1',
                [req.session.usuarioId]
            );
            if (result.rows.length === 0 || result.rows[0].session_token !== req.session.session_token) {
                req.session.destroy(() => {});
                const acceptsJson = req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1);
                return acceptsJson
                    ? res.status(401).json({ mensaje: 'Sesión expirada. Iniciaste sesión en otro dispositivo.' })
                    : res.redirect('/login?sesion_expirada=true');
            }
        } catch (e) {
            console.error('Error al verificar sesión única:', e.message);
        }
    }

    next();
};

exports.esEspecialista = (req, res, next) => {
    if (req.session && req.session.usuarioId && req.session.rol === 'Especialista') {
        return next();
    }
    return res.redirect('/login');
};
