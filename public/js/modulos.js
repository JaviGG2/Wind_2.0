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
        <div class="modulo-card-accent"></div>
        <div class="modulo-card-body">
          <div class="modulo-card-icon"><span class="material-symbols-outlined">layers</span></div>
          <h3>${m.nombre}</h3>
          <p>${m.descripcion || 'Sin descripción'}</p>
          <div class="modulo-card-footer">
            <span class="creador"><span class="material-symbols-outlined">person</span> ${m.creador_nombre}</span>
            <span class="niveles-count"><span class="material-symbols-outlined">stadia_controller</span> ${m.total_niveles} nivel(es)</span>
          </div>
        </div>
      </a>
    `).join('');
  } catch (e) {
    mensaje.textContent = 'Error al cargar módulos.';
    mensaje.className = 'mensaje-alerta error';
  }
});
