const formulario = document.getElementById('formulario-registro');
const bloqueMensaje = document.getElementById('mensaje-consola');

// =========================================================================
// NUEVOS ELEMENTOS: Capturamos la sección del código agregada en el HTML
// =========================================================================
const seccionCodigo = document.getElementById('seccion-codigo');
const formVerificar = document.getElementById('form-verificar');
const codigoInput = document.getElementById('codigo-input');
const verificarCorreoInput = document.getElementById('verificar-correo');
const txtMensajeCodigo = document.getElementById('mensaje-codigo');

// 1. Escucha del Formulario de Registro Principal
formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault(); // Evitamos que la página se recargue automáticamente

    // Extraemos los valores limpios de los inputs del formulario
    const nombre = document.getElementById('nombre').value;
    const correo = document.getElementById('correo').value;
    const username = document.getElementById('username').value;
    const contrasena = document.getElementById('contrasena').value;

    // Estructuramos el objeto con la información
    const datosUsuario = {
        nombre: nombre,
        username: username,
        correo: correo,
        contrasena: contrasena
    };

    try {
        // Realizamos la petición HTTP POST hacia el backend de Node.js
        const respuesta = await fetch('/auth/registro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Avisamos que enviamos un JSON
            },
            body: JSON.stringify(datosUsuario) // Convertimos el objeto JS a un string JSON
        });

        // Procesamos la respuesta en formato JSON que devuelve el servidor
        const resultado = await respuesta.json();

        if (respuesta.ok && resultado.requiereVerificacion) {
            // =========================================================================
            // CAMBIO CLAVE: Ocultamos registro y activamos la sección del código
            // =========================================================================
            formulario.style.display = 'none'; // Oculta los inputs de registro
            seccionCodigo.style.display = 'block'; // Muestra la caja del código
            
            // Guardamos el correo en el input oculto para saber a quién activar luego
            verificarCorreoInput.value = resultado.correo;
            
            // Limpiamos el formulario viejo por seguridad
            formulario.reset(); 
        } else if (!respuesta.ok) {
            // Si el servidor capturó un fallo de validación o duplicado (Status 400)
            mostrarMensaje(resultado.mensaje || 'Ocurrió un error inesperado.', 'error');
        }
    } catch (error) {
        // En caso de que el servidor esté apagado o no haya conexión a internet
        mostrarMensaje('No se pudo establecer conexión con el servidor.', 'error');
    }
});


// 2. NUEVO EVENTO: Escucha del Formulario de Verificación de Código

formVerificar.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const correo = verificarCorreoInput.value;
    const codigo = codigoInput.value;

    try {
        // Realizamos la petición HTTP POST hacia el backend de Node.js
        const respuesta = await fetch('/auth/registro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosUsuario) 
        });

        // Procesamos la respuesta en formato JSON que devuelve el servidor
        const resultado = await respuesta.json();

        // 🔑 MODIFICACIÓN DE SEGURIDAD: 
        // Si el estatus es 201 (Creado), obligamos al cambio de pantalla.
        if (respuesta.status === 201 || (respuesta.ok && resultado.requiereVerificacion)) {
            
            // =========================================================================
            // ¡ACCIÓN! Ocultamos registro y activamos la sección del código
            // =========================================================================
            formulario.style.display = 'none'; // Oculta los inputs de registro
            seccionCodigo.style.display = 'block'; // Muestra la caja del código
            
            // Guardamos el correo que devolvió el servidor o el que metió el usuario en el input
            verificarCorreoInput.value = resultado.correo || correo;
            
            // Limpiamos el formulario viejo por seguridad
            formulario.reset(); 
        } else {
            // Si el servidor capturó un fallo de validación o duplicado (Cualquier error)
            mostrarMensaje(resultado.mensaje || 'Ocurrió un error inesperado.', 'error');
        }
    } catch (error) {
        // En caso de que el servidor esté apagado o falle la conexión a internet
        mostrarMensaje('No se pudo establecer conexión con el servidor.', 'error');
    }
});

// Función dinámica encargada de renderizar los banners de alerta en el HTML
function mostrarMensaje(texto, tipo) {
    bloqueMensaje.textContent = texto;
    bloqueMensaje.className = `mensaje-alerta ${tipo}`; // Asigna los estilos correspondientes
}