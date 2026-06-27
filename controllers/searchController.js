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
                 WHERE translate(lower(titulo), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouaeiounnue') LIKE translate(lower($1), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouaeiounnue')
                    OR translate(lower(contenido), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouaeiounnue') LIKE translate(lower($1), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouaeiounnue')
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
                `SELECT id, pregunta AS titulo, pregunta AS contenido, NULL AS imagen, 'juego' AS tipo, '/juegos?juego=' || id AS url
                 FROM juegos
                 WHERE translate(lower(pregunta), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouaeiounnue') LIKE translate(lower($1), 'áéíóúÁÉÍÓÚñÑüÜ', 'aeiouaeiounnue')
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
                db.query(`SELECT id, titulo, contenido, imagen_portada AS imagen, 'tema' AS tipo, '/ver-tema?id=' || id AS url FROM temas ORDER BY fecha_publicacion DESC LIMIT 200`),
                db.query(`SELECT id, titulo, contenido_relato AS contenido, imagen_url AS imagen, 'relato' AS tipo, '/relatos' AS url FROM relatos_community ORDER BY fecha_publicacion DESC LIMIT 200`),
                db.query(`SELECT id, pregunta AS titulo, pregunta AS contenido, NULL AS imagen, 'juego' AS tipo, '/juegos?juego=' || id AS url FROM juegos ORDER BY id DESC LIMIT 200`)
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
            ? `Wind ha interpretado tu búsqueda "${query}" y encontró contenido relevante. ${temas.length ? `Temas destacados: ${temas.slice(0, 2).map((t) => t.titulo).join(', ')}.` : ''} ${relatos.length ? `Relatos cercanos: ${relatos.slice(0, 2).map((r) => r.titulo).join(', ')}.` : ''} ${juegos.length ? `Preguntas relacionadas: ${juegos.slice(0, 2).map((j) => j.titulo).join(', ')}.` : ''}`.trim()
            : `Wind intentó entender tu palabra incluso si la escribiste con error tipográfico o sin tilde. Aquí hay contenido similar para revisar.`;

        return res.json({ temas, relatos, juegos, resumen, textoPotente });
    } catch (error) {
        console.error('Error en busquedaController:', error.message);
        return res.status(500).json({ mensaje: 'Error al buscar en la base de datos.' });
    }
};

exports.consultarIA = async (req, res) => {
    const query = req.body.q ? String(req.body.q).trim() : '';
    if (!query) {
        return res.status(400).json({ mensaje: 'Consulta vacía.' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY || 'sk-or-v1-placeholder';

    try {
        const respuesta = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Wind - Ciudad del Viento'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash:free',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un asistente de inteligencia artificial experto en la historia, geografía, cultura, tradiciones y leyendas de Coro, estado Falcón, Venezuela ("La ciudad del viento" y patrimonio de la humanidad). Responde de manera concisa, informativa y en un tono amigable, en español y en máximo 2 párrafos cortos.'
                    },
                    {
                        role: 'user',
                        content: `Háblame sobre el siguiente tema relacionado con Coro/Falcón: ${query}`
                    }
                ]
            })
        });

        if (!respuesta.ok) {
            const errTexto = await respuesta.text();
            console.error('Error de OpenRouter:', errTexto);
            if (apiKey.includes('placeholder')) {
                return res.status(401).json({ 
                    mensaje: 'Para usar la IA, debes agregar tu clave OPENROUTER_API_KEY en el archivo .env de la raíz del proyecto.' 
                });
            }
            return res.status(502).json({ mensaje: 'No se pudo obtener respuesta de la IA en este momento.' });
        }

        const datos = await respuesta.json();
        const respuestaIA = datos.choices?.[0]?.message?.content || 'No se obtuvo respuesta.';
        return res.json({ respuesta: respuestaIA });

    } catch (error) {
        console.error('Error al conectar con OpenRouter:', error.message);
        return res.status(500).json({ mensaje: 'Error de conexión con el servicio de IA.' });
    }
};
