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

        function aplicarStagger(texto) {
            const limpio = texto.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            const palabras = limpio.split(/\s+/).filter(Boolean);
            return palabras.map((p, i) =>
                `<span class="stagger-word" style="--i:${i}">${p}</span>`
            ).join(' ');
        }

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

        try {
            const resHist = await fetch('/api/historial/registrar', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo_contenido: 'tema', contenido_id: tema.id })
            });
            const histData = await resHist.json();
            if (histData.puntos_ganados > 0) {
                mostrarToast(`+${histData.puntos_ganados} puntos por leer este tema`);
            }
        } catch (e) {}

        await new Promise(r => setTimeout(r, 500));
        bloqueCarga.style.display = 'none';
        bloqueContenido.style.display = 'block';

        const originalTitulo = tema.titulo || '';
        const originalContenido = tema.contenido || '';

        const btnTraducir = document.getElementById('btn-traducir');
        const btnOriginal = document.getElementById('btn-original');
        const selectorIdioma = document.getElementById('idioma-select');
        const spanTraduciendo = document.getElementById('traduciendo');

        const btnVerMapa = document.getElementById('btn-ver-mapa');
        if (btnVerMapa) {
            var lat = parseFloat(tema.latitud);
            var lng = parseFloat(tema.longitud);
            if (!isNaN(lat) && !isNaN(lng)) {
                btnVerMapa.href = '/mapa?lat=' + lat + '&lng=' + lng + '&id=' + tema.id;
            } else {
                btnVerMapa.style.display = 'none';
            }
        }

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
                    document.getElementById('txt-titulo').innerHTML = aplicarStagger(data.traducciones[0] || originalTitulo);
                    document.getElementById('txt-cuerpo').innerHTML = aplicarStagger(data.traducciones[1] || originalContenido);
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

        // Resumir
        const btnResumir = document.getElementById('btn-resumir');
        let resumenVisible = false;
        let resumenCacheado = '';

        function cerrarResumen() {
            const popup = document.getElementById('resumen-popup');
            const backdrop = document.getElementById('resumen-backdrop');
            if (popup) popup.remove();
            if (backdrop) backdrop.remove();
            resumenVisible = false;
            btnResumir.style.color = '#888';
        }

        function resumirContenido(html) {
            const texto = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            const oraciones = texto.match(/[^.!?]+[.!?]+/g);
            if (!oraciones || oraciones.length < 2) return texto.substring(0, 300);

            const puntajes = oraciones.map((raw, i) => {
                const oracion = raw.trim();
                const palabras = oracion.split(/\s+/).filter(Boolean);
                const palabrasLargas = palabras.filter(p => p.length >= 6);
                let score = 0;
                if (i < 2) score += 3;
                else if (i < 4) score += 2;
                else if (i < 6) score += 1;
                if (palabras.length >= 8 && palabras.length <= 40) score += 2;
                score += Math.min(3, palabrasLargas.length);
                if (/\d/.test(oracion)) score += 1;
                if (/[A-ZÁÉÍÓÚÑ]/.test(oracion)) score += 1;
                return { texto: oracion, score, idx: i };
            });

            const seleccionadas = puntajes
                .sort((a, b) => b.score - a.score)
                .slice(0, 4)
                .sort((a, b) => a.idx - b.idx)
                .map(s => s.texto);

            return seleccionadas.join(' ');
        }

        btnResumir.addEventListener('click', () => {
            if (resumenVisible) { cerrarResumen(); return; }

            if (!resumenCacheado) {
                resumenCacheado = resumirContenido(tema.contenido || '');
            }

            const palabras = resumenCacheado.split(/\s+/).filter(Boolean);
            const textoHTML = palabras.map((p, i) =>
                `<span class="stagger-word" style="--i:${i}">${p}</span>`
            ).join(' ');

            const popup = document.createElement('div');
            popup.id = 'resumen-popup';
            popup.className = 'resumen-popup';
            popup.innerHTML = `
                <div class="resumen-popup-header">
                    <span class="material-symbols-outlined">auto_awesome</span>
                    <span>Resumen</span>
                    <button type="button" class="resumen-popup-close">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="resumen-popup-body">${textoHTML}</div>
            `;
            popup.querySelector('.resumen-popup-close').addEventListener('click', cerrarResumen);
            popup.addEventListener('click', (e) => e.stopPropagation());

            const backdrop = document.createElement('div');
            backdrop.id = 'resumen-backdrop';
            backdrop.className = 'resumen-backdrop';
            backdrop.addEventListener('click', cerrarResumen);

            document.body.appendChild(backdrop);
            document.body.appendChild(popup);
            resumenVisible = true;
            btnResumir.style.color = '#2E7D32';
        });

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

    // Denuncia modal
    const btnDenunciar = document.getElementById('btn-denunciar');
    const modalDenuncia = document.getElementById('modal-denuncia');
    const modalClose = document.getElementById('modal-denuncia-close');
    const denunciaMsg = document.getElementById('denuncia-msg');

    if (btnDenunciar && modalDenuncia) {
        btnDenunciar.addEventListener('click', () => {
            modalDenuncia.style.display = 'flex';
            if (denunciaMsg) denunciaMsg.textContent = '';
        });

        const cerrar = () => { modalDenuncia.style.display = 'none'; };

        if (modalClose) modalClose.addEventListener('click', cerrar);
        modalDenuncia.addEventListener('click', (e) => {
            if (e.target === modalDenuncia) cerrar();
        });

        document.querySelectorAll('.denuncia-opcion').forEach(btn => {
            btn.addEventListener('click', async () => {
                const params = new URLSearchParams(window.location.search);
                const temaId = params.get('id');
                if (!temaId) { if (denunciaMsg) denunciaMsg.textContent = 'Error: ID del tema no encontrado.'; return; }

                const motivo = btn.dataset.motivo;
                btn.disabled = true;
                try {
                    const res = await fetch('/api/denuncias', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tema_id: temaId, motivo })
                    });
                    const data = await res.json();
                    if (denunciaMsg) {
                        denunciaMsg.textContent = data.mensaje;
                        denunciaMsg.className = 'denuncia-msg ' + (res.ok ? 'success' : 'error');
                    }
                    if (res.ok) {
                        setTimeout(cerrar, 2000);
                    }
                } catch {
                    if (denunciaMsg) {
                        denunciaMsg.textContent = 'Error de conexión.';
                        denunciaMsg.className = 'denuncia-msg error';
                    }
                }
                btn.disabled = false;
            });
        });
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

function mostrarToast(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    Object.assign(div.style, {
        position: 'fixed',
        bottom: '24px', left: '50%', transform: 'translateX(-50%)',
        background: '#16a34a', color: '#fff',
        padding: '12px 24px', borderRadius: '12px',
        fontSize: '14px', fontWeight: 600,
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        zIndex: 10000,
        opacity: '0', transition: 'opacity 0.3s ease'
    });
    document.body.appendChild(div);
    requestAnimationFrame(() => div.style.opacity = '1');
    setTimeout(() => {
        div.style.opacity = '0';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}
