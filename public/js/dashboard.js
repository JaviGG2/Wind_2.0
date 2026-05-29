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
        const res = await fetch('/auth/perfil');
        if (!res.ok) {
            // Si no está logueado, lo mandamos al login de inmediato
            window.location.href = 'login.html';
            return;
        }

        const usuario = await res.json();
        bienvenida.innerHTML = `¡Hola, <strong>${usuario.nombre}</strong>! Bienvenido a la plataforma web de preservación digital.`;

        // 2. Renderizado condicional según el Rol de la Base de Datos
        configurarVistasPorRol(usuario.rol);

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
        const res = await fetch('/auth/logout', { method: 'POST' });
        if (res.ok) window.location.href = 'login.html';
    });

    // Función auxiliar para prender/apagar componentes de la interfaz
    function configurarVistasPorRol(rol, juegosCreados = []) {
        if (rol === 'Especialista') {
            seccionNatural.style.display = 'none';
            seccionEspecialista.style.display = 'block';
            seccionJuegosCreados.style.display = 'block';
            mostrarJuegosCreados(juegosCreados);
        } else {
            seccionNatural.style.display = 'block';
            seccionEspecialista.style.display = 'none';
            seccionJuegosCreados.style.display = 'none';
        }
    }

    function mostrarJuegosCreados(juegos) {
        listaJuegosCreados.innerHTML = '';

        if (!juegos || juegos.length === 0) {
            textoJuegosCreados.textContent = 'Aún no has creado ninguna trivia. Crea una nueva para que aparezca aquí.';
            return;
        }

        textoJuegosCreados.textContent = `Has creado ${juegos.length} trivia(s).`;

        juegos.forEach((juego) => {
            const item = document.createElement('li');
            item.style.marginBottom = '12px';
            item.style.padding = '12px';
            item.style.border = '1px solid #d0d7ff';
            item.style.borderRadius = '8px';
            item.style.backgroundColor = '#ffffff';

            item.innerHTML = `
                <strong>${juego.pregunta}</strong>
                <p style="margin: 8px 0 0 0; color: #444; font-size: 0.95rem;">
                    Puntos: ${juego.puntos_recompensa}
                </p>
            `;

            listaJuegosCreados.appendChild(item);
        });
    }

    function mostrarMensaje(texto, tipo) {
        bloqueMensaje.textContent = texto;
        bloqueMensaje.className = `mensaje-alerta ${tipo}`;
    }
});