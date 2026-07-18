const palabrasPersonalizadas = require('./palabras-prohibidas');

const listaCompleta = palabrasPersonalizadas.map(p => p.toLowerCase());

function contiene(textos) {
  for (const t of textos) {
    if (t && typeof t === 'string') {
      const lower = t.toLowerCase();
      for (const palabra of listaCompleta) {
        const regex = new RegExp('\\b' + palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
        if (regex.test(lower)) return true;
      }
    }
  }
  return false;
}

function encontrar(textos) {
  const encontradas = new Set();
  for (const t of textos) {
    if (t && typeof t === 'string') {
      const lower = t.toLowerCase();
      for (const palabra of listaCompleta) {
        const regex = new RegExp('\\b' + palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
        if (regex.test(lower)) encontradas.add(palabra);
      }
    }
  }
  return [...encontradas];
}

module.exports = { contieneMalasPalabras: contiene, encontrarMalasPalabras: encontrar };
