const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const ARCHIVO = path.join(__dirname, '..', 'feedback', 'feedback.json');

function leerFeedback() {
    try {
        const data = fs.readFileSync(ARCHIVO, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

function guardarFeedback(lista) {
    fs.writeFileSync(ARCHIVO, JSON.stringify(lista, null, 2), 'utf-8');
}

exports.enviarFeedback = async (req, res) => {
    const { mensaje } = req.body;
    if (!mensaje || !mensaje.trim()) {
        return res.status(400).json({ mensaje: 'Escribe un mensaje.' });
    }
    try {
        const usuario = await db.query(
            'SELECT nombre, username FROM usuarios WHERE id = $1',
            [req.session.usuarioId]
        );
        const userData = usuario.rows[0] || { nombre: 'Desconocido', username: 'unknown' };

        const lista = leerFeedback();
        const entry = {
            id: lista.length > 0 ? lista[lista.length - 1].id + 1 : 1,
            usuario_id: req.session.usuarioId,
            usuario_nombre: userData.nombre,
            usuario_username: userData.username,
            mensaje: mensaje.trim(),
            pagina: req.body.pagina || '',
            leido: false,
            fecha_creacion: new Date().toISOString()
        };
        lista.push(entry);
        guardarFeedback(lista);

        res.status(201).json({ mensaje: 'Feedback enviado. ¡Gracias!' });
    } catch (err) {
        console.error('Error al guardar feedback:', err.message);
        res.status(500).json({ mensaje: 'Error al enviar feedback.' });
    }
};

exports.listarFeedback = async (req, res) => {
    try {
        const lista = leerFeedback();
        res.json(lista.reverse());
    } catch (err) {
        console.error('Error al listar feedback:', err.message);
        res.status(500).json({ mensaje: 'Error al cargar feedback.' });
    }
};

exports.eliminarFeedback = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ mensaje: 'ID inválido.' });
    try {
        let lista = leerFeedback();
        const antes = lista.length;
        lista = lista.filter(f => f.id !== id);
        if (lista.length === antes) return res.status(404).json({ mensaje: 'Feedback no encontrado.' });
        guardarFeedback(lista);
        res.json({ mensaje: 'Feedback eliminado.' });
    } catch (err) {
        console.error('Error al eliminar feedback:', err.message);
        res.status(500).json({ mensaje: 'Error al eliminar feedback.' });
    }
};
