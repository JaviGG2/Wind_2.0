const { GoogleGenAI } = require('@google/genai');
const { limpiarTexto } = require('./sanitizar');

const IA_KEY = process.env.IA_KEY;
const GEMINI_KEY = process.env.GEMINI_IA;
const CACHE_TTL = 60 * 60 * 1000;
const cache = new Map();

let ai = null;
function getAI() {
  if (!ai) ai = new GoogleGenAI({ apiKey: IA_KEY || GEMINI_KEY });
  return ai;
}

async function generarTexto({ prompt, systemPrompt, modelo = 'gemini-2.0-flash', temperatura = 0.7 }) {
  const cacheKey = JSON.stringify({ prompt, systemPrompt, modelo, temperatura });
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.valor;

  const client = getAI();
  const contents = [];
  if (systemPrompt) contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const response = await client.models.generateContent({
    model: modelo,
    contents,
    config: { temperature: temperatura }
  });

  const texto = response.text || '';
  cache.set(cacheKey, { valor: texto, ts: Date.now() });
  return texto;
}

const TIPOS_JUEGO = ['Quiz', 'Memory', 'Match', 'Scramblee'];
const DIFICULTADES = ['facil', 'media', 'dificil'];
const ENFOQUES = ['arquitectonico', 'historico', 'cultural', 'personajes', 'fechas', 'datos_curiosos', 'geografico', 'tradiciones'];

function generarPromptJuego(tema, indice) {
  const tipo = TIPOS_JUEGO[indice % TIPOS_JUEGO.length];
  const dificultad = DIFICULTADES[indice % DIFICULTADES.length];
  const enfoque = ENFOQUES[(indice * 3) % ENFOQUES.length];
  const semilla = Math.floor(Math.random() * 10000);

  const estructuras = {
    Quiz: `{
  "titulo": "Pregunta sobre [tema]",
  "pregunta": "¿...?",
  "opcion_a": "...",
  "opcion_b": "...",
  "opcion_c": "...",
  "opcion_correcta": "A" | "B" | "C"
}`,
    Memory: `{
  "titulo": "Memory: [tema]",
  "pregunta": "palabra1,palabra2,palabra3,palabra4,palabra5,palabra6"
}`,
    Match: `{
  "titulo": "Match: [tema]",
  "pregunta": "concepto1,concepto2,concepto3",
  "opcion_a": "definicion1,definicion2,definicion3"
}`,
    Scramblee: `{
  "titulo": "Scramblee: [tema]",
  "pregunta": "Pista para adivinar la palabra",
  "opcion_a": "PALABRA_SECRETA"
}`
  };

  const prompt = `Eres un creador de juegos educativos sobre Santa Ana de Coro, Venezuela.

Basado en el texto historico a continuacion, genera un juego de tipo **${tipo}** con dificultad **${dificultad}** enfocado en el aspecto **${enfoque}** del tema.

Semilla de variedad: ${semilla}
Esta es la generacion #${indice + 1}.

IMPORTANTE: El juego debe ser COMPLETAMENTE DIFERENTE a cualquier otro. NO repitas preguntas ni conceptos comunes. Busca datos especificos, poco conocidos, numeros exactos, fechas precisas, nombres de personas o lugares dentro del texto.

Texto historico:
"""
${tema.contenido || tema.pregunta || ''}
"""

Titulo del tema: ${tema.titulo || ''}

Responde SOLO con un JSON valido con esta estructura EXACTA:
${estructuras[tipo]}

No incluyas explicaciones, markdown ni texto adicional fuera del JSON.`;

  return { prompt, tipo, dificultad, enfoque };
}

async function generarJuego({ tema, indice }) {
  try {
    const { prompt, tipo } = generarPromptJuego(tema, indice);
    const systemPrompt = `Eres un experto en patrimonio cultural de Coro, Venezuela. Generas juegos educativos en espanol. Siempre respondes con JSON valido.`;
    const texto = await generarTexto({
      prompt, systemPrompt, modelo: 'gemini-2.0-flash', temperatura: 0.9
    });
    const jsonMatch = texto.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const datos = JSON.parse(jsonMatch[0]);
      return {
        titulo: limpiarTexto(datos.titulo, 200) || `Juego: ${(tema.titulo || '').substring(0, 40)}`,
        pregunta: limpiarTexto(datos.pregunta, 500),
        opcion_a: limpiarTexto(datos.opcion_a, 500),
        opcion_b: limpiarTexto(datos.opcion_b, 500),
        opcion_c: limpiarTexto(datos.opcion_c, 500),
        opcion_correcta: ['A', 'B', 'C'].includes((datos.opcion_correcta || '').trim().toUpperCase()) ? datos.opcion_correcta.trim().toUpperCase() : 'A',
        tipo, puntos_recompensa: tipo === 'Scramblee' ? 15 : tipo === 'Quiz' ? 10 : 8, categoria_id: tema.categoria_id || null
      };
    }
  } catch (_) {}
  return generarJuegoLocal({ tema, indice });
}

function generarJuegoLocal({ tema, indice }) {
  const tipos = ['Quiz', 'Memory', 'Match', 'Scramblee'];
  const tipo = tipos[indice % tipos.length];
  const contenido = (tema.contenido || tema.pregunta || '').trim();
  const tituloTema = (tema.titulo || '').trim() || 'Patrimonio de Coro';
  const oraciones = contenido.split(/[.!?]+/).filter(s => s.trim().length > 20).map(s => s.trim());
  const palabras = contenido.split(/\s+/).filter(p => p.length > 4);
  const palabrasUnicas = [...new Set(palabras.map(p => p.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, '')))].filter(p => p.length > 4);
  const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  switch (tipo) {
    case 'Quiz': {
      const oracion = pick(oraciones) || contenido.substring(0, 150);
      const terminos = oracion.match(/\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{3,}\b/g) || [];
      const correcta = pick(terminos) || pick(palabrasUnicas) || 'Coro';
      const pregunta = oracion.replace(new RegExp(correcta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '______');
      const distractores = shuffle(palabrasUnicas.filter(p => p.toLowerCase() !== correcta.toLowerCase())).slice(0, 2);
      while (distractores.length < 2) distractores.push('Patrimonio', 'Historia');
      const opciones = shuffle([correcta, ...distractores]);
      const opcionesMap = { A: opciones[0], B: opciones[1], C: opciones[2] };
      const correctaLetra = Object.keys(opcionesMap).find(k => opcionesMap[k] === correcta);
      return {
        titulo: `Quiz: ${tituloTema}`.substring(0, 200),
        pregunta: pregunta.substring(0, 300),
        opcion_a: opcionesMap.A, opcion_b: opcionesMap.B, opcion_c: opcionesMap.C,
        opcion_correcta: correctaLetra || 'A',
        tipo: 'Quiz', puntos_recompensa: 10, categoria_id: tema.categoria_id || null
      };
    }
    case 'Memory': {
      const pares = shuffle(palabrasUnicas).slice(0, 6);
      while (pares.length < 6) pares.push('Coro', 'Colonial', 'Patrimonio', 'Historia', 'Cultura', 'Venezuela');
      return {
        titulo: `Memory: ${tituloTema}`.substring(0, 200),
        pregunta: pares.slice(0, 6).join(','),
        opcion_a: '', opcion_b: '', opcion_c: '',
        opcion_correcta: 'A',
        tipo: 'Memory', puntos_recompensa: 8, categoria_id: tema.categoria_id || null
      };
    }
    case 'Match': {
      const pares = oraciones.slice(0, 3).map(o => {
        const palabrasOracion = o.split(/\s+/).filter(p => p.length > 3);
        const concepto = pick(palabrasOracion) || 'concepto';
        return { concepto: concepto.substring(0, 30), definicion: o.substring(0, 80) };
      });
      while (pares.length < 3) {
        pares.push({ concepto: 'Patrimonio', definicion: 'Bien cultural heredado del pasado.' });
      }
      return {
        titulo: `Match: ${tituloTema}`.substring(0, 200),
        pregunta: pares.map(p => p.concepto).join(','),
        opcion_a: pares.map(p => p.definicion).join(','),
        opcion_b: '', opcion_c: '',
        opcion_correcta: 'A',
        tipo: 'Match', puntos_recompensa: 8, categoria_id: tema.categoria_id || null
      };
    }
    case 'Scramblee': {
      const secreta = pick(palabrasUnicas.filter(p => p.length > 4 && p.length < 15)) || 'CORO';
      const pista = oraciones.find(o => o.toLowerCase().includes(secreta.toLowerCase())) || `Palabra relacionada con ${tituloTema}`;
      return {
        titulo: `Scramblee: ${tituloTema}`.substring(0, 200),
        pregunta: pista.substring(0, 200),
        opcion_a: secreta.toUpperCase(),
        opcion_b: '', opcion_c: '',
        opcion_correcta: 'A',
        tipo: 'Scramblee', puntos_recompensa: 15, categoria_id: tema.categoria_id || null
      };
    }
  }
}

async function verificarQuota({ usuarioId, tipo, db }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const { LIMITES } = require('./limites-ia');
  const limite = LIMITES[tipo];
  if (!limite) return { permitido: true };

  const res = await db.query(
    'SELECT conteo FROM uso_ia WHERE usuario_id = $1 AND fecha = $2 AND tipo = $3',
    [usuarioId, hoy, tipo]
  );
  const usado = res.rows[0]?.conteo || 0;
  return { permitido: usado < limite, usado, limite };
}

async function registrarUso({ usuarioId, tipo, db }) {
  const hoy = new Date().toISOString().slice(0, 10);
  await db.query(`
    INSERT INTO uso_ia (usuario_id, fecha, tipo, conteo)
    VALUES ($1, $2, $3, 1)
    ON CONFLICT (usuario_id, fecha, tipo)
    DO UPDATE SET conteo = uso_ia.conteo + 1
  `, [usuarioId, hoy, tipo]);
}

module.exports = { generarTexto, generarJuego, generarJuegoLocal, verificarQuota, registrarUso, generarPromptJuego };