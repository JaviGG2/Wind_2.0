const TITULOS = [
  'Novato',
  'Explorador',
  'Cronista',
  'Investigador',
  'Historiador',
  'Erudito',
  'Guardián',
  'Maestro',
  'Leyenda',
  'Inmortal',
  'Mítico',
  'Trascendental',
];

function calcularNivel(puntos) {
  const nivel = Math.floor(Math.sqrt((puntos || 0) / 100)) + 1;
  const puntosSiguiente = Math.pow(nivel, 2) * 100;
  const puntosBase = Math.pow(nivel - 1, 2) * 100;
  const progreso = ((puntos - puntosBase) / (puntosSiguiente - puntosBase)) * 100;
  const titulo = TITULOS[Math.min(nivel - 1, TITULOS.length - 1)];

  return {
    nivel,
    titulo,
    puntos: puntos || 0,
    puntosSiguiente,
    puntosAnterior: puntosBase,
    progreso: Math.min(Math.max(Math.round(progreso), 0), 100),
  };
}

module.exports = { calcularNivel, TITULOS };
