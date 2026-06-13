// controllers/authController.js
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

        // Se envía el correo en segundo plano
        await transportador.sendMail(opcionesCorreo);

        // Retornamos al frontend la bandera 'requiereVerificacion' y el correo del usuario
        return res.status(201).json({ 
            mensaje: 'Usuario registrado con éxito. Revisa tu correo para activar tu cuenta.',
            requiereVerificacion: true,
            correo: correo
        });

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

        req.session.usuario = {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.rol
        };
        req.session.usuarioId = usuario.id;
        req.session.nombre = usuario.nombre;
        req.session.rol = usuario.rol;

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
exports.perfil = (req, res) => {
    if (!req.session.usuario && !req.session.usuarioId) {
        return res.status(401).json({ mensaje: 'No autorizado. Inicie sesión.' });
    }
    res.json({
        id: req.session.usuario?.id || req.session.usuarioId,
        nombre: req.session.usuario?.nombre || req.session.nombre,
        rol: req.session.usuario?.rol || req.session.rol
    });
};

// 5. Ascender Rol
exports.ascender = async (req, res) => {
    if (!req.session.usuarioId) {
        return res.status(401).json({ mensaje: 'Debes iniciar sesión para realizar esta acción.' });
    }

    const { respuestaExamen } = req.body;

    if (respuestaExamen !== 'correcto') {
        return res.status(400).json({ mensaje: 'Evaluación reprobada. Revisa tus conocimientos históricos sobre Coro e inténtalo de nuevo.' });
    }

    try {
        await db.query('UPDATE usuarios SET rol = $1 WHERE id = $2', ['Especialista', req.session.usuarioId]);
        req.session.rol = 'Especialista';

        res.json({ 
            mensaje: '¡Felicidades! Has aprobado la prueba interna. Tu rol ha sido actualizado a Especialista.',
            nuevoRol: 'Especialista'
        });
    } catch (error) {
        console.error('Error al ascender rol:', error);
        res.status(500).json({ mensaje: 'Error interno al procesar la solicitud de ascenso.' });
    }
};

// 6. Cerrar Sesión (Logout)
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ mensaje: 'No se pudo cerrar la sesión.' });
        res.clearCookie('connect.sid');
        res.json({ mensaje: 'Sesión destruida con éxito.' });
    });
};