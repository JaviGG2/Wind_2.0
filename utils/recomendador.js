const natural = require('natural');
const TfIdf = natural.TfIdf;
const db = require('../config/db');

const tokenizer = new natural.WordTokenizer();

function tokenize(texto) {
    const limpio = texto
        .toLowerCase()
        .replace(/[^a-záéíóúüña-z0-9\s]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    return tokenizer.tokenize(limpio) || [];
}

function cosine(vecA, vecB) {
    let dot = 0, magA = 0, magB = 0;
    for (const k in vecA) { magA += vecA[k] * vecA[k]; if (vecB[k]) dot += vecA[k] * vecB[k]; }
    for (const k in vecB) magB += vecB[k] * vecB[k];
    if (!magA || !magB) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

class Recomendador {
    constructor() {
        this.listo = false;
        this.tfidf = new TfIdf();
        this.listaTemas = [];
        this.listaRelatos = [];
        this.vecTemas = [];
        this.vecRelatos = [];
        this.coTemas = {};
    }

    async entrenar() {
        const [temas, relatos, historial] = await Promise.all([
            db.query(`SELECT id, titulo, contenido FROM temas`),
            db.query(`SELECT id, titulo, contenido_relato FROM relatos_community`),
            db.query(`SELECT usuario_id, contenido_id FROM historial_vistas WHERE tipo_contenido = 'tema'`)
        ]);

        this.listaTemas = temas.rows;
        this.listaRelatos = relatos.rows;

        this.tfidf = new TfIdf();
        for (const t of temas.rows) this.tfidf.addDocument(tokenize(`${t.titulo||''} ${t.contenido||''}`));
        for (const r of relatos.rows) this.tfidf.addDocument(tokenize(`${r.titulo||''} ${r.contenido_relato||''}`));

        const nDocs = temas.rows.length + relatos.rows.length;
        this.vecTemas = temas.rows.map((_, i) => {
            const v = {};
            this.tfidf.listTerms(i).forEach(t => { v[t.term] = t.tfidf; });
            return v;
        });
        this.vecRelatos = relatos.rows.map((_, i) => {
            const v = {};
            this.tfidf.listTerms(temas.rows.length + i).forEach(t => { v[t.term] = t.tfidf; });
            return v;
        });

        const userItems = {};
        for (const h of historial.rows) {
            if (!userItems[h.usuario_id]) userItems[h.usuario_id] = new Set();
            userItems[h.usuario_id].add(h.contenido_id);
        }
        this.coTemas = {};
        for (const items of Object.values(userItems)) {
            const arr = [...items];
            for (let i = 0; i < arr.length; i++) {
                for (let j = i + 1; j < arr.length; j++) {
                    const k = `${Math.min(arr[i], arr[j])}-${Math.max(arr[i], arr[j])}`;
                    this.coTemas[k] = (this.coTemas[k] || 0) + 1;
                }
            }
        }

        this.listo = true;
        console.log(`[Recomendador] ${temas.rows.length} temas, ${relatos.rows.length} relatos`);
    }

    similares(id, tipo, limite = 6) {
        if (!this.listo) return [];
        const docs = tipo === 'tema' ? this.listaTemas : this.listaRelatos;
        const vecs = tipo === 'tema' ? this.vecTemas : this.vecRelatos;
        const idx = docs.findIndex(d => d.id === id);
        if (idx === -1) return [];

        const target = vecs[idx];
        const scores = [];

        docs.forEach((d, i) => {
            if (i === idx) return;
            const sim = cosine(target, vecs[i]);
            if (sim > 0.01) scores.push({ id: d.id, score: sim });
        });
        scores.sort((a, b) => b.score - a.score);

        const top = scores.slice(0, limite);
        const colab = this._colab(id, tipo, docs);
        const colabMap = {};
        colab.forEach(c => { colabMap[c.id] = c.score; });

        return top.map(t => ({
            id: t.id,
            tipo,
            scoreContenido: t.score,
            scoreColab: colabMap[t.id] || 0,
            scoreFinal: t.score * 0.7 + (colabMap[t.id] || 0) * 0.3
        }));
    }

    _colab(id, tipo, docs) {
        if (tipo !== 'tema') return [];
        const scores = [];
        docs.forEach(d => {
            if (d.id === id) return;
            const k = `${Math.min(id, d.id)}-${Math.max(id, d.id)}`;
            const c = this.coTemas[k];
            if (c) scores.push({ id: d.id, score: Math.log1p(c) / 5 });
        });
        scores.sort((a, b) => b.score - a.score);
        return scores.slice(0, 6);
    }

    async recomendar(usuarioId, limite = 6) {
        if (!this.listo) return { temas: [], relatos: [] };
        const hist = await db.query(
            `SELECT tipo_contenido, contenido_id FROM historial_vistas WHERE usuario_id = $1 ORDER BY fecha_vista DESC LIMIT 10`,
            [usuarioId]
        );
        const visto = { temas: new Set(), relatos: new Set() };
        hist.rows.forEach(h => {
            if (h.tipo_contenido === 'tema') visto.temas.add(h.contenido_id);
        });

        const items = [...visto.temas].flatMap(id => this.similares(id, 'tema', 3));
        items.sort((a, b) => b.scoreFinal - a.scoreFinal);

        const unicos = [];
        const seen = new Set();
        for (const r of items) {
            const k = `${r.tipo}-${r.id}`;
            if (!seen.has(k) && !visto.temas.has(r.id)) { seen.add(k); unicos.push(r); }
        }

        const ids = unicos.slice(0, limite).map(r => r.id);
        if (!ids.length) return { temas: [], relatos: [] };
        const ph = ids.map((_, i) => `$${i + 1}`).join(',');
        const res = await db.query(
            `SELECT t.id, t.titulo, LEFT(t.contenido, 200) AS resumen, c.nombre AS categoria, t.likes, t.fecha_publicacion
             FROM temas t LEFT JOIN categorias c ON t.categoria_id = c.id
             WHERE t.id IN (${ph})`, ids
        );
        return { temas: res.rows, relatos: [] };
    }
}

module.exports = new Recomendador();
