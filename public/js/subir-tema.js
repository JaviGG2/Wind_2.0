inicializarEditor('contenido', 'editor-contenido');

const formulario = document.getElementById('formulario-subir-tema');
const bloqueMensaje = document.getElementById('mensaje-consola');

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const editor = document.getElementById('editor-contenido');
    const contenido = editor.innerHTML.trim();
    if (!contenido || contenido === '<br>' || contenido === '') {
        mostrarMensaje('El contenido del artículo no puede estar vacío.', 'error');
        return;
    }

    const datosFormulario = new FormData();
    datosFormulario.append('categoria_id', document.getElementById('categoria_id').value);
    datosFormulario.append('titulo', document.getElementById('titulo').value);
    datosFormulario.append('contenido', contenido);
    
    // Capturamos el archivo binario de la imagen
    const inputImagen = document.getElementById('imagen_portada');
    if (inputImagen.files.length > 0) {
        datosFormulario.append('imagen_portada', inputImagen.files[0]);
    }

    try {
        const respuesta = await fetch('/admin/subir-tema', {
            method: 'POST',
            // NOTA: Cuando se usa FormData, NO se coloca 'Content-Type' en el header, el navegador lo configura solo automáticamente.
            body: datosFormulario
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            mostrarMensaje(resultado.mensaje || '¡Tema publicado con éxito!', 'exito');
            formulario.reset();
        } else {
            mostrarMensaje(resultado.mensaje || 'Error al publicar el tema.', 'error');
        }
    } catch (error) {
        mostrarMensaje('Error de red al conectar con el servidor.', 'error');
    }
});

function mostrarMensaje(texto, tipo) {
    bloqueMensaje.textContent = texto;
    bloqueMensaje.className = `mensaje-alerta ${tipo}`;
}