const formulario = document.getElementById('formulario-crear-juego');
const bloqueMensaje = document.getElementById('mensaje-consola');

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const datosJuego = {
        categoria_id: document.getElementById('categoria_id')?.value,
        pregunta: document.getElementById('pregunta').value,
        opcion_a: document.getElementById('opcion_a').value,
        opcion_b: document.getElementById('opcion_b').value,
        opcion_c: document.getElementById('opcion_c').value,
        opcion_correcta: document.getElementById('opcion_correcta').value,
        puntos_recompensa: document.getElementById('puntos_recompensa').value
    };

    try {
        const respuesta = await fetch('/admin/crear-juego', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosJuego)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            mostrarMensaje(resultado.mensaje || '¡Trivia publicada!', 'exito');
            formulario.reset();
        } else {
            mostrarMensaje(resultado.mensaje || 'Error al publicar la trivia.', 'error');
        }
    } catch (error) {
        mostrarMensaje('Error de conexión con el servidor.', 'error');
    }
});

function mostrarMensaje(texto, tipo) {
    bloqueMensaje.textContent = texto;
    bloqueMensaje.className = `mensaje-alerta ${tipo}`;
}