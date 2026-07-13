require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Bounding box for Falcón state / Coro area
const FALCON_BBOX = { minLat: 10.5, maxLat: 12.5, minLng: -71.0, maxLng: -68.0 };
const CENTRO_CORO = { lat: 11.4056, lng: -69.6674 };

function dentroDeFalcon(lat, lng) {
    return lat >= FALCON_BBOX.minLat && lat <= FALCON_BBOX.maxLat &&
           lng >= FALCON_BBOX.minLng && lng <= FALCON_BBOX.maxLng;
}

function limpiarTitulo(t) {
    return t
        .replace(/^¿\s*/, '').replace(/\s*\?$/, '')
        .replace(/^(La |El |Los |Las |Lo )/i, '')
        .replace(/^(Un |Una )/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function generarQueries(titulo, categoriaId) {
    const limpio = limpiarTitulo(titulo);
    const palabras = limpio.split(/\s+/).filter(Boolean);
    const queries = [];

    // 1. título limpio + "Coro Venezuela" (keyword geográfico más fuerte)
    queries.push(`${limpio}, Coro, Venezuela`);

    // 2. substrings: últimas 2-3 palabras clave
    if (palabras.length >= 3) {
        queries.push(`${palabras.slice(-3).join(' ')}, Coro, Venezuela`);
        queries.push(`${palabras.slice(0, 3).join(' ')}, Coro, Venezuela`);
        queries.push(`${palabras.slice(-2).join(' ')}, Coro, Venezuela`);
    } else if (palabras.length === 2) {
        queries.push(`${palabras.join(' ')}, Coro, Venezuela`);
    }

    // 3. solo palabras clave relevantes (sin artículos/preposiciones)
    const genericas = ['la','el','los','las','lo','de','del','en','un','una','su','por','para','con','y','e','o','a','que'];
    const claves = palabras.filter(p => !genericas.includes(p.toLowerCase()) && p.length > 2);
    if (claves.length >= 2) {
        queries.push(`${claves.join(' ')}, Coro`);
    }

    // 4. categoría + título
    const catMap = { 1: 'edificio', 2: 'sitio', 3: 'monumento', 4: 'lugar' };
    const prefijo = catMap[categoriaId] || '';
    if (prefijo) queries.push(`${prefijo} ${limpio}, Venezuela`);

    // 5. query con corrección de "Coro" duplicado
    if (limpio.toLowerCase().includes('coro')) {
        queries.push(`${limpio}, Venezuela`);
    }

    return [...new Set(queries)];
}

async function buscarEnNominatim(query, intento = 0) {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&q='
        + encodeURIComponent(query) + '&limit=5';
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'WindApp/1.0' }
        });
        if (!res.ok) {
            if (res.status === 429 && intento < 3) {
                await new Promise(r => setTimeout(r, 3000));
                return buscarEnNominatim(query, intento + 1);
            }
            return null;
        }
        const datos = await res.json();
        if (!datos || datos.length === 0) return null;

        // Filter: only results within Falcón
        const enFalcon = datos.filter(d => dentroDeFalcon(parseFloat(d.lat), parseFloat(d.lon)));
        if (enFalcon.length > 0) return enFalcon[0];

        // If nothing in Falcón, try matching Venezuela
        const enVenezuela = datos.filter(d =>
            d.display_name && d.display_name.toLowerCase().includes('venezuela')
        );
        if (enVenezuela.length > 0) return enVenezuela[0];

        return null;
    } catch {
        return null;
    }
}

function coordenadasPorDefecto(titulo, catId) {
    // Known landmarks with known approximate coordinates
    const conocidos = {
        'balcón de los arcaya': [11.4081, -69.6723],
        'casa balcón de los arcaya': [11.4081, -69.6723],
        'ventanas de hierro': [11.4085, -69.6770],
        'casa de las ventanas de hierro': [11.4085, -69.6770],
        'museo diocesano': [11.4080, -69.6775],
        'museo diocesano de coro lucas guillermo castillo': [11.4080, -69.6775],
        'casa del sol': [11.4068, -69.6740],
        'museo de arte de coro': [11.4070, -69.6760],
        'museo guadalupano': [11.4075, -69.6765],
        'el museo guadalupano': [11.4075, -69.6765],
        'casa del tesoro': [11.4065, -69.6750],
        'teatro armonía': [11.4078, -69.6768],
        'el teatro armonía': [11.4078, -69.6768],
        'ateneo de coro': [11.4072, -69.6772],
        'el ateneo de coro': [11.4072, -69.6772],
        'plaza san clemente': [11.4092, -69.6789],
        'casa de los torres': [11.4075, -69.6735],
        'balcón de los senior': [11.4083, -69.6725],
        'el balcón de los senior': [11.4083, -69.6725],
        'paseo monseñor iturriza': [11.4067, -69.6777],
        'barrio guinea': [11.4100, -69.6650],
        '¿que es el barrio guinea?': [11.4100, -69.6650],
        'la vela de coro': [11.4423, -69.6063],
        'cruz de taratara': [11.0633, -69.7147],
        'la cruz de taratara': [11.0633, -69.7147],
    };

    const key = limpiarTitulo(titulo).toLowerCase();
    if (conocidos[key]) return conocidos[key];

    // Fallback: Casco Histórico de Coro
    return null;
}

async function geocodificar() {
    console.log('\n\x1b[1m\x1b[34m━━━ Geocodificando temas sin ubicación ━━━\x1b[0m\n');

    const result = await pool.query(
        'SELECT t.id, t.titulo, t.categoria_id, c.nombre AS cat_nombre FROM temas t LEFT JOIN categorias c ON t.categoria_id = c.id WHERE t.latitud IS NULL ORDER BY t.id'
    );
    const temas = result.rows;
    const total = temas.length;

    if (total === 0) {
        console.log('  Todos los temas ya tienen coordenadas.');
        process.exit(0);
    }

    console.log(`  ${total} temas pendientes.\n`);

    let exitosos = 0;
    let fallidos = 0;
    let usarDefault = 0;

    for (let i = 0; i < total; i++) {
        const t = temas[i];
        const queries = generarQueries(t.titulo, t.categoria_id);

        let resultado = null;
        let consultaUsada = '';

        for (const q of queries) {
            resultado = await buscarEnNominatim(q);
            if (resultado) {
                consultaUsada = q;
                break;
            }
            await new Promise(r => setTimeout(r, 1100));
        }

        const num = String(i + 1).padStart(total >= 10 ? 2 : 1);
        const tituloCorto = t.titulo.trim().slice(0, 55).padEnd(55);

        if (resultado) {
            const lat = parseFloat(resultado.lat);
            const lon = parseFloat(resultado.lon);
            await pool.query(
                'UPDATE temas SET latitud = $1, longitud = $2 WHERE id = $3',
                [lat, lon, t.id]
            );
            exitosos++;
            console.log(`  ${num}/${total} \x1b[32m✅\x1b[0m ${tituloCorto} → ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        } else {
            const def = coordenadasPorDefecto(t.titulo, t.categoria_id);
            if (def) {
                await pool.query(
                    'UPDATE temas SET latitud = $1, longitud = $2 WHERE id = $3',
                    [def[0], def[1], t.id]
                );
                usarDefault++;
                console.log(`  ${num}/${total} \x1b[33m⚠️\x1b[0m ${tituloCorto} → ${def[0].toFixed(4)}, ${def[1].toFixed(4)} (aprox.)`);
            } else {
                fallidos++;
                console.log(`  ${num}/${total} \x1b[31m❌\x1b[0m ${tituloCorto} → sin resultados`);
            }
        }

        if (i < total - 1) await new Promise(r => setTimeout(r, 1100));
    }

    console.log(`\n\x1b[1m\x1b[34m━━━ Resumen ━━━\x1b[0m`);
    console.log(`  Procesados: ${total} | Nominatim: \x1b[32m${exitosos}\x1b[0m | Aprox: \x1b[33m${usarDefault}\x1b[0m | Sin coords: \x1b[31m${fallidos}\x1b[0m`);

    if (fallidos > 0) {
        console.log(`\n  Los ${fallidos} sin coordenadas pueden agregarse manualmente desde "Crear tema".`);
    }
    console.log('');

    await pool.end();
    process.exit(0);
}

geocodificar().catch(err => {
    console.error('\x1b[31mError:\x1b[0m', err.message);
    process.exit(1);
});
