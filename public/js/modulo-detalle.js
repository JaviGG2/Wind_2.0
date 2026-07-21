document.addEventListener('DOMContentLoaded', async () => {
  const moduloId = window.location.pathname.split('/modulos/')[1];
  const container = document.getElementById('modulo-detalle');

  if (!moduloId) {
    container.innerHTML = '<p style="color:red;">ID no especificado.</p>';
    return;
  }

  try {
    const [moduloRes, perfilRes] = await Promise.all([
      fetch(`/api/modulos/${moduloId}`, { credentials: 'include' }),
      fetch('/auth/perfil', { credentials: 'include' }),
      new Promise(r => setTimeout(r, 1000))
    ]);
    if (!moduloRes.ok) throw new Error('Error');
    const modulo = await moduloRes.json();

    let perfil = null;
    if (perfilRes.ok) perfil = await perfilRes.json();

    const esCreador = perfil && Number(perfil.id) === Number(modulo.id_usuario);
    const esEspecialista = perfil && perfil.rol === 'Especialista';

    const progress = modulo.niveles.filter(n => n.completado).length;
    const total = modulo.niveles.length;
    const pct = total ? (progress / total * 100) : 0;

    let nivelesHtml = modulo.niveles.map((n, i) => {
      const icono = n.estado === 'completado' ? 'check_circle' : (n.estado === 'bloqueado' ? 'lock' : 'play_circle');
      const clase = `nivel-card nivel-${n.estado}`;
      const href = n.estado === 'bloqueado' ? '#' : (n.estado === 'completado' ? '#' : `/juegos?id=${n.id_juego}&modulo=${moduloId}&nivel=${n.id}`);
      const onclick = n.estado === 'bloqueado' ? 'return false;' : '';
      const tipoIcon = { Quiz: 'quiz', Memory: 'memory', Match: 'link', Scramblee: 'abc' }[n.tipo] || 'quiz';
      return `
        <a href="${href}" class="${clase}" onclick="${onclick}" style="animation-delay:${i * 80}ms">
          <div class="nivel-icono"><span class="material-symbols-outlined">${icono}</span></div>
          <div class="nivel-info">
            <div class="nivel-nombre">
              <span class="material-symbols-outlined" style="font-size:1rem;">${tipoIcon}</span>
              ${n.nombre}
            </div>
            <div class="nivel-desc">${n.pregunta || n.descripcion || 'Sin descripción'}</div>
          </div>
          <div class="nivel-estado">
            ${n.estado === 'completado' ? '<span class="nivel-puntos"><span class="material-symbols-outlined" style="font-size:0.85rem;">star</span> +' + n.puntos_obtenidos + '</span>' : ''}
            ${n.estado === 'disponible' ? '<span class="material-symbols-outlined" style="color:#FF4500;">chevron_right</span>' : ''}
          </div>
        </a>
      `;
    }).join('');

    const eliminarBtn = esCreador
      ? `<button type="button" class="btn-outline btn-eliminar-modulo" data-id="${moduloId}" style="display:inline-flex;align-items:center;gap:6px;color:#dc2626;border-color:#dc2626;">
           <span class="material-symbols-outlined">delete</span> Eliminar módulo
         </button>`
      : '';

    const adminBtn = esCreador
      ? `<div class="modulo-admin-actions">
           <a href="/admin/editar-modulo?id=${moduloId}" class="btn-outline modulo-admin-link" style="display:inline-flex;align-items:center;gap:6px;">
             <span class="material-symbols-outlined">add</span> Agregar nivel
           </a>
           ${eliminarBtn}
         </div>`
      : eliminarBtn;

    container.innerHTML = `
      <div class="modulo-detalle-hero anim-fade-in">
        <h2>${modulo.nombre}</h2>
        <p>${modulo.descripcion || ''}</p>
        <div class="modulo-progress-compact">
          <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
          <span class="label">${progress}/${total} niveles</span>
        </div>
        ${adminBtn}
      </div>
      <div class="valoracion-section" id="valoracion-section">
        <div class="valoracion-header">
          <span class="material-symbols-outlined">star</span>
          Valoraciones
        </div>
        <div class="valoracion-body">
          <div class="valoracion-promedio" id="val-promedio">${(modulo.promedio_valoracion || 0) > 0 ? modulo.promedio_valoracion + ' ★' : '—'}</div>
          <div class="star-rating" id="star-rating-detalle">
            ${[1,2,3,4,5].map(n => `<span class="star${(modulo.mi_puntuacion || 0) >= n ? ' active' : ''}" data-val="${n}"><span class="material-symbols-outlined">star</span></span>`).join('')}
          </div>
          <div class="valoracion-count" id="val-count">(${modulo.likes || 0} valoraciones)</div>
        </div>
      </div>
      <div class="niveles-listado">${nivelesHtml || '<p style="text-align:center;color:#9ca3af;padding:40px 0;">Este módulo aún no tiene niveles.</p>'}</div>
    `;

    initValoracion(modulo);

    document.querySelector('.btn-eliminar-modulo')?.addEventListener('click', async function() {
      if (!confirm('¿Estás seguro de eliminar este módulo? Se borrarán todos sus niveles y juegos. Esta acción no se puede deshacer.')) return;
      try {
        const res = await fetch(`/api/modulos-admin/${this.dataset.id}`, { method: 'DELETE', credentials: 'include' });
        if (!res.ok) { const d = await res.json(); alert(d.mensaje || 'Error'); return; }
        window.location.href = '/modulos';
      } catch { alert('Error de conexión.'); }
    });
  } catch (e) {
    container.innerHTML = '<p style="color:red;">Error al cargar el módulo.</p>';
  }

  function initValoracion(modulo) {
    const section = document.getElementById('valoracion-section');
    const stars = section?.querySelectorAll('.star-rating .star');
    const promedioEl = document.getElementById('val-promedio');
    const countEl = document.getElementById('val-count');
    if (!stars?.length) return;

    const id = modulo.id;
    let miPunt = modulo.mi_puntuacion || null;

    function renderStars(punt) {
      stars.forEach(s => {
        const val = parseInt(s.dataset.val, 10);
        s.classList.toggle('active', val <= punt);
      });
    }

    function renderStats(promedio, total) {
      if (promedioEl) promedioEl.textContent = promedio ? `${promedio} ★` : '—';
      if (countEl) countEl.textContent = `(${total || 0} valoraciones)`;
    }

    if (miPunt) renderStars(miPunt);
    renderStats(modulo.promedio_valoracion, modulo.likes);

    stars.forEach(s => {
      s.addEventListener('click', async () => {
        const val = parseInt(s.dataset.val, 10);
        try {
          const res = await fetch(`/api/modulos/${id}/like`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ puntuacion: val })
          });
          if (!res.ok) { if (res.status === 401) window.location.href = '/login.html'; return; }
          const data = await res.json();
          miPunt = data.mi_puntuacion;
          renderStars(miPunt);
          renderStats(data.promedio, data.likes);
        } catch (e) { console.error('Error valoracion:', e); }
      });
    });
  }
});
