async function cargarNotificaciones() {
  const contenedor = document.getElementById('notif-list');
  if (!contenedor) return;

  contenedor.innerHTML = '<p class="notif-loading">Cargando...</p>';

  try {
    const res = await fetch('/api/notificaciones', { credentials: 'include' });
    if (!res.ok) { contenedor.innerHTML = '<p>Error al cargar notificaciones.</p>'; return; }

    const notis = await res.json();
    if (notis.length === 0) {
      contenedor.innerHTML = '<div class="notif-empty"><span class="material-symbols-outlined">notifications_off</span><p>No tienes notificaciones.</p></div>';
      return;
    }

    contenedor.innerHTML = '';
    notis.forEach(n => {
      const div = document.createElement('div');
      div.className = `notif-item${n.leida ? ' leida' : ''}`;
      div.dataset.id = n.id;

      const fecha = new Date(n.fecha_creacion);
      const fechaStr = fecha.toLocaleDateString('es-CO', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      div.innerHTML = `
        <div class="notif-indicator${n.leida ? '' : ' no-leida'}"></div>
        <div class="notif-body">
          <strong class="notif-titulo">${escapeHtml(n.titulo)}</strong>
          ${n.mensaje ? `<p class="notif-mensaje">${escapeHtml(n.mensaje)}</p>` : ''}
          <small class="notif-fecha">${fechaStr}</small>
        </div>
        ${n.enlace ? `<a href="${escapeHtml(n.enlace)}" class="notif-enlace"><span class="material-symbols-outlined">open_in_new</span></a>` : ''}
      `;

      if (!n.leida) {
        div.addEventListener('click', () => marcarLeida(n.id, div));
      }

      contenedor.appendChild(div);
    });
  } catch (err) {
    contenedor.innerHTML = '<p>Error de conexión.</p>';
    console.error('[notificaciones] Error:', err);
  }
}

async function marcarLeida(id, elemento) {
  try {
    await fetch(`/api/notificaciones/${id}/leer`, {
      method: 'PUT', credentials: 'include'
    });
    elemento.classList.add('leida');
    const indicador = elemento.querySelector('.notif-indicator');
    if (indicador) indicador.classList.remove('no-leida');
  } catch (err) {
    console.error('[notificaciones] Error al marcar leída:', err);
  }
}

document.getElementById('btn-leer-todas')?.addEventListener('click', async () => {
  try {
    await fetch('/api/notificaciones/leer-todas', {
      method: 'PUT', credentials: 'include'
    });
    document.querySelectorAll('.notif-item').forEach(el => {
      el.classList.add('leida');
      const ind = el.querySelector('.notif-indicator');
      if (ind) ind.classList.remove('no-leida');
    });
  } catch (err) {
    console.error('[notificaciones] Error al marcar todas:', err);
  }
});

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', cargarNotificaciones);
