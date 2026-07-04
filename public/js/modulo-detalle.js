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

    const esCreador = perfil && (perfil.id === modulo.id_usuario || perfil.rol === 'Especialista');

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

    const adminBtn = esCreador
      ? `<a href="/admin/editar-modulo?id=${moduloId}" class="btn-outline modulo-admin-link" style="display:inline-flex;align-items:center;gap:6px;">
           <span class="material-symbols-outlined">add</span> Agregar nivel
         </a>`
      : '';

    container.innerHTML = `
      <div class="modulo-detalle-hero">
        <h2>${modulo.nombre}</h2>
        <p>${modulo.descripcion || ''}</p>
        <div class="modulo-progress-compact">
          <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
          <span class="label">${progress}/${total} niveles</span>
        </div>
        ${adminBtn}
      </div>
      <div class="niveles-listado">${nivelesHtml || '<p style="text-align:center;color:#9ca3af;padding:40px 0;">Este módulo aún no tiene niveles.</p>'}</div>
    `;
  } catch (e) {
    container.innerHTML = '<p style="color:red;">Error al cargar el módulo.</p>';
  }
});
