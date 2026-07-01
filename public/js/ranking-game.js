const TITULOS_RANKING = [
  'Novato', 'Explorador', 'Cronista', 'Investigador',
  'Historiador', 'Erudito', 'Guardián', 'Maestro',
  'Leyenda', 'Inmortal', 'Mítico', 'Trascendental',
];

function calcularTitulo(puntos) {
  const nivel = Math.floor(Math.sqrt((puntos || 0) / 100)) + 1;
  return TITULOS_RANKING[Math.min(nivel - 1, TITULOS_RANKING.length - 1)];
}

async function cargarRanking() {
  const lista = document.getElementById('ranking-lista');
  const count = document.getElementById('ranking-count');
  if (!lista) return;

  try {
    const res = await fetch('/api/juegos/ranking');
    if (!res.ok) { lista.innerHTML = '<p class="ranking-empty">Error al cargar ranking.</p>'; return; }
    const data = await res.json();

    if (count) count.textContent = `${data.length} jugador(es)`;

    if (data.length === 0) {
      lista.innerHTML = '<div class="ranking-empty"><span class="material-symbols-outlined">emoji_events</span><p>Aún no hay jugadores con puntos. ¡Sé el primero!</p></div>';
      return;
    }

    lista.innerHTML = '';

    data.forEach((user, i) => {
      const pos = i + 1;
      let posClass = '';
      if (pos === 1) posClass = 'top1';
      else if (pos === 2) posClass = 'top2';
      else if (pos === 3) posClass = 'top3';

      const avatarUrl = user.imagen_perfil || '/img/avatar.svg';
      const avatarBg = user.avatar_fondo || '#e8e8e8';
      const nombre = user.nombre || user.username || `Usuario #${user.id}`;
      const titulo = calcularTitulo(user.puntos);

      const item = document.createElement('div');
      item.className = 'ranking-item anim-fade-down';
      item.style.animationDelay = `${i * 40}ms`;
      item.innerHTML = `
        <div class="ranking-pos ${posClass}">${pos}</div>
        <img class="ranking-avatar" src="${avatarUrl}" alt="" style="background-color:${avatarBg}" loading="lazy">
        <div class="ranking-info">
          <div class="ranking-nombre">${escapeHtml(nombre)}</div>
          <div class="ranking-titulo">${titulo}</div>
        </div>
        <div class="ranking-puntos">
          <span class="material-symbols-outlined">star</span>
          ${user.puntos || 0}
        </div>
      `;
      lista.appendChild(item);
    });
  } catch (err) {
    console.error('[ranking] Error:', err);
    lista.innerHTML = '<p class="ranking-empty">Error de conexión.</p>';
  }
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', cargarRanking);
