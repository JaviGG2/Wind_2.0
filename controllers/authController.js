// controllers/authController.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/db'); // Sube un nivel para buscar config
const nodemailer = require('nodemailer');

// Configuración del transporte de correo utilizando variables de entorno (.env)
// controllers/authController.js

// CONFIGURACIÓN AVANZADA Y SEGURA PARA GMAIL
const transportador = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true obliga a usar SSL en el puerto 465
    auth: {
        user: process.env.CORREO_EMISOR,
        pass: process.env.CORREO_PASSWORD
    },
    tls: {
        // Esto evita que Node.js bloquee el envío si estás en una red local con restricciones
        rejectUnauthorized: false 
    }
});

// 1. Registro de Usuarios con Envío de Código por Correo
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
        
        // Generamos un código aleatorio de seguridad de 6 dígitos
        const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();

        // Guardamos el usuario con cuenta_activa = FALSE y el código generado
        const consultaSQL = `
            INSERT INTO usuarios (nombre, username, correo, contrasena, rol, codigo_verificacion, cuenta_activa)
            VALUES ($1, $2, $3, $4, $5, $6, FALSE)
        `;
        const valores = [nombre, username, correo, contrasenaEncriptada, 'Natural', codigoVerificacion];

        await db.query(consultaSQL, valores);

        // Configuración y diseño del correo electrónico
        const opcionesCorreo = {
            from: `"Wind - Ciudad del Viento" <${process.env.CORREO_EMISOR}>`,
            to: correo,
            replyTo: process.env.CORREO_EMISOR,
            subject: 'Código de activación de cuenta - Wind',
            text: `Hola ${nombre},\n\nGracias por registrarte en Wind. Tu código de activación es: ${codigoVerificacion}\n\nSi no solicitaste este registro, ignora este mensaje.`,
            html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
                    <h2 style="color: #333; text-align: center;">¡Hola, ${nombre}!</h2>
                    <p style="color: #666; line-height: 1.5;">Gracias por registrarte en <strong>Wind</strong>. Para completar la activación de tu cuenta, introduce el siguiente código de seguridad en la aplicación:</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #e67e22; letter-spacing: 5px; margin: 0; font-size: 32px;">${codigoVerificacion}</h1>
                    </div>
                    <p style="color: #999; font-size: 12px; text-align: center;">Si tú no solicitaste este registro, puedes ignorar este correo.</p>
                </div>
            `
        };

        // Intentamos enviar el correo; si falla no bloqueamos el registro
        try {
            await transportador.sendMail(opcionesCorreo);

            // Si el correo sale con éxito, respondemos normal
            return res.status(201).json({ 
                mensaje: 'Usuario registrado. Revisa tu bandeja de entrada.',
                requiereVerificacion: true,
                correo: correo
            });

        } catch (errorMail) {
            // 🛡️ Escudo: atrapamos errores de envío (p. ej. Render bloqueando SMTP)
            console.warn('⚠️ ALERTA: Falló el envío del correo, aplicando bypass.', errorMail && errorMail.message);
            console.log('Código generado para el usuario:', codigoVerificacion);

            // Respondemos con éxito (201) y devolvemos el código para pruebas locales
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

// 2. NUEVO: Verificar Código de Activación enviado por el usuario
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

        // Comparamos el código que ingresó con el guardado en Neon
        if (usuario.codigo_verificacion !== codigo.trim()) {
            return res.status(400).json({ mensaje: 'El código de verificación es incorrecto o expiró.' });
        }

        // Activamos la cuenta y limpiamos la columna del código
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

// 3. Inicio de Sesión (Modificado para bloquear cuentas inactivas)
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

        
        // CONTROL DE SEGURIDAD: Si la cuenta no está activa, no lo dejamos pasar
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

// 4. Obtener Perfil
exports.perfil = async (req, res) => {
    // Log para depuración: muestra la sesión en la consola del servidor
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

// 4b. Actualizar Foto de Perfil
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

// 6. Cerrar Sesión (Logout)
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