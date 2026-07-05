document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('modulos-listado');
  const mensaje = document.getElementById('modulos-mensaje');

  try {
    const res = await fetch('/api/modulos', { credentials: 'include' });
    if (!res.ok) throw new Error('Error al cargar');
    const modulos = await res.json();

    if (modulos.length === 0) {
      container.innerHTML = '<div class="juegos-empty"><span class="material-symbols-outlined">layers</span><p>No hay módulos disponibles aún.</p></div>';
      return;
    }

    container.innerHTML = modulos.map((m, i) => `
      <a href="/modulos/${m.id}" class="modulo-card" style="animation-delay:${i * 80}ms">
        <div class="modulo-card-top">
          <div class="modulo-card-icon"><span class="material-symbols-outlined">layers</span></div>
          <div class="modulo-card-top-info">
            <h3>${m.nombre}</h3>
            <span class="niveles-badge"><span class="material-symbols-outlined">stadia_controller</span> ${m.total_niveles} nivel(es)</span>
          </div>
        </div>
        <div class="modulo-card-body">
          <p>${m.descripcion || 'Sin descripción'}</p>
          <div class="modulo-card-footer">
            <span class="creador" data-usuario-id="${m.id_usuario || ''}"><span class="material-symbols-outlined">person</span> <span class="creador-nombre">${m.creador_nombre || ''}</span></span>
            <span class="niveles-count"><span class="material-symbols-outlined">chevron_right</span></span>
          </div>
        </div>
      </a>
    `).join('');

    container.addEventListener('click', (e) => {
      const creador = e.target.closest('.creador');
      if (creador) {
        const usuarioId = creador.dataset.usuarioId;
        if (usuarioId) {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = `/ver-perfil?id=${usuarioId}`;
        }
      }
    });
  } catch (e) {
    mensaje.textContent = 'Error al cargar módulos.';
    mensaje.className = 'mensaje-alerta error';
  }
});
