document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formulario-crear-relato');
    const consola = document.getElementById('mensaje-consola');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Publicando...';
        consola.textContent = '';

        const titulo = document.getElementById('titulo').value;
        const contenido = document.getElementById('contenido').value;
        const imagen = document.getElementById('imagen').files[0];

        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('contenido', contenido);
        if (imagen) formData.append('imagen', imagen);

        try {
            const respuesta = await fetch('/api/relatos', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const resultado = await respuesta.json();

            if (respuesta.ok) {
                consola.style.color = 'green';
                consola.textContent = '¡Relato publicado exitosamente!';
                form.reset();
                setTimeout(() => {
                    window.location.href = '/comunidad';
                }, 1500);
            } else {
                consola.style.color = 'red';
                consola.textContent = resultado.error || resultado.mensaje || 'Error al publicar el relato.';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Publicar Relato';
            }
        } catch (error) {
            console.error('Error al publicar relato:', error);
            consola.style.color = 'red';
            consola.textContent = 'Error de conexión con el servidor.';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Publicar Relato';
        }
    });
});
