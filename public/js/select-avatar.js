const ESTILOS = ['avataaars', 'adventurer', 'shapes', 'lorelei'];
const NOMBRES_ESTILOS = { avataaars: 'Avataaars', adventurer: 'Aventurero', shapes: 'Formas', lorelei: 'Lorelei' };

let currentStyle = 'avataaars';
let currentPreviews = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/auth/perfil', { credentials: 'include' });
        if (!res.ok) { window.location.href = '/login'; return; }
        const user = await res.json();
        const img = document.getElementById('selavatar-current-img');
        if (user.imagen_perfil) img.src = user.imagen_perfil;
    } catch {
        window.location.href = '/login';
        return;
    }

    const tabsContainer = document.getElementById('selavatar-tabs');
    ESTILOS.forEach(estilo => {
        const btn = document.createElement('button');
        btn.className = 'selavatar-tab' + (estilo === currentStyle ? ' active' : '');
        btn.textContent = NOMBRES_ESTILOS[estilo] || estilo;
        btn.dataset.estilo = estilo;
        btn.addEventListener('click', () => switchStyle(estilo));
        tabsContainer.appendChild(btn);
    });

    await loadPreviews();

    document.getElementById('selavatar-more').addEventListener('click', loadPreviews);
});

async function switchStyle(estilo) {
    currentStyle = estilo;
    document.querySelectorAll('.selavatar-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.selavatar-tab[data-estilo="${estilo}"]`)?.classList.add('active');
    showSkeletons();
    await loadPreviews();
}

function showSkeletons() {
    const grid = document.getElementById('selavatar-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const sk = document.createElement('div');
        sk.className = 'selavatar-skeleton';
        grid.appendChild(sk);
    }
}

async function loadPreviews() {
    const btn = document.getElementById('selavatar-more');
    btn.classList.add('loading');

    const grid = document.getElementById('selavatar-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const sk = document.createElement('div');
        sk.className = 'selavatar-skeleton';
        grid.appendChild(sk);
    }

    try {
        const res = await fetch(`/api/avatar/previews?estilo=${currentStyle}&count=12`, { credentials: 'include' });
        if (!res.ok) throw new Error('Error');

        const data = await res.json();
        currentPreviews = data.previews;
        renderGrid(currentPreviews);
    } catch {
        grid.innerHTML = '<p class="selavatar-msg error">Error al cargar avatares.</p>';
    } finally {
        btn.classList.remove('loading');
    }
}

function renderGrid(previews) {
    const grid = document.getElementById('selavatar-grid');
    grid.innerHTML = '';

    previews.forEach(p => {
        const item = document.createElement('div');
        item.className = 'selavatar-item';
        item.dataset.seed = p.seed;
        item.dataset.estilo = p.estilo;

        const img = document.createElement('img');
        img.src = p.dataUri;
        img.alt = 'Avatar';
        img.loading = 'lazy';
        item.appendChild(img);

        item.addEventListener('click', () => selectAvatar(p.seed, p.estilo, item));
        grid.appendChild(item);
    });
}

async function selectAvatar(seed, estilo, element) {
    document.querySelectorAll('.selavatar-item.selected').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    try {
        const res = await fetch('/api/avatar/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ seed, estilo })
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('selavatar-current-img').src = data.imagen_perfil;
        } else {
            console.error('Error al seleccionar avatar:', data.mensaje);
        }
    } catch (e) {
        console.error('Error de conexión:', e);
    }
}