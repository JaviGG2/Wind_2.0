document.addEventListener('DOMContentLoaded', async () => {
    const bloqueCarga = document.getElementById('bloque-carga');
    const bloqueContenido = document.getElementById('bloque-contenido');

    const parametrosURL = new URLSearchParams(window.location.search);
    const temaId = parametrosURL.get('id');

    if (!temaId) {
        bloqueCarga.innerHTML = "<p> Error: No se especificó el ID del tema en la URL.</p>";
        return;
    }

    try {
        const respuesta = await fetch(`/api/temas/${temaId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!respuesta.ok) {
            let errMsg = `Error ${respuesta.status}`;
            try {
                const errJson = await respuesta.json();
                if (errJson && errJson.mensaje) errMsg = errJson.mensaje;
            } catch (e) {}
            throw new Error(errMsg || 'El tema no existe en la base de datos.');
        }

        const tema = await respuesta.json();

        document.getElementById('txt-titulo').textContent = tema.titulo || 'Sin título';
        document.getElementById('txt-categoria').textContent = tema.categoria_nombre || 'General';
        document.getElementById('txt-cuerpo').innerHTML = tema.contenido || 'Contenido vacío';

        const txtMeta = document.getElementById('txt-meta');
        if (txtMeta) {
            const creadorLink = tema.creador_id ? `<a href="/ver-perfil?id=${tema.creador_id}" class="tema-creador-link">${tema.creador_nombre || 'Anónimo'}</a>` : (tema.creador_nombre || '');
            const fecha = tema.fecha_publicacion ? new Date(tema.fecha_publicacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
            txtMeta.innerHTML = creadorLink ? `${creadorLink} — ${fecha}` : fecha;
        }

        const imgPortadaEl = document.getElementById('img-portada');
        if (tema.imagen_portada) {
            let imgPath = tema.imagen_portada;
            if (!imgPath.startsWith('/') && !imgPath.startsWith('http')) {
                imgPath = '/' + imgPath;
            }
            imgPortadaEl.style.backgroundImage = `url('${imgPath}')`;
        } else {
            imgPortadaEl.style.backgroundImage = `url('/img/app.png')`;
        }

        fetch('/api/historial/registrar', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo_contenido: 'tema', contenido_id: tema.id })
        }).catch(() => {});

        await new Promise(r => setTimeout(r, 500));
        bloqueCarga.style.display = 'none';
        bloqueContenido.style.display = 'block';

        const originalTitulo = tema.titulo || '';
        const originalContenido = tema.contenido || '';

        const btnTraducir = document.getElementById('btn-traducir');
        const btnOriginal = document.getElementById('btn-original');
        const selectorIdioma = document.getElementById('idioma-select');
        const spanTraduciendo = document.getElementById('traduciendo');

        btnTraducir.addEventListener('click', async () => {
            const idioma = selectorIdioma.value;
            btnTraducir.disabled = true;
            spanTraduciendo.style.display = '';

            try {
                const res = await fetch('/api/traducir', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ textos: [originalTitulo, originalContenido], idioma })
                });
                const data = await res.json();
                if (data.traducciones) {
                    document.getElementById('txt-titulo').textContent = data.traducciones[0] || originalTitulo;
                    document.getElementById('txt-cuerpo').innerHTML = data.traducciones[1] || originalContenido;
                    btnOriginal.style.display = 'inline-block';
                }
            } catch (err) {
                console.error('Error al traducir:', err);
            } finally {
                btnTraducir.disabled = false;
                spanTraduciendo.style.display = 'none';
            }
        });

        btnOriginal.addEventListener('click', () => {
            document.getElementById('txt-titulo').textContent = originalTitulo;
            document.getElementById('txt-cuerpo').innerHTML = originalContenido;
            btnOriginal.style.display = 'none';
        });

        cargarComentarios(temaId);

        if (window.location.hash === '#comentarios') {
            setTimeout(() => {
                const el = document.getElementById('seccion-comentarios');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }

        initValoracion(tema);

    } catch (error) {
        console.error("Error en ver-tema.js:", error);
        bloqueCarga.innerHTML = `<p style="color: red;">Error al cargar el contenido: ${error.message}</p>`;
    }

    const comentarioInput = document.getElementById('comentario-input');
    const comentarioEnviar = document.getElementById('comentario-enviar');
    const comentariosLista = document.getElementById('comentarios-lista');
    const comentariosCount = document.getElementById('comentarios-count');

    async function cargarComentarios(temaId) {
        try {
            const res = await fetch(`/api/temas/${temaId}/comentarios`, { credentials: 'include' });
            if (!res.ok) return;
            const comentarios = await res.json();
            if (Array.isArray(comentarios)) renderComentarios(comentarios);
        } catch (e) {
            console.error('Error al cargar comentarios:', e);
        }
    }

    function renderComentarios(comentarios) {
        comentariosCount.textContent = comentarios.length;
        if (comentarios.length === 0) {
            comentariosLista.innerHTML = '<p class="comentarios-vacio">Sin comentarios. Sé el primero en comentar.</p>';
            return;
        }
        comentariosLista.innerHTML = comentarios.map(c => {
            const avatarFondo = c.usuario_avatar_fondo || '#e8e8e8';
            const esEspecialista = c.usuario_rol === 'Especialista';
            const autorHref = c.usuario_id ? `/ver-perfil?id=${c.usuario_id}` : null;
            const avatarInner = c.usuario_avatar
                ? `<img src="${c.usuario_avatar}" alt="" class="comentario-avatar-img" onerror="this.style.display='none';this.nextElementSibling.style.display=''">
                   <span class="material-symbols-outlined" style="display:none;">person</span>`
                : `<span class="material-symbols-outlined">person</span>`;
            const avatarWrap = autorHref
                ? `<a href="${autorHref}" class="comentario-avatar-link" style="background-color:${avatarFondo};">${avatarInner}</a>`
                : `<div class="comentario-avatar" style="background-color:${avatarFondo};">${avatarInner}</div>`;
            return `
            <div class="comentario-item" data-id="${c.id}">
                ${avatarWrap}
                <div class="comentario-cuerpo">
                    <div class="comentario-encabezado">
                        <span class="comentario-autor">${c.usuario_id ? `<a href="/ver-perfil?id=${c.usuario_id}" class="comentario-autor-link">${c.usuario_nombre || 'Anónimo'}</a>` : (c.usuario_nombre || 'Anónimo')}${esEspecialista ? '<span class="badge-especialista"><img src="/img/Rol.png" alt="Especialista"></span>' : ''}</span>
                        <span class="comentario-fecha">${formatDate(c.fecha_creacion)}</span>
                    </div>
                    <div class="comentario-texto">${escapeHtml(c.contenido)}</div>
                </div>
            </div>`;
        }).join('');
    }

    comentarioEnviar.addEventListener('click', async () => {
        const texto = comentarioInput.value.trim();
        if (!texto) return;

        comentarioEnviar.disabled = true;
        comentarioEnviar.textContent = 'Publicando...';

        try {
            const res = await fetch(`/api/temas/${temaId}/comentarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ contenido: texto })
            });

            if (res.status === 401) {
                window.location.href = '/login.html';
                return;
            }

            if (!res.ok) {
                let msg = 'Error al publicar.';
                try { const err = await res.json(); msg = err.mensaje || msg; } catch (_) {}
                alert(msg);
                return;
            }

            comentarioInput.value = '';
            await cargarComentarios(temaId);
        } catch (e) {
            console.error('Error al enviar comentario:', e);
            alert('Error de conexión.');
        } finally {
            comentarioEnviar.disabled = false;
            comentarioEnviar.textContent = 'Publicar';
        }
    });

    comentarioInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            comentarioEnviar.click();
        }
    });

    function formatDate(fecha) {
        if (!fecha) return '';
        const d = new Date(fecha);
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }

    function initValoracion(tema) {
        const section = document.getElementById('valoracion-section');
        const stars = section?.querySelectorAll('.star-rating .star');
        const promedioEl = document.getElementById('val-promedio');
        const countEl = document.getElementById('val-count');
        if (!stars?.length) return;

        const id = tema.id;
        let miPunt = tema.mi_puntuacion || null;

        function renderStars(punt) {
            stars.forEach(s => {
                const val = parseInt(s.dataset.val, 10);
                s.classList.toggle('active', val <= punt);
            });
        }

        function renderStats(promedio, total) {
            if (promedioEl) promedioEl.textContent = promedio ? `${promedio} ★` : '—';
            if (countEl) countEl.textContent = `(${total || 0} valoraciones)`;
        }

        if (miPunt) renderStars(miPunt);
        renderStats(tema.promedio_valoracion, tema.likes);

        stars.forEach(s => {
            s.addEventListener('click', async () => {
                const val = parseInt(s.dataset.val, 10);
                try {
                    const res = await fetch(`/api/temas/${id}/like`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ puntuacion: val })
                    });
                    if (!res.ok) { if (res.status === 401) window.location.href = '/login.html'; return; }
                    const data = await res.json();
                    miPunt = data.mi_puntuacion;
                    renderStars(miPunt);
                    renderStats(data.promedio, data.likes);
                } catch (e) { console.error('Error valoracion:', e); }
            });
        });
    }
});
