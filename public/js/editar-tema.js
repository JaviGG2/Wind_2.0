document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const temaId = urlParams.get('id');
    const form = document.getElementById('formulario-editar-tema');
    const consola = document.getElementById('mensaje-consola');

    if (!temaId) {
        consola.style.color = 'red';
        consola.textContent = 'Error: No se especificó el ID del tema a editar.';
        form.style.display = 'none';
        return;
    }

    // 1. Cargar datos del tema
    try {
        const respuesta = await fetch(`/api/temas/${temaId}`);
        if (!respuesta.ok) throw new Error('No se pudo cargar el tema.');
        
        const tema = await respuesta.json();
        
        // Rellenar el formulario
        document.getElementById('tema_id').value = tema.id;
        document.getElementById('titulo').value = tema.titulo;
        document.getElementById('contenido').value = tema.contenido;
        
        if (tema.categoria_id) {
            document.getElementById('categoria_id').value = tema.categoria_id;
        }

        if (tema.imagen_portada && tema.imagen_portada !== 'uploads/defecto.jpg') {
            const imgActual = document.getElementById('imagen-actual');
            imgActual.src = '/' + tema.imagen_portada;
            document.getElementById('imagen-actual-contenedor').style.display = 'block';
        }

    } catch (error) {
        consola.style.color = 'red';
        consola.textContent = 'Error al cargar los datos del tema.';
        console.error(error);
        return;
    }

    // 2. Manejar el envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Actualizando...';
        consola.textContent = '';

        const formData = new FormData(form);

        try {
            const respuesta = await fetch(`/admin/temas/${temaId}`, {
                method: 'PUT',
                body: formData
            });

            const resultado = await respuesta.json();

            if (respuesta.ok) {
                consola.style.color = 'green';
                consola.textContent = '¡Tema actualizado exitosamente!';
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } else {
                consola.style.color = 'red';
                consola.textContent = resultado.mensaje || 'Error al actualizar el tema.';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Actualizar Tema';
            }
        } catch (error) {
            console.error('Error:', error);
            consola.style.color = 'red';
            consola.textContent = 'Error de conexión con el servidor.';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Actualizar Tema';
        }
    });
});
