document.addEventListener('DOMContentLoaded', async () => {
    const bienvenida = document.getElementById('bienvenida-usuario');
    const bloqueMensaje = document.getElementById('mensaje-consola');
    const btnLogout = document.getElementById('btn-logout');

    try {
        const res = await fetch('/auth/perfil', {
            method: 'GET',
            credentials: 'include'
        });
        console.debug('[dashboard] /auth/perfil status', res.status);
        if (!res.ok) {
            console.warn('[dashboard] perfil no autorizado, redirigiendo a login');
            window.location.href = 'login';
            return;
        }

        let usuario;
        try {
            usuario = await res.json();
        } catch (errJson) {
            const texto = await res.text();
            console.error('[dashboard] fallo al parsear JSON de /auth/perfil:', errJson, texto);
            mostrarMensaje('Error al leer perfil (respuesta inválida).', 'error');
            return;
        }
        console.debug('[dashboard] perfil payload', usuario);

        const nombreElem = document.getElementById('nombre-usuario');
        const usernameElem = document.getElementById('username');
        const rolElem = document.getElementById('rol-usuario');
        const avatarElem = document.getElementById('perfil-avatar');

        if (nombreElem) nombreElem.textContent = usuario.nombre || 'Sin nombre';
        if (usernameElem) usernameElem.textContent = usuario.username ? `${usuario.username}` : '';
        if (rolElem) rolElem.textContent = usuario.rol || '';
        if (avatarElem && usuario.imagen_perfil) {
            avatarElem.src = usuario.imagen_perfil;
        }

        if (!usuario.nombre) {
            mostrarMensaje('Perfil cargado pero falta el nombre en la sesión.', 'error');
            console.warn('[dashboard] perfil sin nombre:', usuario);
        }

        bienvenida.innerHTML = `¡Hola, <strong>${usuario.nombre || 'Usuario'}</strong>! Bienvenido a la plataforma web de preservación digital.`;

        cargarNivel();

        configurarVistasPorRol(usuario.rol);
        if (typeof cargarMisRelatos === 'function') cargarMisRelatos();

    } catch (error) {
        console.error('[dashboard] Error cargando perfil:', error);
        bienvenida.textContent = 'Error de conexión con el panel.';
    }

    document.getElementById('btn-agregar-categoria')?.addEventListener('click', async () => {
        const input = document.getElementById('input-nueva-categoria');
        const nombre = input?.value.trim();
        if (!nombre) return;
        try {
            const res = await fetch('/api/categorias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ nombre })
            });
            if (!res.ok) {
                const err = await res.json();
                mostrarMensaje(err.mensaje || 'Error al crear categoría', 'error');
                return;
            }
            input.value = '';
            mostrarMensaje('Categoría creada correctamente', 'exito');
            cargarCategorias();
        } catch (err) {
            mostrarMensaje('Error al crear categoría', 'error');
        }
    });

    btnLogout.addEventListener('click', async () => {
        const res = await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        if (res.ok) window.location.replace('/login');
    });

    function configurarVistasPorRol(rol) {
        const accordionAdmin = document.getElementById('accordion-admin');

        if (rol === 'Especialista') {
            if (accordionAdmin) accordionAdmin.style.display = '';
            if (typeof cargarMisTemas === 'function') cargarMisTemas();
            if (typeof cargarMisJuegosCreados === 'function') cargarMisJuegosCreados();
            cargarCategorias();
        } else {
            if (accordionAdmin) accordionAdmin.style.display = 'none';
            cargarHistorial();
        }
    }

    async function cargarCategorias() {
        const cont = document.getElementById('lista-categorias');
        if (!cont) return;
        try {
            const res = await fetch('/api/categorias');
            if (!res.ok) throw new Error('Error');
            const cats = await res.json();
            if (cats.length === 0) {
                cont.innerHTML = '<p class="muted center">No hay categorías registradas.</p>';
                return;
            }
            cont.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
            cats.map(c => `
                <span class="tag tag-con-borrar">
                  ${c.nombre}
                  <button class="tag-borrar" data-id="${c.id}" aria-label="Eliminar">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </span>
              `).join('') + '</div>';
        } catch (err) {
            cont.innerHTML = '<p class="muted center error">Error al cargar categorías.</p>';
        }
    }

    document.getElementById('lista-categorias').addEventListener('click', async (e) => {
        const btn = e.target.closest('.tag-borrar');
        if (!btn) return;
        const id = btn.dataset.id;
        if (!confirm('¿Eliminar esta categoría? Los temas y juegos que la usan quedarán sin categoría.')) return;
        try {
            const res = await fetch(`/api/categorias/${id}`, { method: 'DELETE', credentials: 'include' });
            if (!res.ok) throw new Error();
            cargarCategorias();
        } catch {
            alert('Error al eliminar la categoría.');
        }
    });

    async function cargarUsuarios() {
        const cont = document.getElementById('lista-usuarios');
        if (!cont) return;
        try {
            const res = await fetch('/api/usuarios', { credentials: 'include' });
            if (!res.ok) throw new Error('Error');
            const users = await res.json();
            if (users.length === 0) {
                cont.innerHTML = '<p class="muted center">No hay usuarios registrados.</p>';
                return;
            }
            cont.innerHTML = '';
            users.forEach(u => {
                const item = document.createElement('div');
                item.className = 'lista-item-card';
                item.innerHTML = `
                    <div class="lista-item-info">
                        <h5>${u.nombre} <small style="color:var(--texto-muted)">(@${u.username})</small></h5>
                        <small class="muted">${u.correo} · ${u.rol} · ${u.puntos || 0} pts ${u.cuenta_activa ? '· ✓ Activo' : ''}</small>
                    </div>
                `;
                cont.appendChild(item);
            });
        } catch (err) {
            cont.innerHTML = '<p class="muted center error">Error al cargar usuarios.</p>';
        }
    }

    async function cargarHistorial() {
        try {
            const res = await fetch('/api/historial', { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();
            renderHistorialTemas(data.temas || []);
            renderHistorialJuegos(data.juegos || []);
        } catch (err) {
            console.error('Error cargando historial:', err);
        }
    }

    function renderHistorialTemas(temas) {
        const cont = document.getElementById('lista-temas-subidos');
        if (!cont) return;
        if (temas.length === 0) {
            cont.innerHTML = '<p class="muted center">Aún no has visitado ningún tema histórico.</p>';
            return;
        }
        cont.innerHTML = '';
        temas.forEach(t => {
            const item = document.createElement('div');
            item.className = 'lista-item-card';
            item.innerHTML = `
                <div class="lista-item-info">
                    <h5>${t.titulo}</h5>
                    <small class="muted">${t.categoria_nombre || 'General'} · ${new Date(t.fecha_vista).toLocaleDateString()}</small>
                </div>
                <div class="lista-item-acciones">
                    <a href="/ver-tema?id=${t.id}" class="boton-enviar">Ver</a>
                </div>
            `;
            cont.appendChild(item);
        });
    }

    function renderHistorialJuegos(juegos) {
        const cont = document.getElementById('lista-juegos-publicados');
        if (!cont) return;
        if (juegos.length === 0) {
            cont.innerHTML = '<p class="muted center">Aún no has jugado ninguna trivia.</p>';
            return;
        }
        cont.innerHTML = '';
        juegos.forEach(j => {
            const item = document.createElement('div');
            item.className = 'lista-item-card';
            item.innerHTML = `
                <div class="lista-item-info">
                    <h5>${j.pregunta}</h5>
                    <small class="muted">${j.categoria_nombre || 'General'} · ${new Date(j.fecha_vista).toLocaleDateString()}</small>
                </div>
                <div class="lista-item-acciones">
                    <a href="/juegos" class="boton-enviar">Jugar</a>
                </div>
            `;
            cont.appendChild(item);
        });
    }

    function mostrarMensaje(texto, tipo) {
        bloqueMensaje.textContent = texto;
        bloqueMensaje.className = `mensaje-oculto`;
        if (tipo === 'exito') {
            bloqueMensaje.style.display = 'block';
            bloqueMensaje.style.background = '#dcfce7';
            bloqueMensaje.style.color = '#16a34a';
            bloqueMensaje.style.border = '1px solid #bbf7d0';
        } else if (tipo === 'error') {
            bloqueMensaje.style.display = 'block';
            bloqueMensaje.style.background = '#fee2e2';
            bloqueMensaje.style.color = '#dc2626';
            bloqueMensaje.style.border = '1px solid #fecaca';
        } else {
            bloqueMensaje.style.display = 'none';
        }
        setTimeout(() => { bloqueMensaje.style.display = 'none'; }, 4000);
    }

    async function cargarMisRelatos() {
        const contenedor = document.getElementById('lista-mis-relatos');
        if (!contenedor) return;

        try {
            const res = await fetch('/api/mis-relatos');
            if (!res.ok) throw new Error('Error al obtener relatos');

            const relatos = await res.json();
            contenedor.innerHTML = '';

            if (relatos.length === 0) {
                contenedor.innerHTML = '<p class="muted center">Aún no has publicado ningún relato.</p>';
                return;
            }

            relatos.forEach(relato => {
                const item = document.createElement('div');
                item.className = 'lista-item-card';

                const info = document.createElement('div');
                info.className = 'lista-item-info';

                const title = document.createElement('h5');
                title.textContent = relato.titulo;

                const meta = document.createElement('small');
                meta.className = 'muted';
                meta.textContent = `Publicado: ${new Date(relato.fecha_publicacion).toLocaleDateString()}`;

                info.appendChild(title);
                info.appendChild(meta);
                item.appendChild(info);

                const acciones = document.createElement('div');
                acciones.className = 'lista-item-acciones';

                const verBtn = document.createElement('button');
                verBtn.className = 'boton-enviar';
                verBtn.textContent = 'Ver';
                verBtn.addEventListener('click', () => {
                    alert(`Relato: ${relato.titulo}\n\n${relato.contenido_relato}`);
                });
                acciones.appendChild(verBtn);

                const delBtn = document.createElement('button');
                delBtn.className = 'boton-secundario';
                delBtn.textContent = 'Eliminar';
                delBtn.style.color = '#dc2626';
                delBtn.style.borderColor = '#fecaca';
                delBtn.addEventListener('click', async () => {
                    if (!confirm('¿Eliminar este relato?')) return;
                    try {
                        const res = await fetch(`/api/relatos/${relato.id}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });
                        if (res.ok) {
                            cargarMisRelatos();
                        } else {
                            const err = await res.json();
                            alert(err.error || 'Error al eliminar');
                        }
                    } catch {
                        alert('Error de conexión');
                    }
                });
                acciones.appendChild(delBtn);

                item.appendChild(acciones);
                contenedor.appendChild(item);
            });
        } catch (error) {
            console.error('Error cargando relatos:', error);
            contenedor.innerHTML = '<p class="muted center error">No se pudieron cargar tus relatos.</p>';
        }
    }

    window.cargarMisRelatos = cargarMisRelatos;
    window.cargarMisJuegosCreados = cargarMisJuegosCreados;
    window.cargarCategorias = cargarCategorias;
    window.cargarUsuarios = cargarUsuarios;
});

async function cargarNivel() {
    try {
        const res = await fetch('/api/usuario/nivel');
        if (!res.ok) return;
        const data = await res.json();
        document.getElementById('nivel-badge').textContent = `Nv ${data.nivel}`;
        document.getElementById('nivel-titulo').textContent = data.titulo;
        document.getElementById('nivel-progreso-bar').style.width = `${data.progreso}%`;
        document.getElementById('nivel-puntos-actual').textContent = data.puntos;
        document.getElementById('nivel-puntos-siguiente').textContent = data.puntosSiguiente;
    } catch {}
}
