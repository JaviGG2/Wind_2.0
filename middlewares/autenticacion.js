// middlewares/autenticacion.js

exports.verificarSesion = (req, res, next) => {
    if (req.session && req.session.usuarioId) {
        return next();
    }

    // Si la petición espera JSON (fetch/XHR o cabecera Accept), devolvemos 401 JSON
    const acceptsJson = req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1);
    if (acceptsJson) {
        return res.status(401).json({ mensaje: 'No autenticado' });
    }

    return res.redirect('/login');
};

exports.esEspecialista = (req, res, next) => {
    if (req.session && req.session.usuarioId && req.session.rol === 'Especialista') {
        return next();
    }
    return res.redirect('/login');
};
