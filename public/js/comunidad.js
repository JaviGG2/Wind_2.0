let todosLosRelatos = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarRelatos();
    window.addEventListener('category-change', (e) => {
        cargarRelatos(e.detail.categoria_nombre);
    });
});

async function cargarRelatos(categoria = '') {
    const grid = document.getElementById('relatos-grid');
    const empty = document.getElementById('relatos-empty');
    const contador = document.getElementById('contador-relatos');

    if (!grid) return;

    grid.innerHTML = `
        <div class="loading-skeleton">
            ${[1,2,3,4,5,6].map(() => '<div class="skeleton-card"></div>').join('')}
        </div>
    `;
    if (empty) empty.style.display = 'none';

    try {
        const url = categoria
            ? `/api/relatos?categoria=${encodeURIComponent(categoria)}`
            : '/api/relatos';

        console.log('[comunidad] Fetching relatos desde:', url);
        const res = await fetch(url, { credentials: 'include' });
        console.log('[comunidad] Response status:', res.status, res.statusText);
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error('[comunidad] Error response body:', errorText);
            throw new Error(`Error ${res.status}: ${res.statusText}`);
        }

        const relatos = await res.json();
        console.log('[comunidad] Relatos recibidos:', relatos.length, relatos);
        todosLosRelatos = relatos;

        grid.innerHTML = '';

        if (!relatos || relatos.length === 0) {
            if (empty) empty.style.display = 'flex';
            if (contador) contador.textContent = '0 relatos';
            return;
        }

        if (contador) contador.textContent = `${relatos.length} relato${relatos.length !== 1 ? 's' : ''}`;

        relatos.forEach((relato, index) => {
            const card = crearCardRelato(relato, index);
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error al cargar relatos:', error);
        grid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding: 40px; color: #e03d00;">
                <span class="material-symbols-outlined" style="font-size:2.5rem; display:block; margin-bottom:10px;">error</span>
                No se pudieron cargar los relatos. Intenta nuevamente.
            </div>
        `;
    }
}

function crearCardRelato(relato, index) {
    const card = document.createElement('article');
    card.className = 'relato-card';
    card.style.animationDelay = `${index * 50}ms`;

    const fecha = relato.fecha_publicacion
        ? new Date(relato.fecha_publicacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';

    const autor = relato.autor_nombre || 'Anónimo';
    const inicial = autor.charAt(0).toUpperCase();
    const avatarFondo = relato.autor_avatar_fondo || '#e8e8e8';
    const esEspecialista = relato.autor_rol === 'Especialista';
    const badgeHtml = esEspecialista ? '<span class="badge-especialista"><img src="/img/Rol.png" alt="Especialista"></span>' : '';
    const avatarHtml = relato.autor_avatar
        ? `<div class="relato-avatar" style="background:${avatarFondo};"><img src="${relato.autor_avatar}" alt="${autor}" onerror="this.parentElement.textContent='${inicial}'"></div>`
        : `<div class="relato-avatar">${inicial}</div>`;

    const categoria = relato.categoria || 'General';
    const extracto = relato.contenido_relato
        ? relato.contenido_relato.substring(0, 200).trim() + (relato.contenido_relato.length > 200 ? '...' : '')
        : '';

    const imgHtml = relato.imagen_url
        ? `<div class="relato-imagen"><img src="${relato.imagen_url}" alt="${sanitizar(relato.titulo)}" loading="lazy"></div>`
        : '';

    card.innerHTML = `
        <div class="relato-card-header">
            <div class="relato-autor-row">
                ${avatarHtml}
                <div class="relato-autor-info">
                    <div class="relato-autor-nombre">${sanitizar(autor)}${badgeHtml}</div>
                    <div class="relato-fecha">${fecha}</div>
                </div>
            </div>
            <span class="relato-cat-badge">${sanitizar(categoria)}</span>
        </div>
        ${imgHtml}
        <h3 class="relato-titulo">${sanitizar(relato.titulo || 'Sin título')}</h3>
        <p class="relato-extracto">${sanitizar(extracto)}</p>
        <button class="relato-leer-mas" data-id="${relato.id}">
            Leer relato completo <span class="material-symbols-outlined" style="font-size:1rem;">arrow_forward</span>
        </button>
    `;

    card.querySelector('.relato-leer-mas').addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = `/ver-relato?id=${relato.id}`;
    });

    card.addEventListener('click', () => window.location.href = `/ver-relato?id=${relato.id}`);

    return card;
}

function sanitizar(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
