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
    const [resRanking, resPerfil] = await Promise.all([
      fetch('/api/juegos/ranking'),
      fetch('/auth/perfil', { credentials: 'include' })
    ]);
    if (!resRanking.ok) { lista.innerHTML = '<p class="ranking-empty">Error al cargar ranking.</p>'; return; }
    const data = await resRanking.json();
    let usuarioActual = null;
    if (resPerfil.ok) usuarioActual = await resPerfil.json();

    if (count) count.textContent = `${data.length} jugador(es)`;

    if (data.length === 0) {
      lista.innerHTML = '<div class="ranking-empty"><span class="material-symbols-outlined">emoji_events</span><p>Aún no hay jugadores con puntos. ¡Sé el primero!</p></div>';
      return;
    }

    lista.innerHTML = '';

    const top3Container = document.getElementById('top3-podium');
    if (top3Container) {
      top3Container.innerHTML = '';
      data.slice(0, 3).forEach((user, i) => {
        const avatarUrl = user.imagen_perfil || '/img/avatar.svg';
        const avatarBg = user.avatar_fondo || '#e8e8e8';
        const nombre = user.nombre || user.username || `Usuario #${user.id}`;
        const titulo = calcularTitulo(user.puntos);
        const badge = i === 0 ? '1' : i === 1 ? '2' : '3';

        const card = document.createElement('div');
        card.className = 'top3-card';
        card.style.animationDelay = `${i * 120}ms`;
        card.innerHTML = `
          <div class="top3-badge">${badge}</div>
          <img class="top3-avatar" src="${avatarUrl}" alt="" style="background-color:${avatarBg}" loading="lazy">
          <div class="top3-name">${escapeHtml(nombre)}</div>
          <div class="top3-title">${titulo}</div>
          <div class="top3-points">
            <span class="material-symbols-outlined">star</span>
            ${user.puntos || 0}
          </div>
          ${user.batallo_esta_semana ? '<div class="batallo-badge">Batalló ✓</div>' : ''}
        `;
        top3Container.appendChild(card);
      });

      const top3Ids = data.slice(0, 3).map(u => u.id);
      if (usuarioActual && top3Ids.includes(usuarioActual.id)) {
        verificarYBotonBatalla(usuarioActual.id);
      }
    }

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

async function verificarYBotonBatalla(uid) {
  const podiumParent = document.getElementById('top3-podium').parentElement;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'text-align:center;margin-top:20px';

  try {
    const res = await fetch('/api/batallas/ya-participe', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data.yaParticipe) {
        wrap.innerHTML = '<div class="batallo-msg">Ya batallaste esta semana ✓</div>';
        podiumParent.appendChild(wrap);
        return;
      }
    }
  } catch {}

  const btn = document.createElement('button');
  btn.id = 'btn-iniciar-batalla';
  btn.className = 'batalla-btn';
  btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">swords</span> Iniciar batalla';
  btn.addEventListener('click', iniciarBatalla);
  wrap.appendChild(btn);
  podiumParent.appendChild(wrap);
}

async function iniciarBatalla() {
  const btn = document.getElementById('btn-iniciar-batalla');
  btn.disabled = true;
  btn.textContent = 'Creando batalla...';
  try {
    const res = await fetch('/api/batallas/crear', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (res.ok) {
      window.location.href = `/batalla?id=${data.batalla_id}`;
    } else {
      alert(data.mensaje || 'Error al crear batalla.');
      btn.disabled = false;
      btn.textContent = 'Iniciar batalla';
    }
  } catch {
    alert('Error de conexión.');
    btn.disabled = false;
    btn.textContent = 'Iniciar batalla';
  }
}

document.addEventListener('DOMContentLoaded', cargarRanking);
