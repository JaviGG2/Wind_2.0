const db = require('../config/db');

class Recomendador {
    constructor() {
        this.listo = false;
    }

    async entrenar() {
        this.listo = true;
    }

    async recomendar(usuarioId, limite = 6) {
        const hist = await db.query(
            `SELECT t.categoria_id FROM historial_vistas hv
             JOIN temas t ON hv.contenido_id = t.id AND hv.tipo_contenido = 'tema'
             WHERE hv.usuario_id = $1 AND t.categoria_id IS NOT NULL
             GROUP BY t.categoria_id ORDER BY COUNT(*) DESC LIMIT 3`,
            [usuarioId]
        );
        const cats = hist.rows.map(r => r.categoria_id).filter(Boolean);
        if (!cats.length) {
            const res = await db.query(
                `SELECT id, titulo, LEFT(contenido, 200) AS resumen, c.nombre AS categoria, t.likes, t.fecha_publicacion
                 FROM temas t LEFT JOIN categorias c ON t.categoria_id = c.id
                 WHERE t.estado = 'aprobado'
                 ORDER BY t.likes DESC LIMIT $1`,
                [limite]
            );
            return { temas: res.rows, relatos: [] };
        }
        const ph = cats.map((_, i) => `$${i + 2}`).join(',');
        const vals = [usuarioId, ...cats, limite];
        const res = await db.query(
            `SELECT t.id, t.titulo, LEFT(t.contenido, 200) AS resumen, c.nombre AS categoria, t.likes, t.fecha_publicacion
             FROM temas t LEFT JOIN categorias c ON t.categoria_id = c.id
             WHERE t.estado = 'aprobado' AND t.categoria_id IN (${ph})
               AND t.id NOT IN (SELECT contenido_id FROM historial_vistas WHERE usuario_id = $1 AND tipo_contenido = 'tema')
             ORDER BY t.likes DESC LIMIT $${vals.length}`,
            vals
        );
        return { temas: res.rows, relatos: [] };
    }

    similares(id, tipo) {
        return [];
    }
}

module.exports = new Recomendador();
