const formulario = document.getElementById('formulario-registro');
const bloqueMensaje = document.getElementById('mensaje-consola');

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault(); // Evitamos que la página se recargue automáticamente [cite: 247]

    // Extraemos los valores limpios de los inputs del formulario
    const nombre = document.getElementById('nombre').value;
    const correo = document.getElementById('correo').value;
    const contrasena = document.getElementById('contrasena').value;

    // Estructuramos el objeto con la información [cite: 255]
    const datosUsuario = {
        nombre: nombre,
        correo: correo,
        contrasena: contrasena
    };

    try {
        // Realizamos la petición HTTP POST hacia el backend de Node.js [cite: 261]
        const respuesta = await fetch('/auth/registro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Avisamos que enviamos un JSON [cite: 265]
            },
            body: JSON.stringify(datosUsuario) // Convertimos el objeto JS a un string JSON [cite: 266]
        });

        // Procesamos la respuesta en formato JSON que devuelve el servidor [cite: 269]
        const resultado = await respuesta.json();

        if (respuesta.ok) {
            // Si el servidor responde con éxito (Status 201) [cite: 268]
            mostrarMensaje(resultado.mensaje || '¡Usuario registrado con éxito!', 'exito');
            formulario.reset(); // Limpiamos los campos del formulario de registro [cite: 273]
        } else {
            // Si el servidor capturó un fallo de validación o duplicado (Status 400) [cite: 274, 276]
            mostrarMensaje(resultado.mensaje || 'Ocurrió un error inesperado.', 'error');
        }
    } catch (error) {
        // En caso de que el servidor esté apagado o no haya conexión a internet [cite: 278]
        mostrarMensaje('No se pudo establecer conexión con el servidor.', 'error');
    }
});

// Función dinámica encargada de renderizar los banners de alerta en el HTML
function mostrarMensaje(texto, tipo) {
    bloqueMensaje.textContent = texto;
    bloqueMensaje.className = `mensaje-alerta ${tipo}`; // Asigna los estilos correspondientes
}