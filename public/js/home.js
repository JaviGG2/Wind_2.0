document.addEventListener('DOMContentLoaded', () => {
    const temasContainer = document.getElementById('temas-listado');
    const mensajeCarga = document.getElementById('temas-mensaje');

    let currentUser = null;

    async function fetchPerfil() {
        try {
            const perfilRes = await fetch('/auth/perfil', { credentials: 'include' });
            if (perfilRes.ok) {
                currentUser = await perfilRes.json();
            }
        } catch (e) {
            currentUser = null;
        }
    }

    if (!temasContainer || !mensajeCarga) return;

    async function cargarTemas(categoriaId) {
        mensajeCarga.textContent = 'Cargando temas históricos...';
        temasContainer.innerHTML = '';

        try {
            const url = categoriaId ? `/api/temas?categoria=${categoriaId}` : '/api/temas';
            const respuesta = await fetch(url, {
            method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    });
            if (!respuesta.ok) {
                mensajeCarga.textContent = 'No se pudieron cargar los temas. Intenta de nuevo más tarde.';
                return;
            }

            const temas = await respuesta.json();
            if (!Array.isArray(temas) || temas.length === 0) {
                mensajeCarga.textContent = 'No hay temas disponibles por ahora.';
                return;
            }

            
            mensajeCarga.style.display = 'none';
            temas.forEach(tema => temasContainer.appendChild(crearTarjetaTema(tema, currentUser)));
        } catch (error) {
            mensajeCarga.textContent = 'Error de conexión al cargar los temas.';
            console.error('Error al obtener temas:', error);
        }
    }

    function crearTarjetaTema(tema, user) {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'tarjeta-tema';
    tarjeta.style.cursor = 'pointer';
    const avatar = tema.creador_avatar || '/img/avatar.svg';
    const avatarFondo = tema.creador_avatar_fondo || '#e8e8e8';
    const esEspecialista = tema.creador_rol === 'Especialista';
    const likesCount = tema.likes || 0;
    const promedio = tema.promedio_valoracion || 0;
    let miPunt = tema.mi_puntuacion || 0;

    const comentariosCount = tema.comentarios_count || 0;
    tarjeta.innerHTML = `
        <div class="tema-imagen anim-fade-up" style="background-image: url('${tema.imagen_portada || '/img/app.png'}');"></div>
        <div class="tema-contenido anim-fade-up">
            <div class="creator-row">
                <img class="creator-avatar" src="${avatar}" alt="avatar" style="background:${avatarFondo};" onclick="event.stopPropagation();window.location.href='/ver-perfil?id=${tema.creador_id}'" />
                <div class="creator-name"><a href="/ver-perfil?id=${tema.creador_id}" class="creator-link">${tema.creador_nombre || 'Anónimo'}</a>${esEspecialista ? '<span class="badge-especialista"><img src="/img/Rol.png" alt="Especialista"></span>' : ''}</div>
            </div>

            <h3 class="tema-titulo">${tema.titulo || 'Tema sin título'}</h3>
            <p>${crearExtracto(tema.contenido)}</p>
            <div class="tema-meta">
                <span class="tema-categoria">${tema.categoria_nombre || 'General'}</span>
                <span class="tema-autor">Publicado: ${tema.fecha_publicacion ? new Date(tema.fecha_publicacion).toLocaleDateString() : 'Desconocida'}</span>
            </div>
            <div class="tema-footer">
                <button type="button" class="btn-valoracion" data-id="${tema.id}">
                    <span class="material-symbols-outlined btn-val-icon${miPunt > 0 ? ' rated' : ''}">${miPunt > 0 ? 'star' : 'star_outline'}</span>
                    <span class="btn-val-promedio">${promedio > 0 ? promedio.toFixed(1) : '—'}</span>
                    <span class="btn-val-count">(${likesCount})</span>
                </button>
                <a href="/ver-tema?id=${tema.id}#comentarios" class="btn-comentario" onclick="event.stopPropagation()">
                    <span class="material-symbols-outlined">chat_bubble</span>
                    <span>${comentariosCount}</span>
                </a>
                <button class="btn-explorar">
                    Explorar <span class="material-symbols-outlined" style="font-size:1rem;">arrow_forward</span>
                </button>
            </div>
        </div>
    `;

    const btnVal = tarjeta.querySelector('.btn-valoracion');
    btnVal.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        abrirPopupValoracion(tema.id, 'temas', miPunt, async (val) => {
            try {
                const res = await fetch(`/api/temas/${tema.id}/like`, {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ puntuacion: val })
                });
                if (res.ok) {
                    const data = await res.json();
                    miPunt = data.mi_puntuacion;
                    const icon = btnVal.querySelector('.btn-val-icon');
                    icon.textContent = miPunt > 0 ? 'star' : 'star_outline';
                    icon.classList.toggle('rated', miPunt > 0);
                    btnVal.querySelector('.btn-val-promedio').textContent = (data.promedio || 0).toFixed(1);
                    btnVal.querySelector('.btn-val-count').textContent = `(${data.likes})`;
                } else if (res.status === 401) {
                    window.location.href = '/login.html';
                }
            } catch (e) {
                console.error('Error al valorar:', e);
            }
        });
    });

    tarjeta.addEventListener('click', (evento) => {
        evento.stopPropagation();
        window.location.href = `/ver-tema?id=${tema.id}`;
    });

    return tarjeta;
    }
    

    function crearExtracto(texto) {
        if (!texto) return 'Contenido no disponible.';
        const limpio = texto.replace(/(<([^>]+)>)/gi, '');
        return limpio.length > 160 ? `${limpio.slice(0, 160).trim()}...` : limpio;
    }

    window.addEventListener('category-change', (e) => {
        cargarTemas(e.detail.categoria_id);
    });

    (async () => {
        await fetchPerfil();
        await cargarTemas();
    })();
});