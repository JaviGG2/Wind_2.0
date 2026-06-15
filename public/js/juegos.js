/* Lógica de juegos independiente del dashboard */

async function cargarMisJuegosCreados() {
    const contenedorLista = document.getElementById('lista-juegos-publicados');
    if (!contenedorLista) return;

    try {
        const respuesta = await fetch('/admin/mis-juegos', { credentials: 'include' });
        if (!respuesta.ok) {
            contenedorLista.innerHTML = '<p style="color: red; font-size: 0.85rem;">No se pudo cargar el historial.</p>';
            return;
        }

        const juegos = await respuesta.json();

        if (!juegos || juegos.length === 0) {
            contenedorLista.innerHTML = '<p style="font-size: 0.85rem; color: #777; text-align: center;">Aún no has publicado ninguna trivia.</p>';
            return;
        }

        contenedorLista.innerHTML = '';
        juegos.forEach(juego => {
            const tarjeta = document.createElement('div');
            tarjeta.className = 'lista-item-card';

            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'lista-item-content';

            const info = document.createElement('div');
            info.className = 'lista-item-info';
            info.innerHTML = `
                <div class="lista-item-titulo">${juego.pregunta}</div>
                <div class="lista-item-subtitulo">${juego.categoria_nombre || 'General'}</div>
            `;
            contentWrapper.appendChild(info);

            const acciones = document.createElement('div');
            acciones.className = 'lista-item-acciones';

            const verBtn = document.createElement('button');
            verBtn.className = 'boton-enviar';
            verBtn.textContent = 'Jugar';
            verBtn.addEventListener('click', () => {
                window.location.href = `/juegos?juego=${juego.id}`;
            });
            acciones.appendChild(verBtn);

            const delBtn = document.createElement('button');
            delBtn.className = 'btn-ghost';
            delBtn.textContent = 'Eliminar';
            delBtn.addEventListener('click', async () => {
                if (!confirm('¿Eliminar este juego? Esta acción no se puede deshacer.')) return;
                try {
                    const r = await fetch(`/admin/juegos/${juego.id}`, { method: 'DELETE', credentials: 'include' });
                    if (!r.ok) {
                        const txt = await r.text();
                        alert('No se pudo eliminar: ' + txt);
                        return;
                    }
                    tarjeta.remove();
                } catch (err) {
                    alert('Error al eliminar el juego.');
                }
            });
            acciones.appendChild(delBtn);

            tarjeta.appendChild(contentWrapper);
            tarjeta.appendChild(acciones);
            contenedorLista.appendChild(tarjeta);
        });
    } catch (error) {
        contenedorLista.innerHTML = '<p style="color: red; font-size: 0.85rem;">Error de conexión con el historial.</p>';
    }
}

/* ------------------ Juegos Publicados (público) ------------------ */
async function cargarJuegosPublicados() {
    const contenedor = document.getElementById('lista-juegos-publicados');
    if (!contenedor) return;

    contenedor.innerHTML = '<p style="font-size: 0.95rem; color: #666; text-align:center;">Cargando juegos publicados...</p>';
    try {
        const res = await fetch('/api/juegos');
        if (!res.ok) {
            contenedor.innerHTML = '<p style="color: red; font-size: 0.85rem; text-align:center;">No se pudieron cargar los juegos publicados.</p>';
            return;
        }

        const juegos = await res.json();
        if (!juegos || juegos.length === 0) {
            contenedor.innerHTML = '<p style="font-size: 0.95rem; color: #777; text-align:center;">No hay juegos publicados aún.</p>';
            return;
        }

        contenedor.innerHTML = '';
            // obtener perfil para determinar permisos
            let perfil = null;
            try {
                const r = await fetch('/auth/perfil', { credentials: 'include' });
                if (r.ok) perfil = await r.json();
            } catch (err) {
                console.warn('No se pudo obtener perfil para permisos:', err);
            }

            juegos.forEach(juego => {
                const tarjeta = document.createElement('div');
                tarjeta.className = 'lista-item-card';

                const contentWrapper = document.createElement('div');
                contentWrapper.className = 'lista-item-content';

                const info = document.createElement('div');
                info.className = 'lista-item-info';
                info.innerHTML = `
                    <div class="lista-item-titulo">${juego.pregunta}</div>
                    <div class="lista-item-subtitulo">${juego.categoria_nombre || 'General'}</div>
                `;
                contentWrapper.appendChild(info);

                const acciones = document.createElement('div');
                acciones.className = 'lista-item-acciones';

                const playBtn = document.createElement('button');
                playBtn.className = 'boton-enviar';
                playBtn.textContent = 'Jugar';
                playBtn.addEventListener('click', () => {
                    // redirige a la vista de juegos con query param
                    window.location.href = `/juegos?juego=${juego.id}`;
                });
                acciones.appendChild(playBtn);

                if (perfil && perfil.rol === 'Especialista') {
                    const editBtn = document.createElement('button');
                    editBtn.className = 'btn-outline';
                    editBtn.textContent = 'Editar';
                    editBtn.addEventListener('click', () => {
                        window.location.href = `/admin/editar-juego?id=${juego.id}`;
                    });
                    acciones.appendChild(editBtn);

                    const delBtn = document.createElement('button');
                    delBtn.className = 'btn-ghost';
                    delBtn.textContent = 'Eliminar';
                    delBtn.addEventListener('click', async () => {
                        if (!confirm('¿Eliminar este juego? Esta acción no se puede deshacer.')) return;
                        try {
                            const r = await fetch(`/admin/juegos/${juego.id}`, { method: 'DELETE', credentials: 'include' });
                            if (!r.ok) {
                                const txt = await r.text();
                                alert('No se pudo eliminar: ' + txt);
                                return;
                            }
                            tarjeta.remove();
                        } catch (err) {
                            alert('Error al eliminar el juego.');
                        }
                    });
                    acciones.appendChild(delBtn);
                }

                tarjeta.appendChild(contentWrapper);
                tarjeta.appendChild(acciones);
                contenedor.appendChild(tarjeta);
            });
    } catch (err) {
        contenedor.innerHTML = '<p style="color: red; font-size: 0.85rem; text-align:center;">Error de conexión.</p>';
    }
}

// Auto-inicializar carga de juegos del usuario en dashboard
document.addEventListener('DOMContentLoaded', () => {
    cargarMisJuegosCreados();
});

/* ------------------ Temas Subidos (usuario) ------------------ */
async function cargarMisTemas() {
    const cont = document.getElementById('lista-temas-subidos');
    if (!cont) return;
    cont.innerHTML = '<p style="text-align:center; color:#666;">Cargando temas...</p>';

    try {
        const res = await fetch('/admin/mis-temas', { credentials: 'include' });
        if (!res.ok) {
            cont.innerHTML = '<p style="text-align:center; color:red;">No se pudieron cargar tus temas.</p>';
            return;
        }
        const temas = await res.json();
        if (!temas || temas.length === 0) {
            cont.innerHTML = '<p style="text-align:center; color:#777;">Aún no has subido temas.</p>';
            return;
        }

        cont.innerHTML = '';
        temas.forEach(t => {
            const item = document.createElement('div');
            item.className = 'lista-item-card';
            
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'lista-item-content';

            const img = document.createElement('img');
            img.src = t.imagen_portada ? (t.imagen_portada.startsWith('/') ? t.imagen_portada : '/' + t.imagen_portada) : '/img/placeholder.png';
            img.className = 'lista-item-img';

            const meta = document.createElement('div');
            meta.className = 'lista-item-info';
            meta.innerHTML = `<div class="lista-item-titulo">${t.titulo}</div><div class="lista-item-subtitulo">${t.categoria_nombre || 'General'}</div>`;

            contentWrapper.appendChild(img);
            contentWrapper.appendChild(meta);

            const acciones = document.createElement('div');
            acciones.className = 'lista-item-acciones';

            const ver = document.createElement('a');
            ver.href = `/ver-tema?id=${t.id}`;
            ver.className = 'boton-enviar';
            ver.textContent = 'Ver';
            acciones.appendChild(ver);

            const editar = document.createElement('button');
            editar.className = 'btn-outline';
            editar.textContent = 'Editar';
            editar.addEventListener('click', () => {
                window.location.href = `/editar-tema?id=${t.id}`;
            });
            acciones.appendChild(editar);

            const eliminar = document.createElement('button');
            eliminar.className = 'btn-ghost';
            eliminar.textContent = 'Eliminar';
            eliminar.addEventListener('click', async () => {
                if (!confirm('Eliminar este tema?')) return;
                try {
                    const r = await fetch(`/admin/temas/${t.id}`, { method: 'DELETE', credentials: 'include' });
                    if (!r.ok) { alert('No se pudo eliminar'); return; }
                    item.remove();
                } catch (err) { alert('Error al eliminar'); }
            });
            acciones.appendChild(eliminar);

            item.appendChild(contentWrapper);
            item.appendChild(acciones);
            cont.appendChild(item);
        });

    } catch (err) {
        cont.innerHTML = '<p style="text-align:center; color:red;">Error de conexión.</p>';
    }
}

async function cargarModuloJuegos() {
    const contenedor = document.getElementById('juegos-disponibles');
    if (!contenedor) return;

    contenedor.innerHTML = '<p style="font-size: 0.95rem; color: #666;">Cargando el módulo de juegos...</p>';

    try {
        const respuesta = await fetch('/api/juegos');
        if (!respuesta.ok) {
            contenedor.innerHTML = '<p style="color: red; font-size: 0.85rem;">No se pudo cargar el módulo de juegos.</p>';
            return;
        }

        const juegos = await respuesta.json();
        if (!juegos || juegos.length === 0) {
            contenedor.innerHTML = '<p style="font-size: 0.95rem; color: #777;">No hay juegos disponibles por ahora.</p>';
            return;
        }

        contenedor.innerHTML = '';
        juegos.slice(0, 5).forEach(juego => {
            const tarjeta = document.createElement('article');
            tarjeta.style.cssText = `
                background: #ffffff;
                color: #333;
                padding: 16px;
                border-radius: 12px;
                margin-bottom: 12px;
                border: 1px solid #eef2f5;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            `;
            tarjeta.innerHTML = `
                <div>
                    <small style="color: #0056b3; font-weight: bold; text-transform: uppercase; font-size: 0.7rem;">${juego.categoria_nombre || 'General'}</small>
                    <h3 style="margin: 5px 0; font-size: 1rem; color: #121212;">${juego.pregunta}</h3>
                    <span style="font-size: 0.8rem; color: #666;">Recompensa: <strong style="color: #28a745;">+${juego.puntos_recompensa || 10} Pts</strong></span>
                </div>
                <button class="boton-enviar" onclick="window.location.href='/juegos?juego=${juego.id}'" style="padding: 8px 16px; font-size: 0.85rem; border-radius: 8px; cursor: pointer;">
                    Jugar
                </button>
            `;
            contenedor.appendChild(tarjeta);
        });
    } catch (error) {
        contenedor.innerHTML = '<p style="color: red; font-size: 0.85rem;">Error de conexión con el servidor.</p>';
        console.error('[juegos.js] cargarModuloJuegos error:', error);
    }
}
