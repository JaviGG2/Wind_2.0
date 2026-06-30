const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const nodemailer = require('nodemailer');
const { contieneMalasPalabras } = require('../utils/filter');

const ESTILOS_AVATAR = ['avataaars', 'adventurer', 'shapes', 'lorelei', 'bottts', 'identicon', 'open-peeps', 'pixel-art', 'fun-emoji'];

let _createAvatar, _estilos = {};
async function initDicebear() {
    if (_createAvatar) return;
    const core = await import('@dicebear/core');
    _createAvatar = core.createAvatar;
    const mods = await Promise.all([
        import('@dicebear/avataaars'),
        import('@dicebear/adventurer'),
        import('@dicebear/shapes'),
        import('@dicebear/lorelei'),
        import('@dicebear/bottts'),
        import('@dicebear/identicon'),
        import('@dicebear/open-peeps'),
        import('@dicebear/pixel-art'),
        import('@dicebear/fun-emoji')
    ]);
    ESTILOS_AVATAR.forEach((nombre, i) => _estilos[nombre] = mods[i]);
}

async function generarAvatarSVG(seed, estilo = 'avataaars') {
    if (!ESTILOS_AVATAR.includes(estilo)) estilo = 'avataaars';
    await initDicebear();
    const avatarSvg = _createAvatar(_estilos[estilo], { seed });
    return `data:image/svg+xml;base64,${Buffer.from(avatarSvg.toString()).toString('base64')}`;
}

const CORREO_USER = (process.env.CORREO_EMISOR || '').trim();
const CORREO_PASS = (process.env.CORREO_PASSWORD || '').replace(/\s+/g, '');
const SENDGRID_KEY = (process.env.SENDGRID_API_KEY || '').trim();
const sgMail = SENDGRID_KEY ? require('@sendgrid/mail') : null;
if (sgMail) sgMail.setApiKey(SENDGRID_KEY);

async function enviarCorreo(destino, asunto, html) {
    if (sgMail) {
        await sgMail.send({
            to: destino,
            from: { email: CORREO_USER, name: 'Wind' },
            subject: asunto,
            html: html
        });
        return;
    }

    const transportador = nodemailer.createTransport(
        process.env.SMTP_HOST
            ? {
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT, 10) || 587,
                secure: (process.env.SMTP_PORT || '587') === '465',
                auth: {
                    user: process.env.SMTP_USER || CORREO_USER,
                    pass: process.env.SMTP_PASS || CORREO_PASS
                }
            }
            : {
                service: 'gmail',
                auth: { user: CORREO_USER, pass: CORREO_PASS },
                tls: { rejectUnauthorized: false }
            }
    );
    await transportador.sendMail({
        from: `"Wind - Ciudad del Viento" <${CORREO_USER}>`,
        to: destino,
        replyTo: CORREO_USER,
        subject: asunto,
        html: html
    });
}

exports.registro = async (req, res) => {
    const { nombre, username, correo, contrasena } = req.body;

    if (!nombre || !username || !correo || !contrasena) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    if (contrasena.length < 6) {
        return res.status(400).json({ mensaje: 'La contraseña debe tener mínimo 6 caracteres.' });
    }
    if (!/[A-Z]/.test(contrasena)) {
        return res.status(400).json({ mensaje: 'La contraseña debe contener al menos una mayúscula.' });
    }
    if (!/[0-9]/.test(contrasena)) {
        return res.status(400).json({ mensaje: 'La contraseña debe contener al menos un número.' });
    }
    if (!/[^a-zA-Z0-9\s]/.test(contrasena)) {
        return res.status(400).json({ mensaje: 'La contraseña debe contener al menos un carácter especial.' });
    }

    if (contieneMalasPalabras(nombre, username)) {
        return res.status(400).json({ mensaje: 'Por favor, revisa tu texto y evita lenguaje ofensivo.' });
    }

    try {
        const contrasenaEncriptada = await bcrypt.hash(contrasena, 10);
        
        const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();

        const avatarUri = await generarAvatarSVG(username);
        const consultaSQL = `
            INSERT INTO usuarios (nombre, username, correo, contrasena, rol, codigo_verificacion, cuenta_activa, imagen_perfil)
            VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7)
        `;
        const valores = [nombre, username, correo, contrasenaEncriptada, 'Natural', codigoVerificacion, avatarUri];

        await db.query(consultaSQL, valores);

        const asunto = `${codigoVerificacion} es tu código de verificación en Wind`;
        const htmlCorreo = `
            <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 0;">
                <div style="background: #FF4500; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: #fff; margin: 0; font-size: 24px;">Wind</h1>
                </div>
                <div style="background: #fff; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <h2 style="color: #111; margin: 0 0 12px;">Hola, ${nombre}</h2>
                    <p style="color: #555; line-height: 1.6; margin: 0 0 20px;">Usa este código para activar tu cuenta en Wind. Es válido por 10 minutos.</p>
                    <div style="background: #fff5f0; border: 2px dashed #FF4500; padding: 16px; text-align: center; border-radius: 12px; margin: 0 0 20px;">
                        <span style="font-size: 36px; letter-spacing: 8px; font-weight: 800; color: #FF4500;">${codigoVerificacion}</span>
                    </div>
                    <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">Si no pediste este código, ignorá este mensaje.</p>
                </div>
            </div>
        `;

        try {
            await enviarCorreo(correo, asunto, htmlCorreo);
            return res.status(201).json({ 
                mensaje: 'Usuario registrado. Revisa tu bandeja de entrada.',
                requiereVerificacion: true,
                correo: correo
            });
        } catch (errorMail) {
            console.warn('⚠️ Falló el envío del correo');
            if (errorMail?.response?.body) console.error('   SendGrid:', JSON.stringify(errorMail.response.body));
            else if (errorMail?.message) console.error('   Error:', errorMail.message);
            if (errorMail?.code) console.error('   Código:', errorMail.code);
            console.log('   Código generado (bypass):', codigoVerificacion);
            return res.status(201).json({
                mensaje: 'Registro exitoso (Modo Desarrollo Activo).',
                requiereVerificacion: true,
                correo: correo,
                codigoBypass: codigoVerificacion
            });
        }
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ mensaje: 'El correo electrónico o el nombre de usuario ya está registrado.' });
        }
        console.error('Error en el servidor al insertar usuario:', error);
        return res.status(500).json({ mensaje: 'Error interno de la aplicación. Inténtelo más tarde.' });
    }
};

exports.verificarCodigo = async (req, res) => {
    const { correo, codigo } = req.body;

    if (!correo || !codigo) {
        return res.status(400).json({ mensaje: 'El correo y el código son requeridos.' });
    }

    try {
        const resultadoBD = await db.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);

        if (resultadoBD.rows.length === 0) {
            return res.status(404).json({ mensaje: 'El usuario especificado no existe.' });
        }

        const usuario = resultadoBD.rows[0];

        if (usuario.codigo_verificacion !== codigo.trim()) {
            return res.status(400).json({ mensaje: 'El código de verificación es incorrecto o expiró.' });
        }

        await db.query(
            'UPDATE usuarios SET cuenta_activa = TRUE, codigo_verificacion = NULL WHERE id = $1',
            [usuario.id]
        );

        return res.status(200).json({ 
            mensaje: '¡Tu cuenta ha sido activada con éxito! Ya puedes iniciar sesión.' 
        });

    } catch (error) {
        console.error('Error al verificar el código:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor al procesar la verificación.' });
    }
};

exports.login = async (req, res) => {
    const { correo, username, contrasena } = req.body;
    const identificador = correo || username;

    if (!identificador || !contrasena) {
        return res.status(400).json({ mensaje: 'El correo/usuario y la contraseña son obligatorios.' });
    }

    try {
        const consultaSQL = correo
            ? 'SELECT * FROM usuarios WHERE correo = $1'
            : 'SELECT * FROM usuarios WHERE username = $1';
        const resultadoBD = await db.query(consultaSQL, [identificador]);

        if (resultadoBD.rows.length === 0) {
            return res.status(401).json({ mensaje: 'El correo o la contraseña son incorrectos.' });
        }

        const usuario = resultadoBD.rows[0];
        const contrasenaCorrecta = await bcrypt.compare(contrasena, usuario.contrasena);

        if (!contrasenaCorrecta) {
            return res.status(401).json({ mensaje: 'El correo o la contraseña son incorrectos.' });
        }

        
        if (!usuario.cuenta_activa) {
            return res.status(403).json({ 
                mensaje: 'Tu cuenta está registrada pero aún no ha sido activada.',
                requiereVerificacion: true,
                correo: usuario.correo
            });
        }

        const sessionToken = crypto.randomUUID();
        await db.query('UPDATE usuarios SET session_token = $1 WHERE id = $2', [sessionToken, usuario.id]);

        req.session.usuario = {
            id: usuario.id,
            nombre: usuario.nombre,
            username: usuario.username,
            correo: usuario.correo,
            rol: usuario.rol
        };
        req.session.usuarioId = usuario.id;
        req.session.nombre = usuario.nombre;
        req.session.rol = usuario.rol;
        req.session.session_token = sessionToken;

        return res.status(200).json({
            mensaje: `¡Bienvenido de vuelta, ${usuario.nombre}!`,
            usuario: req.session.usuario
        });

    } catch (error) {
        console.error('Error en el servidor durante el login:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

exports.perfil = async (req, res) => {
    console.debug('[authController.perfil] session:', req.session);

    if (!req.session.usuario && !req.session.usuarioId) {
        return res.status(401).json({ mensaje: 'No autorizado. Inicie sesión.' });
    }

    const usuarioId = req.session.usuario?.id || req.session.usuarioId;

    try {
        let extra = {};
        let result;
        try {
            result = await db.query(
                'SELECT correo, puntos, imagen_perfil, avatar_fondo FROM usuarios WHERE id = $1',
                [usuarioId]
            );
        } catch (error) {
            if (error.code === '42703') {
                result = await db.query(
                    'SELECT puntos FROM usuarios WHERE id = $1',
                    [usuarioId]
                );
            } else {
                throw error;
            }
        }
        extra = result.rows[0] || {};

        if (!extra.imagen_perfil) {
            const username = req.session.usuario?.username || req.session.nombre || `user-${usuarioId}`;
            const avatarUri = await generarAvatarSVG(username);
            await db.query('UPDATE usuarios SET imagen_perfil = $1 WHERE id = $2', [avatarUri, usuarioId]);
            extra.imagen_perfil = avatarUri;
        }

        return res.json({
            id: usuarioId,
            nombre: req.session.usuario?.nombre || req.session.nombre,
            username: req.session.usuario?.username || null,
            correo: extra.correo || null,
            rol: req.session.usuario?.rol || req.session.rol,
            puntos: extra.puntos || 0,
            imagen_perfil: extra.imagen_perfil || null,
            avatar_fondo: extra.avatar_fondo || '#e8e8e8'
        });
    } catch (error) {
        console.error('Error al obtener perfil extendido:', error);
        return res.json({
            id: usuarioId,
            nombre: req.session.usuario?.nombre || req.session.nombre,
            username: req.session.usuario?.username || null,
            correo: null,
            rol: req.session.usuario?.rol || req.session.rol,
            puntos: 0,
            imagen_perfil: null
        });
    }
};

exports.actualizarFotoPerfil = async (req, res) => {
    if (!req.session.usuarioId) {
        return res.status(401).json({ mensaje: 'Debes iniciar sesión.' });
    }

    if (!req.file) {
        return res.status(400).json({ mensaje: 'No se recibió ninguna imagen.' });
    }

    try {
        const { subirASupabase } = require('../middlewares/subidaImagen');
        const rutaImagen = await subirASupabase(req.file, 'perfiles');

        await db.query(
            'UPDATE usuarios SET imagen_perfil = $1 WHERE id = $2',
            [rutaImagen, req.session.usuarioId]
        );
        return res.json({ mensaje: 'Foto de perfil actualizada.', imagen_perfil: rutaImagen });
    } catch (error) {
        console.error('Error al actualizar foto de perfil:', error);
        return res.status(500).json({ mensaje: 'Error al guardar la foto de perfil.' });
    }
};

exports.generarAvatar = async (req, res) => {
    if (!req.session.usuarioId) {
        return res.status(401).json({ mensaje: 'Debes iniciar sesión.' });
    }
    try {
        const estilo = req.body?.estilo || 'avataaars';
        const seed = `${req.session.usuario?.username || 'user'}-${Date.now()}`;
        const dataUri = await generarAvatarSVG(seed, estilo);
        const color = req.body?.color_fondo || '#e8e8e8';

        await db.query(
            'UPDATE usuarios SET imagen_perfil = $1, avatar_fondo = $2 WHERE id = $3',
            [dataUri, color, req.session.usuarioId]
        );
        return res.json({ mensaje: 'Avatar generado.', imagen_perfil: dataUri, avatar_fondo: color });
    } catch (error) {
        console.error('Error al generar avatar:', error);
        return res.status(500).json({ mensaje: 'Error al generar el avatar.' });
    }
};

exports.generarPreviews = async (req, res) => {
    const estilo = req.query.estilo || 'avataaars';
    const count = Math.min(parseInt(req.query.count) || 12, 24);
    try {
        const previews = await Promise.all(
            Array.from({ length: count }, async (_, i) => {
                const seed = `preview-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
                const dataUri = await generarAvatarSVG(seed, estilo);
                return { seed, dataUri, estilo };
            })
        );
        return res.json({ previews, estilo });
    } catch (error) {
        console.error('Error al generar previews:', error);
        return res.status(500).json({ mensaje: 'Error al generar previews.' });
    }
};

exports.seleccionarAvatar = async (req, res) => {
    if (!req.session.usuarioId) {
        return res.status(401).json({ mensaje: 'Debes iniciar sesión.' });
    }
    const { seed, estilo, color_fondo } = req.body;
    if (!seed || !estilo) {
        return res.status(400).json({ mensaje: 'Faltan seed o estilo.' });
    }
    try {
        const dataUri = await generarAvatarSVG(seed, estilo);
        const color = color_fondo || '#e8e8e8';
        await db.query(
            'UPDATE usuarios SET imagen_perfil = $1, avatar_fondo = $2 WHERE id = $3',
            [dataUri, color, req.session.usuarioId]
        );
        return res.json({ mensaje: 'Avatar actualizado.', imagen_perfil: dataUri, avatar_fondo: color });
    } catch (error) {
        console.error('Error al seleccionar avatar:', error);
        return res.status(500).json({ mensaje: 'Error al seleccionar avatar.' });
    }
};

exports.cambiarColorAvatar = async (req, res) => {
    if (!req.session.usuarioId) {
        return res.status(401).json({ mensaje: 'Debes iniciar sesión.' });
    }
    const { color_fondo } = req.body;
    if (!color_fondo || !/^#[0-9a-fA-F]{6}$/.test(color_fondo)) {
        return res.status(400).json({ mensaje: 'Color inválido. Usa formato hex #RRGGBB.' });
    }
    try {
        await db.query(
            'UPDATE usuarios SET avatar_fondo = $1 WHERE id = $2',
            [color_fondo, req.session.usuarioId]
        );
        return res.json({ mensaje: 'Color de fondo actualizado.', avatar_fondo: color_fondo });
    } catch (error) {
        console.error('Error al cambiar color de avatar:', error);
        return res.status(500).json({ mensaje: 'Error al actualizar el color.' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ mensaje: 'No se pudo cerrar la sesión.' });
        res.clearCookie('connect.sid', { path: '/' });
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.json({ mensaje: 'Sesión destruida con éxito.' });
    });
};

exports.solicitarRecuperacion = async (req, res) => {
    const { correo } = req.body;
    if (!correo) return res.status(400).json({ mensaje: 'El correo es obligatorio.' });

    try {
        const existe = await db.query('SELECT id FROM usuarios WHERE correo = $1', [correo]);
        if (existe.rows.length === 0) {
            return res.json({ mensaje: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiracion = new Date(Date.now() + 3600000);

        await db.query(
            'UPDATE usuarios SET reset_token = $1, reset_token_expiracion = $2 WHERE correo = $3',
            [token, expiracion, correo]
        );

        const enlace = `${req.protocol}://${req.get('host')}/restablecer-contrasena?token=${token}`;

        try {
            await enviarCorreo(
                correo,
                'Recupera tu contraseña - Wind',
                `<p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
                 <p>Haz clic en el siguiente enlace para crear una nueva contraseña (válido por 1 hora):</p>
                 <p><a href="${enlace}" style="display:inline-block;padding:12px 24px;background:#ff4500;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Restablecer contraseña</a></p>
                 <p>Si no solicitaste esto, ignora este correo.</p>`
            );
        } catch (err) {
            console.error('Error al enviar correo de recuperación:', err.message);
        }

        res.json({ mensaje: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' });
    } catch (error) {
        console.error('Error en solicitarRecuperacion:', error);
        res.status(500).json({ mensaje: 'Error al procesar la solicitud.' });
    }
};

exports.restablecerContrasena = async (req, res) => {
    const { token, contrasena } = req.body;
    if (!token || !contrasena) {
        return res.status(400).json({ mensaje: 'Token y contraseña son obligatorios.' });
    }

    if (contrasena.length < 6) {
        return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    try {
        const resultado = await db.query(
            'SELECT id FROM usuarios WHERE reset_token = $1 AND reset_token_expiracion > NOW()',
            [token]
        );

        if (resultado.rows.length === 0) {
            return res.status(400).json({ mensaje: 'El enlace no es válido o ha expirado.' });
        }

        const hash = await bcrypt.hash(contrasena, 10);
        await db.query(
            'UPDATE usuarios SET contrasena = $1, reset_token = NULL, reset_token_expiracion = NULL WHERE id = $2',
            [hash, resultado.rows[0].id]
        );

        res.json({ mensaje: 'Contraseña restablecida con éxito. Ahora puedes iniciar sesión.' });
    } catch (error) {
        console.error('Error en restablecerContrasena:', error);
        res.status(500).json({ mensaje: 'Error al restablecer la contraseña.' });
    }
};

exports.actualizarNombre = async (req, res) => {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ mensaje: 'El nombre es obligatorio.' });
    }
    if (contieneMalasPalabras(nombre)) {
        return res.status(400).json({ mensaje: 'Por favor, revisa tu texto y evita lenguaje ofensivo.' });
    }
    try {
        await db.query('UPDATE usuarios SET nombre = $1 WHERE id = $2', [nombre.trim(), req.session.usuarioId]);
        req.session.nombre = nombre.trim();
        if (req.session.usuario) req.session.usuario.nombre = nombre.trim();
        res.json({ mensaje: 'Nombre actualizado con éxito.', nombre: nombre.trim() });
    } catch (error) {
        console.error('Error en actualizarNombre:', error);
        res.status(500).json({ mensaje: 'Error al actualizar el nombre.' });
    }
};

exports.actualizarUsername = async (req, res) => {
    const { username } = req.body;
    if (!username || !username.trim()) {
        return res.status(400).json({ mensaje: 'El nombre de usuario es obligatorio.' });
    }
    const usernameLimpio = username.trim().toLowerCase();
    if (contieneMalasPalabras(usernameLimpio)) {
        return res.status(400).json({ mensaje: 'Por favor, revisa tu texto y evita lenguaje ofensivo.' });
    }
    if (usernameLimpio.length < 3) {
        return res.status(400).json({ mensaje: 'El nombre de usuario debe tener al menos 3 caracteres.' });
    }
    if (!/^[a-z0-9_]+$/.test(usernameLimpio)) {
        return res.status(400).json({ mensaje: 'Solo letras minúsculas, números y guión bajo.' });
    }
    try {
        const existe = await db.query('SELECT id FROM usuarios WHERE username = $1 AND id != $2', [usernameLimpio, req.session.usuarioId]);
        if (existe.rows.length > 0) {
            return res.status(400).json({ mensaje: 'Ese nombre de usuario ya está en uso.' });
        }
        await db.query('UPDATE usuarios SET username = $1 WHERE id = $2', [usernameLimpio, req.session.usuarioId]);
        if (req.session.usuario) req.session.usuario.username = usernameLimpio;
        res.json({ mensaje: 'Nombre de usuario actualizado con éxito.', username: usernameLimpio });
    } catch (error) {
        console.error('Error en actualizarUsername:', error);
        res.status(500).json({ mensaje: 'Error al actualizar el nombre de usuario.' });
    }
};

exports.cambiarContrasena = async (req, res) => {
    const { contrasenaActual, nuevaContrasena } = req.body;
    if (!contrasenaActual || !nuevaContrasena) {
        return res.status(400).json({ mensaje: 'Ambas contraseñas son obligatorias.' });
    }
    if (nuevaContrasena.length < 6) {
        return res.status(400).json({ mensaje: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }
    try {
        const result = await db.query('SELECT contrasena FROM usuarios WHERE id = $1', [req.session.usuarioId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }
        const valida = await bcrypt.compare(contrasenaActual, result.rows[0].contrasena);
        if (!valida) {
            return res.status(400).json({ mensaje: 'La contraseña actual no es correcta.' });
        }
        const hash = await bcrypt.hash(nuevaContrasena, 10);
        await db.query('UPDATE usuarios SET contrasena = $1 WHERE id = $2', [hash, req.session.usuarioId]);
        res.json({ mensaje: 'Contraseña cambiada con éxito.' });
    } catch (error) {
        console.error('Error en cambiarContrasena:', error);
        res.status(500).json({ mensaje: 'Error al cambiar la contraseña.' });
    }
};