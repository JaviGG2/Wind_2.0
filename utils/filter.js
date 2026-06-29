const { BadWordsFilter } = require('is-bad-word');
const palabrasPersonalizadas = require('./palabras-prohibidas');

const filter = new BadWordsFilter();
filter.loadAllLanguages();
filter.addWords(palabrasPersonalizadas, 'spanish');

function contieneMalasPalabras(...textos) {
  return textos.some(t => t && typeof t === 'string' && filter.isProfane(t, ['english', 'spanish']));
}

module.exports = { contieneMalasPalabras };
