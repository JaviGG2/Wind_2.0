const cacheTraducciones = new Map();
const TTL_CACHE = 60 * 60 * 1000;

function limpiarCache() {
    const ahora = Date.now();
    for (const [key, valor] of cacheTraducciones) {
        if (ahora - valor.ts > TTL_CACHE) cacheTraducciones.delete(key);
    }
}
setInterval(limpiarCache, TTL_CACHE);

exports.traducir = async (req, res) => {
    const { textos, idioma } = req.body;
    if (!textos || !idioma) {
        return res.status(400).json({ error: 'Faltan campos requeridos.' });
    }

    try {
        const textosArr = Array.isArray(textos) ? textos : [textos];
        const traducciones = await Promise.all(textosArr.map(async texto => {
            const cacheKey = `${texto}::${idioma}`;
            const cached = cacheTraducciones.get(cacheKey);
            if (cached && Date.now() - cached.ts < TTL_CACHE) {
                return cached.valor;
            }
            const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + encodeURIComponent(idioma) + '&dt=t&q=' + encodeURIComponent(texto);
            const response = await fetch(url);
            const data = await response.json();
            const resultado = data[0].map(part => part[0]).join('');
            cacheTraducciones.set(cacheKey, { valor: resultado, ts: Date.now() });
            return resultado;
        }));

        return res.json({ traducciones });
    } catch (error) {
        console.error('Error al traducir:', error.message);
        return res.status(500).json({ error: 'Error al traducir el texto.' });
    }
};
