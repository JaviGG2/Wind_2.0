document.addEventListener('DOMContentLoaded', () => {
    const temasContainer = document.getElementById('temas-listado');
    const mensajeCarga = document.getElementById('temas-mensaje');

    let currentUser = null;

    // Obtener perfil actual (si está autenticado) antes de cargar los temas
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

    async function cargarTemas() {
        mensajeCarga.textContent = 'Cargando temas históricos...';

        try {
            const respuesta = await fetch('/api/temas',  {
            method: 'GET',
        credentials: 'include', // <--- ¡ESTA ES LA LÍNEA MÁGICA! Obliga al navegador a llevar la cookie
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
    // Le ponemos una manito al cursor para que sepa que es cliqueable
    tarjeta.style.cursor = 'pointer'; 
    const avatar = tema.creador_avatar || '/img/avatar.svg';

    // Mostrar botones de acción si el usuario es especialista o es el creador
    const showActions = user && (user.rol === 'Especialista' || user.id === tema.creador_id);

    tarjeta.innerHTML = `
        <div class="tema-imagen" style="background-image: url('${tema.imagen_portada || '/img/app.png'}');"></div>
        <div class="tema-contenido">
            <div class="creator-row">
                <img class="creator-avatar" src="${avatar}" alt="avatar" />
                <div class="creator-name">${tema.creador_nombre || 'Anónimo'}</div>
                ${showActions ? `
                    <div class="tema-actions">
                        <button class="btn-action btn-edit" data-id="${tema.id}">Editar</button>
                        <button class="btn-action btn-delete" data-id="${tema.id}">Eliminar</button>
                    </div>
                ` : ''}
            </div>

            <h3 class="tema-titulo">${tema.titulo || 'Tema sin título'}</h3>
            <p>${crearExtracto(tema.contenido)}</p>
            <div class="tema-meta">
                <span class="tema-categoria">${tema.categoria_nombre || 'General'}</span>
                <span class="tema-autor">Publicado: ${tema.fecha_publicacion ? new Date(tema.fecha_publicacion).toLocaleDateString() : 'Desconocida'}</span>
            </div>
            <div style="margin-top: 15px; text-align: right;">
                <span class="btn-explorar" style="font-weight: bold; color: #d35400;">
                    Explorar Contenido →
                </span>
            </div>
        </div>
    `;

    // Añadir listeners a los botones de acción (si existen)
    const btnEdit = tarjeta.querySelector('.btn-edit');
    if (btnEdit) {
        btnEdit.addEventListener('click', (ev) => {
            ev.stopPropagation();
            // Redirigir a una página de edición (si existe)
            window.location.href = `/admin/editar-tema?id=${tema.id}`;
        });
    }

    const btnDelete = tarjeta.querySelector('.btn-delete');
    if (btnDelete) {
        btnDelete.addEventListener('click', async (ev) => {
            ev.stopPropagation();
            if (!confirm('¿Eliminar este tema? Esta acción es irreversible.')) return;
            try {
                const res = await fetch(`/admin/temas/${tema.id}`, { method: 'DELETE', credentials: 'include' });
                if (res.ok) {
                    tarjeta.remove();
                } else {
                    const js = await res.json().catch(() => ({}));
                    alert(js.mensaje || 'No se pudo eliminar el tema.');
                }
            } catch (error) {
                alert('Error de conexión al eliminar el tema.');
            }
        });
    }

    // 🔑 LA SOLUCIÓN MANDATORIA: Al hacer clic en CUALQUIER parte de la tarjeta,
    // obligamos al navegador a mudarse de página, rompiendo cualquier bloqueo.
    tarjeta.addEventListener('click', (evento) => {
        // Evitamos que otros scripts interfieran
        evento.stopPropagation(); 
        
        // Lo mandamos directo a la nueva vista con su ID
        window.location.href = `/ver-tema?id=${tema.id}`;
    });

    return tarjeta;
    }
    

    function crearExtracto(texto) {
        if (!texto) return 'Contenido no disponible.';
        const limpio = texto.replace(/(<([^>]+)>)/gi, '');
        return limpio.length > 160 ? `${limpio.slice(0, 160).trim()}...` : limpio;
    }

    // Iniciamos: primero perfil, luego temas
    (async () => {
        await fetchPerfil();
        await cargarTemas();
    })();
});