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

    const yaDioLike = tema.usuario_dio_like === true;
    const comentariosCount = tema.comentarios_count || 0;
    tarjeta.innerHTML = `
        <div class="tema-imagen" style="background-image: url('${tema.imagen_portada || '/img/app.png'}');"></div>
        <div class="tema-contenido">
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
                <a href="/ver-tema?id=${tema.id}#comentarios" class="btn-comentario" onclick="event.stopPropagation()">
                    <span class="material-symbols-outlined">chat_bubble</span>
                    <span>${comentariosCount}</span>
                </a>
                <button class="btn-like${yaDioLike ? ' liked' : ''}" data-id="${tema.id}">
                    <span class="material-symbols-outlined like-icon">favorite</span>
                    <span class="like-count">${likesCount}</span>
                </button>
                <span class="btn-explorar">
                    Explorar <span class="material-symbols-outlined" style="font-size:1rem;">arrow_forward</span>
                </span>
            </div>
        </div>
    `;

    const btnLike = tarjeta.querySelector('.btn-like');
    btnLike.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        if (btnLike.classList.contains('liked')) return;
        try {
            const res = await fetch(`/api/temas/${tema.id}/like`, { method: 'POST', credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                btnLike.querySelector('.like-count').textContent = data.likes;
                btnLike.classList.add('liked');
            } else if (res.status === 401) {
                window.location.href = '/login.html';
            } else if (res.status === 409) {
                btnLike.classList.add('liked');
            }
        } catch (e) {
            console.error('Error al dar like:', e);
        }
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