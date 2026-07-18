exports.verificarSesion = (req, res, next) => {
    if (!req.session || !req.session.usuarioId) {
        const acceptsJson = req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1);
        return acceptsJson
            ? res.status(401).json({ mensaje: 'No autenticado' })
            : res.redirect('/login');
    }

    next();
};

exports.esEspecialista = (req, res, next) => {
    if (req.session && req.session.usuarioId && req.session.rol === 'Especialista') {
        return next();
    }
    return res.redirect('/login');
};
