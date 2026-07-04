const db = require('../config/db');

const normalizeText = (text) => {
    if (!text) return '';
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const levenshteinDistance = (a, b) => {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + (b[i - 1] === a[j - 1] ? 0 : 1)
            );
        }
    }
    return matrix[b.length][a.length];
};

const isFallbackMatch = (text, normalizedQuery) => {
    if (!text) return false;
    const normalizedText = normalizeText(text);
    if (normalizedText.includes(normalizedQuery)) return true;

    const palabras = normalizedText.split(' ');
    const threshold = Math.max(2, Math.floor(normalizedQuery.length * 0.25));

    for (const palabra of palabras) {
        if (palabra.includes(normalizedQuery)) return true;
        if (levenshteinDistance(palabra, normalizedQuery) <= threshold) return true;
    }

    return false;
};

exports.buscarContenido = async (req, res) => {
    const query = req.query.q ? String(req.query.q).trim() : '';

    if (!query || query.length < 2) {
        return res.status(400).json({ mensaje: 'Escribe al menos 2 caracteres para buscar.' });
    }

    const normalizedQuery = normalizeText(query);
    const term = `%${query}%`;

    try {
        const [temasResult, relatosResult, juegosResult] = await Promise.all([
            db.query(
                `SELECT id, titulo, contenido, imagen_portada AS imagen, 'tema' AS tipo, '/ver-tema?id=' || id AS url
                 FROM temas
                 WHERE estado = 'aprobado' AND (translate(lower(titulo), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouaeiounnue') LIKE translate(lower($1), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouaeiounnue')
                    OR translate(lower(contenido), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouaeiounnue') LIKE translate(lower($1), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouaeiounnue'))
                 ORDER BY fecha_publicacion DESC
                 LIMIT 25`,
                [term]
            ),
            db.query(
                `SELECT id, titulo, contenido_relato AS contenido, imagen_url AS imagen, 'relato' AS tipo, '/ver-relato?id=' || id AS url
                 FROM relatos_community
                 WHERE translate(lower(titulo), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouaeiounnue') LIKE translate(lower($1), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouaeiounnue')
                    OR translate(lower(contenido_relato), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouaeiounnue') LIKE translate(lower($1), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouaeiounnue')
                 ORDER BY fecha_publicacion DESC
                 LIMIT 25`,
                [term]
            ),
            db.query(
                `SELECT id, titulo, titulo AS contenido, NULL AS imagen, 'juego' AS tipo, '/play-game?id=' || id AS url
                 FROM juegos
                 WHERE translate(lower(titulo), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouaeiounnue') LIKE translate(lower($1), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouaeiounnue')
                 ORDER BY id DESC
                 LIMIT 25`,
                [term]
            )
        ]);

        let temas = temasResult.rows;
        let relatos = relatosResult.rows;
        let juegos = juegosResult.rows;
        let total = temas.length + relatos.length + juegos.length;

        if (total === 0) {
            const [allTemas, allRelatos, allJuegos] = await Promise.all([
                db.query(`SELECT id, titulo, contenido, imagen_portada AS imagen, 'tema' AS tipo, '/ver-tema?id=' || id AS url FROM temas WHERE estado = 'aprobado' ORDER BY fecha_publicacion DESC LIMIT 200`),
                db.query(`SELECT id, titulo, contenido_relato AS contenido, imagen_url AS imagen, 'relato' AS tipo, '/ver-relato?id=' || id AS url FROM relatos_community ORDER BY fecha_publicacion DESC LIMIT 200`),
                db.query(`SELECT id, titulo, titulo AS contenido, NULL AS imagen, 'juego' AS tipo, '/play-game?id=' || id AS url FROM juegos ORDER BY id DESC LIMIT 200`)
            ]);

            temas = allTemas.rows.filter((row) => isFallbackMatch(row.titulo, normalizedQuery) || isFallbackMatch(row.contenido, normalizedQuery));
            relatos = allRelatos.rows.filter((row) => isFallbackMatch(row.titulo, normalizedQuery) || isFallbackMatch(row.contenido, normalizedQuery));
            juegos = allJuegos.rows.filter((row) => isFallbackMatch(row.titulo, normalizedQuery));
            total = temas.length + relatos.length + juegos.length;
        }

        const resumen = total > 0
            ? `Encontré ${total} coincidencia${total === 1 ? '' : 's'} en Wind para "${query}".`
            : `No se encontraron coincidencias exactas en Wind para "${query}". Aquí están los resultados más cercanos.`;

        const textoPotente = total > 0
            ? `Wind ha interpretado tu búsqueda "${query}" y encontró contenido relevante. ${temas.length ? `Temas destacados: ${temas.slice(0, 2).map((t) => t.titulo).join(', ')}.` : ''} ${relatos.length ? `Relatos cercanos: ${relatos.slice(0, 2).map((r) => r.titulo).join(', ')}.` : ''} ${juegos.length ? `Juegos: ${juegos.slice(0, 2).map((j) => j.titulo).join(', ')}.` : ''}`.trim()
            : `Wind intentó entender tu palabra incluso si la escribiste con error tipográfico o sin tilde. Aquí hay contenido similar para revisar.`;

        return res.json({ temas, relatos, juegos, resumen, textoPotente });
    } catch (error) {
        console.error('Error en busquedaController:', error.message);
        return res.status(500).json({ mensaje: 'Error al buscar en la base de datos.' });
    }
};

