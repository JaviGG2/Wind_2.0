document.addEventListener('DOMContentLoaded', async () => {
    const bienvenida = document.getElementById('bienvenida-usuario');
    const seccionNatural = document.getElementById('seccion-natural');
    const seccionEspecialista = document.getElementById('seccion-especialista');
    const btnSolicitar = document.getElementById('btn-solicitar-ascenso');
    const quizEvaluacion = document.getElementById('quiz-evaluacion');
    const formEvaluacion = document.getElementById('form-evaluacion');
    const bloqueMensaje = document.getElementById('mensaje-consola');
    const btnLogout = document.getElementById('btn-logout');

    // 1. Consultar el perfil al cargar el Dashboard
    try {
        const res = await fetch('/auth/perfil', {
            method: 'GET',
            credentials: 'include' // OBLIGATORIO para que lea la sesión global
        });
        console.debug('[dashboard] /auth/perfil status', res.status);
        if (!res.ok) {
            // Si no está logueado, lo mandamos al login de inmediato
            console.warn('[dashboard] perfil no autorizado, redirigiendo a login');
            window.location.href = 'login';
            return;
        }

        // Intentamos parsear JSON y mostrarlo en consola para depuración
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

        // Rellenar header: nombre, username y rol
        const nombreElem = document.getElementById('nombre-usuario');
        const usernameElem = document.getElementById('username');
        const rolElem = document.getElementById('rol-usuario');
        const avatarElem = document.getElementById('perfil-avatar');

        if (nombreElem) nombreElem.textContent = usuario.nombre || 'Sin nombre';
        if (usernameElem) usernameElem.textContent = usuario.username ? `${usuario.username}` : '';
        if (rolElem) rolElem.textContent = usuario.rol || '';
        if (avatarElem && usuario.imagen_perfil) avatarElem.src = usuario.imagen_perfil;

        if (!usuario.nombre) {
            mostrarMensaje('Perfil cargado pero falta el nombre en la sesión.', 'error');
            console.warn('[dashboard] perfil sin nombre:', usuario);
        }

        bienvenida.innerHTML = `¡Hola, <strong>${usuario.nombre || 'Usuario'}</strong>! Bienvenido a la plataforma web de preservación digital.`;

        // 2. Renderizado condicional según el Rol de la Base de Datos
        configurarVistasPorRol(usuario.rol);
        if (typeof cargarMisTemas === 'function') cargarMisTemas();

    } catch (error) {
        bienvenida.textContent = 'Error de conexión con el panel.';
    }

    // Mostrar el bloque del test al presionar el botón de solicitud
    btnSolicitar.addEventListener('click', () => {
        quizEvaluacion.style.display = 'block';
        bloqueMensaje.className = 'mensaje-oculto';
    });

    // 3. Procesar el envío del examen de conocimientos históricos
    formEvaluacion.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Obtener la opción que seleccionó el usuario
        const opcionSeleccionada = document.querySelector('input[name="p1"]:checked');
        
        if (!opcionSeleccionada) {
            mostrarMensaje('Por favor, selecciona una respuesta.', 'error');
            return;
        }

        try {
            const resAscenso = await fetch('/auth/ascender', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ respuestaExamen: opcionSeleccionada.value })
            });

            const resultado = await resAscenso.json();

            if (resAscenso.ok) {
                mostrarMensaje(resultado.mensaje, 'exito');
                quizEvaluacion.style.display = 'none';
                // Cambiamos dinámicamente la vista al nuevo rol desbloqueado
                configurarVistasPorRol(resultado.nuevoRol);
            } else {
                mostrarMensaje(resultado.mensaje, 'error');
            }
        } catch (error) {
            mostrarMensaje('Error al intentar comunicar la aprobación con el servidor.', 'error');
        }
    });

    // 4. Manejador para cerrar sesión de manera limpia
    btnLogout.addEventListener('click', async () => {
        const res = await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        if (res.ok) window.location.replace('/login');
    });

   // Función auxiliar para prender/apagar componentes de la interfaz
    function configurarVistasPorRol(rol) {
        const seccionContenidos = document.getElementById('seccion-contenidos');
        const seccionRelatos = document.getElementById('seccion-relatos');

        if (rol === 'Especialista') {
            seccionNatural.style.display = 'none';
            seccionEspecialista.style.display = 'block';
            if (seccionContenidos) seccionContenidos.style.display = 'block';
            if (seccionRelatos) seccionRelatos.style.display = 'block';

            if (typeof cargarMisTemas === 'function') cargarMisTemas();
            if (typeof cargarMisRelatos === 'function') cargarMisRelatos();
        } else {
            seccionNatural.style.display = 'block';
            seccionEspecialista.style.display = 'none';
            if (seccionContenidos) seccionContenidos.style.display = 'none';
            if (seccionRelatos) seccionRelatos.style.display = 'block';

            if (typeof cargarMisRelatos === 'function') cargarMisRelatos();
        }
    }
   
    function mostrarMensaje(texto, tipo) {
        bloqueMensaje.textContent = texto;
        bloqueMensaje.className = `mensaje-alerta ${tipo}`;
    }

    // Función para cargar los relatos del usuario activo
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
                    // Muestra el relato, podrías llevarlo a una página /ver-relato
                    alert(`Relato: ${relato.titulo}\n\n${relato.contenido_relato}`);
                });
                acciones.appendChild(verBtn);

                item.appendChild(acciones);
                contenedor.appendChild(item);
            });
        } catch (error) {
            console.error('Error cargando relatos:', error);
            contenedor.innerHTML = '<p class="muted center error">No se pudieron cargar tus relatos.</p>';
        }
    }

    // Exponer la función globalmente para que pueda ser llamada en configurarVistasPorRol
    window.cargarMisRelatos = cargarMisRelatos;
});