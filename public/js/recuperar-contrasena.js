const formulario = document.getElementById('form-recuperar');
const bloqueMensaje = document.getElementById('mensaje-consola');

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const correo = document.getElementById('correo').value;

    try {
        const respuesta = await fetch('/auth/solicitar-recuperacion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo })
        });

        const resultado = await respuesta.json();
        bloqueMensaje.textContent = resultado.mensaje;
        bloqueMensaje.className = 'mensaje-alerta exito';
    } catch (error) {
        bloqueMensaje.textContent = 'Error de conexión. Intenta de nuevo.';
        bloqueMensaje.className = 'mensaje-alerta error';
    }
});
