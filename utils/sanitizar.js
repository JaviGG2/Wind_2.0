function limpiarTexto(valor, maxLen) {
  if (valor === null || valor === undefined) return '';
  let texto = String(valor);
  texto = texto.replace(/<[^>]*>/g, ' ');
  texto = texto.replace(/<[^>\n]*$/gm, ' ');
  texto = texto.replace(/[<>]/g, ' ');
  texto = texto.replace(/&nbsp;/gi, ' ')
               .replace(/&amp;/gi, '&')
               .replace(/&lt;/gi, '<')
               .replace(/&gt;/gi, '>')
               .replace(/&quot;/gi, '"')
               .replace(/&#39;/gi, "'")
               .replace(/&apos;/gi, "'")
               .replace(/&ndash;/gi, '-')
               .replace(/&mdash;/gi, '—')
               .replace(/&hellip;/gi, '…');
  texto = texto.replace(/\s+/g, ' ').trim();
  if (maxLen && texto.length > maxLen) texto = texto.substring(0, maxLen).trim();
  return texto;
}

function limpiarJuego(juego) {
  if (!juego) return juego;
  ['titulo', 'pregunta', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_correcta'].forEach(campo => {
    if (juego[campo] !== undefined && juego[campo] !== null) {
      juego[campo] = limpiarTexto(juego[campo]);
    }
  });
  return juego;
}

module.exports = { limpiarTexto, limpiarJuego };
