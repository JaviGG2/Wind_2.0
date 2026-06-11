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
            credentials: 'include' // 👈 OBLIGATORIO para que lea la sesión global
        });
        if (!res.ok) {
            // Si no está logueado, lo mandamos al login de inmediato
            window.location.href = 'login';
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
        if (rol === 'Especialista') {
            seccionNatural.style.display = 'none';
            seccionEspecialista.style.display = 'block';
            
            // Si tienes un contenedor específico para los juegos creados con este id, lo encendemos
            if (typeof seccionJuegosCreados !== 'undefined') {
                seccionJuegosCreados.style.display = 'block';
            }

            // Llamamos a nuestra función que viaja al backend y trae el historial fresquito
            cargarMisJuegosCreados();

        } else {
            seccionNatural.style.display = 'block';
            seccionEspecialista.style.display = 'none';
            
            if (typeof seccionJuegosCreados !== 'undefined') {
                seccionJuegosCreados.style.display = 'none';
            }
            
            // Aquí puedes activar la función para cargar las trivias del usuario natural
            if (typeof cargarModuloJuegos === 'function') {
                cargarModuloJuegos();
            }
        }
    }
   
    function mostrarMensaje(texto, tipo) {
        bloqueMensaje.textContent = texto;
        bloqueMensaje.className = `mensaje-alerta ${tipo}`;
    }
});