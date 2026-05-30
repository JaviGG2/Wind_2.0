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

// Función para cargar las trivias creadas en el espacio del Especialista
async function cargarMisJuegosCreados() {
    const contenedorLista = document.getElementById('lista-juegos-especialista');
    if (!contenedorLista) return;

    try {
        const respuesta = await fetch('/admin/mis-juegos');
        if (!respuesta.ok) {
            contenedorLista.innerHTML = '<p style="color: red; font-size: 0.85rem;">No se pudo cargar el historial.</p>';
            return;
        }

        const juegos = await respuesta.json();
        
        if (juegos.length === 0) {
            contenedorLista.innerHTML = '<p style="font-size: 0.85rem; color: #777; text-align: center;">Aún no has publicado ninguna trivia.</p>';
            return;
        }

        // Limpiamos el texto de "Cargando..."
        contenedorLista.innerHTML = '';

        // Recorremos los juegos y armamos los bloques HTML puros (Vanilla JS)
        juegos.forEach(juego => {
            const tarjeta = document.createElement('div');
            tarjeta.style = 'background: #fff; padding: 12px; border: 1px solid #d0e3ff; border-radius: 6px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); text-align: left;';
            
            tarjeta.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-size: 0.7rem; font-weight: bold; background: #e2e9ff; color: #0056b3; padding: 2px 6px; border-radius: 10px;">
                        📂 ${juego.categoria_nombre || 'General'}
                    </span>
                    <span style="font-size: 0.7rem; font-weight: bold; background: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 10px;">
                        💎 ${juego.puntos_recompensa} Pts
                    </span>
                </div>
                <p style="font-weight: bold; font-size: 0.9rem; margin: 4px 0; color: #333;">${juego.pregunta}</p>
                <div style="font-size: 0.8rem; color: #666; padding-left: 5px;">
                    <span style="${juego.opcion_correcta === 'A' ? 'color: green; font-weight: bold;' : ''}">A) ${juego.opcion_a}</span> | 
                    <span style="${juego.opcion_correcta === 'B' ? 'color: green; font-weight: bold;' : ''}">B) ${juego.opcion_b}</span> | 
                    <span style="${juego.opcion_correcta === 'C' ? 'color: green; font-weight: bold;' : ''}">C) ${juego.opcion_c}</span>
                </div>
            `;
            contenedorLista.appendChild(tarjeta);
        });

    } catch (error) {
        contenedorLista.innerHTML = '<p style="color: red; font-size: 0.85rem;">Error de conexión con el historial.</p>';
    }
}