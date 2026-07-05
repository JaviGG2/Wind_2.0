document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('modulos-grid');
  const loading = document.getElementById('modulos-loading');
  const empty = document.getElementById('modulos-empty');

  async function obtenerPerfil() {
    try {
      const res = await fetch('/auth/perfil', { credentials: 'include' });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }

  function crearCard(m, i, perfil) {
    const esCreador = perfil && perfil.id === m.id_usuario;
    return `
      <a href="/modulos/${m.id}" class="mod-card" style="animation-delay:${i * 80}ms">
        <div class="mod-card-header">
          <div class="mod-card-icon">
            <span class="material-symbols-outlined">layers</span>
          </div>
          <div class="mod-card-title">
            <h3>${m.nombre}</h3>
            <span class="mod-card-badge">
              <span class="material-symbols-outlined">stadia_controller</span>
              ${m.total_niveles} nivel(es)
            </span>
          </div>
        </div>
        <div class="mod-card-body">
          <p>${m.descripcion || 'Sin descripción'}</p>
        </div>
        <div class="mod-card-footer">
          <span class="mod-card-author" data-usuario-id="${m.id_usuario || ''}">
            <span class="material-symbols-outlined">person</span>
            <span class="mod-card-author-nombre">${m.creador_nombre || 'Anónimo'}</span>
          </span>
          <span class="mod-card-arrow">
            <span class="material-symbols-outlined">chevron_right</span>
          </span>
        </div>
      </a>
    `;
  }

  try {
    const [modulos, perfil] = await Promise.all([
      fetch('/api/modulos', { credentials: 'include' }).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      obtenerPerfil()
    ]);

    loading.style.display = 'none';

    if (!modulos || modulos.length === 0) {
      empty.style.display = 'block';
      return;
    }

    grid.style.display = 'grid';
    grid.innerHTML = modulos.map((m, i) => crearCard(m, i, perfil)).join('');

    grid.addEventListener('click', (e) => {
      const author = e.target.closest('.mod-card-author');
      if (author) {
        const usuarioId = author.dataset.usuarioId;
        if (usuarioId) {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = `/ver-perfil?id=${usuarioId}`;
        }
      }
    });
  } catch (e) {
    loading.style.display = 'none';
    grid.style.display = 'block';
    grid.style.textAlign = 'center';
    grid.style.padding = '40px 0';
    grid.style.color = '#dc2626';
    grid.textContent = 'Error al cargar los módulos. Intenta de nuevo.';
  }
});
