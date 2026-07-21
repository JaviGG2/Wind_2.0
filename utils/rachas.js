const db = require('../config/db');

async function actualizarRachaCreacion(usuarioId) {
    const hoy = new Date().toISOString().slice(0, 10);
    const existente = await db.query(
        'SELECT id, racha_creacion_actual, racha_creacion_maxima, ultimo_creacion FROM rachas WHERE usuario_id = $1',
        [usuarioId]
    );

    if (existente.rows.length === 0) {
        await db.query(
            `INSERT INTO rachas (usuario_id, racha_creacion_actual, racha_creacion_maxima, ultimo_creacion)
             VALUES ($1, 1, 1, $2)`,
            [usuarioId, hoy]
        );
        return 1;
    }

    const r = existente.rows[0];
    const ultimo = r.ultimo_creacion ? r.ultimo_creacion.toISOString().slice(0, 10) : null;

    if (ultimo === hoy) return r.racha_creacion_actual;

    let nuevaRacha = 1;
    if (ultimo) {
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        if (ultimo === ayer.toISOString().slice(0, 10)) {
            nuevaRacha = r.racha_creacion_actual + 1;
        }
    }

    const nuevaMaxima = Math.max(nuevaRacha, r.racha_creacion_maxima);
    await db.query(
        `UPDATE rachas SET racha_creacion_actual = $1, racha_creacion_maxima = $2, ultimo_creacion = $3, updated_at = NOW()
         WHERE id = $4`,
        [nuevaRacha, nuevaMaxima, hoy, r.id]
    );
    return nuevaRacha;
}

module.exports = { actualizarRachaCreacion };
