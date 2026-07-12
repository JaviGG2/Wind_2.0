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
    const promedio = m.promedio_valoracion || 0;
    const likesCount = m.likes || 0;
    const miPunt = m.mi_puntuacion || 0;
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
          <div class="mod-card-footer-left">
            <span class="mod-card-author" data-usuario-id="${m.id_usuario || ''}">
              <span class="material-symbols-outlined">person</span>
              <span class="mod-card-author-nombre">${m.creador_nombre || 'Anónimo'}</span>
            </span>
            <button type="button" class="btn-valoracion" data-id="${m.id}" data-modulo>
              <span class="material-symbols-outlined btn-val-icon${miPunt > 0 ? ' rated' : ''}">${miPunt > 0 ? 'star' : 'star_outline'}</span>
              <span class="btn-val-promedio">${promedio > 0 ? promedio.toFixed(1) : '—'}</span>
              <span class="btn-val-count">(${likesCount})</span>
            </button>
          </div>
          <span class="mod-card-arrow">
            <span class="material-symbols-outlined">chevron_right</span>
          </span>
        </div>
      </a>
    `;
  }

  async function handleValClick(e) {
    const btn = e.target.closest('.btn-valoracion[data-modulo]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const id = parseInt(btn.dataset.id, 10);
    let miPunt = btn.querySelector('.btn-val-icon').classList.contains('rated') ? 1 : 0;
    abrirPopupValoracion(id, 'modulos', miPunt, async (val) => {
      try {
        const res = await fetch(`/api/modulos/${id}/like`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puntuacion: val })
        });
        if (res.ok) {
          const data = await res.json();
          const icon = btn.querySelector('.btn-val-icon');
          icon.textContent = data.mi_puntuacion > 0 ? 'star' : 'star_outline';
          icon.classList.toggle('rated', data.mi_puntuacion > 0);
          btn.querySelector('.btn-val-promedio').textContent = (data.promedio || 0).toFixed(1);
          btn.querySelector('.btn-val-count').textContent = `(${data.likes})`;
        } else if (res.status === 401) {
          window.location.href = '/login.html';
        }
      } catch (e) {
        console.error('Error al valorar:', e);
      }
    });
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

    grid.addEventListener('click', handleValClick);

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
