const formulario = document.getElementById('formulario-login');
const bloqueMensaje = document.getElementById('mensaje-consola');

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault(); // Evita la recarga de página [cite: 11, 247]

    const correo = document.getElementById('correo').value;
    const contrasena = document.getElementById('contrasena').value;

    try {
        const respuesta = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ correo, contrasena })
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            mostrarMensaje(resultado.mensaje || '¡Bienvenido!', 'exito');
            formulario.reset();
            
            // Redirige al panel central de control en 1.2 segundos
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1200);
        } else {
            mostrarMensaje(resultado.mensaje || 'Error al iniciar sesión.', 'error');
        }
    } catch (error) {
        mostrarMensaje('No se pudo establecer conexión con el servidor.', 'error');
    }
});

function mostrarMensaje(texto, tipo) {
    bloqueMensaje.textContent = texto;
    bloqueMensaje.className = `mensaje-alerta ${tipo}`;
}