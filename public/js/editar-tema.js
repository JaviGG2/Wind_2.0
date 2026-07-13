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

    try {
        const respuesta = await fetch(`/api/temas/${temaId}`);
        if (!respuesta.ok) throw new Error('No se pudo cargar el tema.');
        
        const tema = await respuesta.json();
        
        document.getElementById('tema_id').value = tema.id;
        document.getElementById('titulo').value = tema.titulo;
        
        document.getElementById('editor-contenido').innerHTML = tema.contenido || '';
        document.getElementById('contenido').value = tema.contenido || '';
        inicializarEditor('contenido', 'editor-contenido');
        
        if (tema.categoria_id) {
            document.getElementById('categoria_id').value = tema.categoria_id;
        }

        if (tema.imagen_portada) {
            const imgActual = document.getElementById('imagen-actual');
            imgActual.src = tema.imagen_portada;
            document.getElementById('imagen-actual-contenedor').style.display = 'block';
        }

        // Location
        if (tema.latitud && tema.longitud) {
            document.getElementById('latitud').value = tema.latitud;
            document.getElementById('longitud').value = tema.longitud;
            const badge = document.getElementById('ubicacion-badge');
            badge.style.display = 'flex';
            document.getElementById('ubicacion-badge-texto').textContent =
                `Ubicación: ${parseFloat(tema.latitud).toFixed(4)}, ${parseFloat(tema.longitud).toFixed(4)}`;
        }

    } catch (error) {
        consola.style.color = 'red';
        consola.textContent = 'Error al cargar los datos del tema.';
        console.error(error);
        return;
    }

    // Quitar ubicación
    const btnQuitar = document.getElementById('btn-quitar-ubicacion');
    if (btnQuitar) {
        btnQuitar.addEventListener('click', function () {
            document.getElementById('latitud').value = '';
            document.getElementById('longitud').value = '';
            document.getElementById('quitar-ubicacion').value = '1';
            document.getElementById('ubicacion-badge').style.display = 'none';
            document.getElementById('btn-agregar-ubicacion').style.display = 'flex';
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Actualizando...';
        consola.textContent = '';

        const formData = new FormData(form);

        const latInput = document.getElementById('latitud');
        const lngInput = document.getElementById('longitud');
        const quitarInput = document.getElementById('quitar-ubicacion');
        if (latInput && lngInput) {
            if (latInput.value && lngInput.value) {
                formData.set('latitud', latInput.value);
                formData.set('longitud', lngInput.value);
            } else if (quitarInput && quitarInput.value === '1') {
                formData.set('latitud', '');
                formData.set('longitud', '');
            }
        }

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
