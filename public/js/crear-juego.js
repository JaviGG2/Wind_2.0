const formularioQuiz = document.getElementById('formulario-quiz');
const formularioMemory = document.getElementById('formulario-Memory');
const formularioMatch = document.getElementById('formulario-Match');
const formularioScramblee = document.getElementById('formulario-Scramblee');
const bloqueMensaje = document.getElementById('mensaje-consola');

function datosBase() {
  let t = document.getElementById('selector-genero').value;
  if (t === 'quiz') t = 'Quiz';
  return { tipo: t, puntos_recompensa: 10 };
}

formularioQuiz?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    ...datosBase(),
    pregunta: document.getElementById('pregunta').value,
    opcion_a: document.getElementById('opcion_a').value,
    opcion_b: document.getElementById('opcion_b').value,
    opcion_c: document.getElementById('opcion_c').value,
    opcion_correcta: document.getElementById('opcion_correcta').value,
    puntos_recompensa: document.getElementById('puntos_quiz').value
  };
  await enviar(body);
});

formularioMemory?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const palabras = [...document.querySelectorAll('#contenedor-parejas input')].map(i => i.value.trim()).filter(Boolean);
  if (palabras.length < 2) { mostrarMensaje('Agrega al menos 2 palabras.', 'error'); return; }
  const body = {
    ...datosBase(),
    pregunta: palabras.join(','),
    opcion_a: '', opcion_b: '', opcion_c: '',
    opcion_correcta: 'A',
    puntos_recompensa: document.getElementById('puntos_memory').value
  };
  await enviar(body);
});

formularioMatch?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const conceptos = [], respuestas = [];
  document.querySelectorAll('.bloque-match').forEach(bloque => {
    const inputs = bloque.querySelectorAll('input');
    if (inputs.length >= 2) {
      const c = inputs[0].value.trim(), r = inputs[1].value.trim();
      if (c && r) { conceptos.push(c); respuestas.push(r); }
    }
  });
  if (conceptos.length < 2) { mostrarMensaje('Agrega al menos 2 pares.', 'error'); return; }
  const body = {
    ...datosBase(),
    pregunta: conceptos.join(','),
    opcion_a: respuestas.join(','),
    opcion_b: '', opcion_c: '',
    opcion_correcta: 'A',
    puntos_recompensa: document.getElementById('puntos_match').value
  };
  await enviar(body);
});

formularioScramblee?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    ...datosBase(),
    pregunta: document.getElementById('scramble-pista').value,
    opcion_a: document.getElementById('scramble-palabra').value,
    opcion_b: '', opcion_c: '',
    opcion_correcta: 'A',
    puntos_recompensa: document.getElementById('puntos_scramble').value
  };
  await enviar(body);
});

async function enviar(body) {
  try {
    const r = await fetch('/admin/crear-juego', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const data = await r.json();
    if (r.ok) {
      mostrarMensaje(data.mensaje || 'Juego publicado!', 'exito');
      document.querySelectorAll('.formulario-juego').forEach(f => f.reset());
    } else {
      mostrarMensaje(data.mensaje || 'Error.', 'error');
    }
  } catch (err) {
    mostrarMensaje('Error de conexión.', 'error');
  }
}

function mostrarMensaje(texto, tipo) {
  bloqueMensaje.textContent = texto;
  bloqueMensaje.className = `mensaje-alerta ${tipo}`;
}
