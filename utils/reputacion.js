const RANGOS = [
  { nivel: 0, titulo: 'Colaborador', minimo: 0 },
  { nivel: 1, titulo: 'Contribuyente', minimo: 50 },
  { nivel: 2, titulo: 'Curador', minimo: 150 },
  { nivel: 3, titulo: 'Experto', minimo: 300 },
  { nivel: 4, titulo: 'Guardián', minimo: 500 },
  { nivel: 5, titulo: 'Maestro', minimo: 800 },
];

function calcularRangoReputacion(puntos) {
  let rango = RANGOS[0];
  for (const r of RANGOS) {
    if ((puntos || 0) >= r.minimo) rango = r;
  }
  const actual = rango;
  const siguiente = RANGOS[Math.min(rango.nivel + 1, RANGOS.length - 1)];
  const progresoBase = actual.minimo;
  const progresoSiguiente = siguiente.minimo;
  const progreso = progresoSiguiente > progresoBase
    ? ((puntos - progresoBase) / (progresoSiguiente - progresoBase)) * 100
    : 100;

  return {
    nivel: actual.nivel,
    titulo: actual.titulo,
    puntos: puntos || 0,
    puntosSiguiente: progresoSiguiente > progresoBase ? progresoSiguiente : actual.minimo + 1,
    puntosAnterior: progresoBase,
    progreso: Math.min(Math.max(Math.round(progreso), 0), 100),
  };
}

module.exports = { calcularRangoReputacion, RANGOS };
