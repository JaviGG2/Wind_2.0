// middlewares/autenticacion.js

exports.verificarSesion = (req, res, next) => {
    if (req.session && req.session.usuarioId) {
        return next();
    }
    return res.redirect('/login');
};

exports.esEspecialista = (req, res, next) => {
    if (req.session && req.session.usuarioId && req.session.rol === 'Especialista') {
        return next();
    }
    return res.redirect('/login');
};
