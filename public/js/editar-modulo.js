const moduloId = new URLSearchParams(window.location.search).get('id');

document.addEventListener('DOMContentLoaded', async () => {
  if (!moduloId) { document.getElementById('modulo-info').innerHTML = '<p style="color:red;">ID no especificado.</p>'; return; }

  document.querySelectorAll('#tipo-selector .tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tipo-selector .tipo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tipo = btn.dataset.tipo;
      document.getElementById('juego-tipo').value = tipo;
      document.querySelectorAll('.campo-juego').forEach(el => {
        el.classList.toggle('visible', el.dataset.tipo === tipo);
        el.querySelectorAll('input, textarea, select').forEach(r => r.required = false);
      });
      document.querySelectorAll('.campo-juego.visible input, .campo-juego.visible textarea, .campo-juego.visible select').forEach(r => r.required = true);
    });
  });

  await cargarModulo();
  await cargarNiveles();
});

document.getElementById('form-agregar-nivel').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;

  const tipo = document.getElementById('juego-tipo').value;
  const body = {
    nombre: document.getElementById('nivel-nombre').value,
    descripcion: document.getElementById('nivel-descripcion').value,
    tipo: tipo,
    puntos: document.getElementById('juego-puntos').value
  };

  if (tipo === 'Quiz') {
    body.pregunta = document.getElementById('juego-pregunta').value;
    body.opcion_a = document.getElementById('juego-opcion_a').value;
    body.opcion_b = document.getElementById('juego-opcion_b').value;
    body.opcion_c = document.getElementById('juego-opcion_c').value;
    body.correcta = document.getElementById('juego-correcta').value;
  } else if (tipo === 'Memory') {
    const palabras = [...document.querySelectorAll('.memory-input')].map(i => i.value).filter(Boolean);
    if (palabras.length < 2) { alert('Agrega al menos 2 palabras para Memory.'); btn.disabled = false; return; }
    body.pregunta = palabras.join(',');
    body.opcion_a = '';
    body.opcion_b = '';
    body.opcion_c = '';
    body.correcta = 'A';
  } else if (tipo === 'Match') {
    const filas = document.querySelectorAll('.match-fila');
    const conceptos = [], respuestas = [];
    filas.forEach(f => {
      const c = f.querySelector('.match-concepto').value.trim();
      const r = f.querySelector('.match-respuesta').value.trim();
      if (c && r) { conceptos.push(c); respuestas.push(r); }
    });
    if (conceptos.length < 2) { alert('Agrega al menos 2 pares para Match.'); btn.disabled = false; return; }
    body.pregunta = conceptos.join(',');
    body.opcion_a = respuestas.join(',');
    body.opcion_b = '';
    body.opcion_c = '';
    body.correcta = 'A';
  } else if (tipo === 'Scramblee') {
    body.pregunta = document.getElementById('juego-pista').value;
    body.opcion_a = document.getElementById('juego-palabra').value;
    body.opcion_b = '';
    body.opcion_c = '';
    body.correcta = 'A';
  }

  try {
    const res = await fetch(`/api/modulos-admin/${moduloId}/niveles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      window.location.href = '/modulos/' + moduloId;
    } else {
      alert(data.mensaje || 'Error');
    }
  } catch (e) {
    alert('Error de conexión.');
  } finally {
    btn.disabled = false;
  }
});

async function cargarModulo() {
  try {
    const res = await fetch(`/api/modulos/${moduloId}`, { credentials: 'include' });
    if (!res.ok) return;
    const modulo = await res.json();
    document.getElementById('modulo-info').innerHTML = `
      <div class="crear-card">
        <h2 style="margin:0 0 4px;">${modulo.nombre}</h2>
        <p style="margin:0;color:var(--texto-sec);font-size:var(--font-sm);">${modulo.descripcion || ''}</p>
      </div>
    `;
  } catch (e) {
    console.error(e);
  }
}

async function cargarNiveles() {
  try {
    const res = await fetch(`/api/modulos/${moduloId}`, { credentials: 'include' });
    if (!res.ok) return;
    const modulo = await res.json();
    const container = document.getElementById('niveles-listado-admin');

    if (!modulo.niveles || modulo.niveles.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#777;">Sin niveles aún. Agrega el primero arriba.</p>';
      return;
    }

    container.innerHTML = modulo.niveles.map((n, i) => `
      <div class="modulo-admin-item" style="margin-top:0;">
        <div>
          <strong>${n.nombre}</strong>
          <p style="margin:4px 0 0;font-size:0.85rem;color:#666;">${getTipoIcon(n.tipo || 'Quiz')} ${n.pregunta ? n.pregunta.slice(0, 50) : ''} · Orden ${n.orden}</p>
        </div>
        <button class="btn-eliminar-nivel" data-nivel-id="${n.id}" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:1.2rem;">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    `).join('');

    container.querySelectorAll('.btn-eliminar-nivel').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este nivel?')) return;
        await fetch(`/api/modulos-admin/${moduloId}/niveles/${btn.dataset.nivelId}`, { method: 'DELETE', credentials: 'include' });
        await cargarNiveles();
      });
    });
  } catch (e) {
    console.error(e);
  }
}

function getTipoIcon(tipo) {
  const map = { Quiz: 'quiz', Memory: 'memory', Match: 'link', Scramblee: 'abc' };
  return `<span class="material-symbols-outlined" style="font-size:1rem;vertical-align:middle;">${map[tipo] || 'quiz'}</span>`;
}
