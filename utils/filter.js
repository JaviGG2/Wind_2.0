const { BadWordsFilter } = require('is-bad-word');
const palabrasPersonalizadas = require('./palabras-prohibidas');

const filter = new BadWordsFilter();
filter.loadAllLanguages();
filter.addWords(palabrasPersonalizadas, 'spanish');

function contieneMalasPalabras(...textos) {
  return textos.some(t => t && typeof t === 'string' && filter.isProfane(t, ['english', 'spanish']));
}

function encontrarMalasPalabras(...textos) {
  const encontradas = new Set();
  for (const t of textos) {
    if (t && typeof t === 'string') {
      const matches = filter.detect(t, ['english', 'spanish']);
      matches.forEach(m => encontradas.add(m.word.toLowerCase()));
    }
  }
  const resultado = [...encontradas];
  if (resultado.length > 0) {
    console.log('🔍 Malas palabras detectadas:', resultado);
  }
  return resultado;
}

module.exports = { contieneMalasPalabras, encontrarMalasPalabras };
