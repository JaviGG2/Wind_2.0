const params = new URLSearchParams(location.search);
const usuarioId = params.get('id');

if (!usuarioId) {
    document.querySelector('.perfil-root').innerHTML = '<p class="muted center" style="margin-top:40px;">Usuario no especificado.</p>';
} else {
    cargarPerfil(usuarioId);
}

async function cargarPerfil(id) {
    try {
        const res = await fetch(`/api/usuarios/${id}/perfil`, { credentials: 'include' });
        if (!res.ok) {
            document.querySelector('.perfil-root').innerHTML = '<p class="muted center" style="margin-top:40px;">Usuario no encontrado.</p>';
            return;
        }
        const user = await res.json();

        document.title = `${user.nombre} - Perfil - Wind`;

        const avatar = document.getElementById('perfil-avatar');
        avatar.src = user.imagen_perfil || '/img/avatar.svg';
        avatar.style.background = user.avatar_fondo || '#e8e8e8';

        document.getElementById('nombre-usuario').textContent = user.nombre;
        const usernameEl = document.getElementById('username');
        usernameEl.textContent = user.username ? `@${user.username}` : '';
        usernameEl.style.display = user.username ? '' : 'none';

        const rolEl = document.getElementById('rol-usuario');
        if (user.rol === 'Especialista') {
            rolEl.innerHTML = '<img src="/img/Rol.png" alt="" style="width:16px;height:16px;"> Especialista';
        } else {
            rolEl.textContent = user.rol || 'Natural';
        }

        if (user.nivel) {
            document.getElementById('nivel-badge').textContent = `Nv ${user.nivel.nivel}`;
            document.getElementById('nivel-titulo').textContent = user.nivel.titulo;
            document.getElementById('nivel-puntos-actual').textContent = user.nivel.puntos;
            document.getElementById('nivel-puntos-siguiente').textContent = user.nivel.puntosSiguiente;
            document.getElementById('nivel-progreso-bar').style.width = `${user.nivel.progreso}%`;
        }

        document.getElementById('stat-relatos').textContent = user.conteo_relatos;
        document.getElementById('stat-temas').textContent = user.conteo_temas;
        document.getElementById('stat-juegos').textContent = user.conteo_juegos;

    } catch (e) {
        console.error('Error al cargar perfil:', e);
        document.querySelector('.perfil-root').innerHTML = '<p class="muted center" style="margin-top:40px;">Error al cargar perfil.</p>';
    }
}

let cachedData = {};

async function toggleContenido(tipo) {
    const container = document.getElementById('perfil-contenido-expandido');
    const current = container.dataset.tipo;

    if (current === tipo) {
        container.dataset.tipo = '';
        container.innerHTML = '';
        container.classList.remove('abierto');
        document.querySelector(`.stat-card[data-tipo="${tipo}"]`)?.classList.remove('activo');
        return;
    }

    document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('activo'));
    document.querySelector(`.stat-card[data-tipo="${tipo}"]`)?.classList.add('activo');

    container.dataset.tipo = tipo;
    container.classList.add('abierto');
    container.innerHTML = '<p class="muted center" style="padding:20px 0;"><img src="/images/loading.svg" class="anim-loading" alt=""></p>';

    if (!cachedData[tipo]) {
        const url = tipo === 'relatos' ? `/api/relatos?usuario_id=${usuarioId}`
            : tipo === 'temas' ? `/api/temas?creador_id=${usuarioId}`
            : `/api/juegos?usuario_id=${usuarioId}`;
        try {
            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) throw new Error('Error');
            cachedData[tipo] = await res.json();
        } catch (e) {
            container.innerHTML = '<p class="muted center" style="padding:20px 0;">Error al cargar contenido.</p>';
            return;
        }
    }

    const items = cachedData[tipo];
    if (!items || items.length === 0) {
        container.innerHTML = `<p class="muted center" style="padding:20px 0;">Este usuario aún no ha publicado ${tipo}.</p>`;
        return;
    }

    if (tipo === 'relatos') renderRelatos(items, container);
    else if (tipo === 'temas') renderTemas(items, container);
    else renderJuegos(items, container);
}

function renderRelatos(lista, container) {
    container.innerHTML = '<div class="perfil-grid-contenido"></div>';
    const grid = container.querySelector('.perfil-grid-contenido');
    lista.slice(0, 20).forEach(r => {
        const a = document.createElement('a');
        a.className = 'perfil-item-card';
        a.href = `/ver-relato?id=${r.id}`;
        const fecha = r.fecha_publicacion ? new Date(r.fecha_publicacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '';
        a.innerHTML = `
            <div class="perfil-item-icon"><span class="material-symbols-outlined">auto_stories</span></div>
            <div class="perfil-item-body">
                <h4>${r.titulo || 'Sin título'}</h4>
                <small>${fecha}</small>
            </div>
            <span class="material-symbols-outlined perfil-item-arrow">chevron_right</span>
        `;
        grid.appendChild(a);
    });
}

function renderTemas(lista, container) {
    container.innerHTML = '<div class="perfil-grid-contenido"></div>';
    const grid = container.querySelector('.perfil-grid-contenido');
    lista.slice(0, 20).forEach(t => {
        const a = document.createElement('a');
        a.className = 'perfil-item-card';
        a.href = `/ver-tema?id=${t.id}`;
        const fecha = t.fecha_publicacion ? new Date(t.fecha_publicacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '';
        a.innerHTML = `
            <div class="perfil-item-icon"><span class="material-symbols-outlined">topic</span></div>
            <div class="perfil-item-body">
                <h4>${t.titulo || 'Sin título'}</h4>
                <small>${t.categoria_nombre || 'General'}${fecha ? ' · ' + fecha : ''}</small>
            </div>
            <span class="material-symbols-outlined perfil-item-arrow">chevron_right</span>
        `;
        grid.appendChild(a);
    });
}

function renderJuegos(lista, container) {
    container.innerHTML = '<div class="perfil-grid-contenido"></div>';
    const grid = container.querySelector('.perfil-grid-contenido');
    lista.slice(0, 20).forEach(j => {
        const a = document.createElement('a');
        a.className = 'perfil-item-card';
        a.href = `/play-game?id=${j.id}`;
        const tipoIcon = { Quiz: 'quiz', Memory: 'memory', Match: 'link', Scramblee: 'abc' }[j.tipo] || 'stadia_controller';
        a.innerHTML = `
            <div class="perfil-item-icon"><span class="material-symbols-outlined">${tipoIcon}</span></div>
            <div class="perfil-item-body">
                <h4>${j.titulo || 'Sin título'}</h4>
                <small>${j.categoria_nombre || 'General'} · ${j.tipo || 'Juego'} · ${j.puntos_recompensa || 0} pts</small>
            </div>
            <span class="material-symbols-outlined perfil-item-arrow">chevron_right</span>
        `;
        grid.appendChild(a);
    });
}
