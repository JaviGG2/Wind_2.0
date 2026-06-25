const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const nodemailer = require('nodemailer');

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

    try {
        const contrasenaEncriptada = await bcrypt.hash(contrasena, 10);
        
        const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();

        const consultaSQL = `
            INSERT INTO usuarios (nombre, username, correo, contrasena, rol, codigo_verificacion, cuenta_activa)
            VALUES ($1, $2, $3, $4, $5, $6, FALSE)
        `;
        const valores = [nombre, username, correo, contrasenaEncriptada, 'Natural', codigoVerificacion];

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
                'SELECT puntos, imagen_perfil FROM usuarios WHERE id = $1',
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

        return res.json({
            id: usuarioId,
            nombre: req.session.usuario?.nombre || req.session.nombre,
            username: req.session.usuario?.username || null,
            rol: req.session.usuario?.rol || req.session.rol,
            puntos: extra.puntos || 0,
            imagen_perfil: extra.imagen_perfil || null
        });
    } catch (error) {
        console.error('Error al obtener perfil extendido:', error);
        return res.json({
            id: usuarioId,
            nombre: req.session.usuario?.nombre || req.session.nombre,
            username: req.session.usuario?.username || null,
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
        const { subirAImagekit } = require('../middlewares/subidaImagen');
        const rutaImagen = await subirAImagekit(req.file, 'perfiles');

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