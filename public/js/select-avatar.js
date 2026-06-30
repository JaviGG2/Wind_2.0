const ESTILOS = ['avataaars', 'adventurer', 'shapes', 'lorelei', 'bottts', 'identicon', 'open-peeps', 'pixel-art', 'fun-emoji'];
const NOMBRES_ESTILOS = {
  avataaars: 'Avataaars', adventurer: 'Aventurero', shapes: 'Formas', lorelei: 'Lorelei',
  bottts: 'Robots', identicon: 'Identicon', 'open-peeps': 'Peeps', 'pixel-art': 'Pixel', 'fun-emoji': 'Emoji'
};

const COLORES_PREDEFINIDOS = [
  '#e8e8e8', '#ffcdd2', '#f8bbd0', '#e1bee7',
  '#bbdefb', '#b3e5fc', '#b2ebf2', '#b2dfdb',
  '#c8e6c9', '#dcedc8', '#fff9c4', '#ffe0b2'
];

let currentStyle = 'avataaars';
let currentPreviews = [];
let currentColor = '#e8e8e8';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/auth/perfil', { credentials: 'include' });
        if (!res.ok) { window.location.href = '/login'; return; }
        const user = await res.json();
        const img = document.getElementById('selavatar-current-img');
        if (user.imagen_perfil) img.src = user.imagen_perfil;
        if (user.avatar_fondo) {
            currentColor = user.avatar_fondo;
            applyColor(currentColor);
        }
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

    renderColorOptions();

    document.getElementById('selavatar-color-picker').addEventListener('input', (e) => {
        selectColor(e.target.value);
    });

    await loadPreviews();
    document.getElementById('selavatar-more').addEventListener('click', loadPreviews);
});

function renderColorOptions() {
    const container = document.getElementById('selavatar-color-options');
    container.innerHTML = '';
    COLORES_PREDEFINIDOS.forEach(hex => {
        const btn = document.createElement('button');
        btn.className = 'selavatar-color-swatch' + (hex === currentColor ? ' active' : '');
        btn.style.backgroundColor = hex;
        btn.dataset.color = hex;
        btn.addEventListener('click', () => selectColor(hex));
        container.appendChild(btn);
    });
}

function selectColor(hex) {
    currentColor = hex;
    document.querySelectorAll('.selavatar-color-swatch').forEach(el => {
        el.classList.toggle('active', el.dataset.color === hex);
    });
    document.getElementById('selavatar-color-picker').value = hex;
    applyColor(hex);
    saveColor(hex);
}

function applyColor(hex) {
    const wrap = document.getElementById('selavatar-current-wrap-img');
    if (wrap) {
        wrap.style.backgroundColor = hex;
        const img = wrap.querySelector('img');
        if (img) img.style.backgroundColor = hex;
    }
    document.querySelectorAll('.selavatar-item').forEach(el => {
        el.style.backgroundColor = hex;
    });
}

async function saveColor(hex) {
    try {
        const res = await fetch('/api/avatar/color', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ color_fondo: hex })
        });
        if (res.ok) {
            const label = document.querySelector('.selavatar-color-title');
            label.textContent = '✓ Color de fondo guardado';
            setTimeout(() => {
                label.innerHTML = '<span class="material-symbols-outlined">format_paint</span> Color de fondo';
            }, 1500);
        } else {
            const err = await res.json().catch(() => ({}));
            console.error('Error guardando color:', err.mensaje || res.status);
        }
    } catch (e) {
        console.error('Error guardando color:', e);
    }
}

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
        item.style.backgroundColor = currentColor;

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
            body: JSON.stringify({ seed, estilo, color_fondo: currentColor })
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('selavatar-current-img').src = data.imagen_perfil;
            if (data.avatar_fondo) {
                currentColor = data.avatar_fondo;
                applyColor(currentColor);
            }
        } else {
            console.error('Error al seleccionar avatar:', data.mensaje);
        }
    } catch (e) {
        console.error('Error de conexión:', e);
    }
}
