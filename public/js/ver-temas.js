document.addEventListener('DOMContentLoaded', async () => {
    const bloqueCarga = document.getElementById('bloque-carga');
    const bloqueContenido = document.getElementById('bloque-contenido');

    // 1. Leer la URL
    const parametrosURL = new URLSearchParams(window.location.search);
    const temaId = parametrosURL.get('id'); 
    
    console.log("ID del tema capturado desde la URL:", temaId); // Para verificar en consola

    if (!temaId) {
        bloqueCarga.innerHTML = "<p> Error: No se especificó el ID del tema en la URL.</p>";
        return;
    }

    try {
        // 2. Pedirle los datos al backend usando la ruta relativa correcta
        const respuesta = await fetch(`/api/temas/${temaId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!respuesta.ok) {
            // Intentamos leer el JSON de error para mostrar un mensaje más útil
            let errMsg = `Error ${respuesta.status}`;
            try {
                const errJson = await respuesta.json();
                if (errJson && errJson.mensaje) errMsg = errJson.mensaje;
            } catch (e) {
                // no JSON en la respuesta
            }
            throw new Error(errMsg || 'El tema no existe en la base de datos.');
        }

        const tema = await respuesta.json();

        // 3. Sembrar los datos en el HTML
        document.getElementById('txt-titulo').textContent = tema.titulo || 'Sin título';
        document.getElementById('txt-categoria').textContent = tema.categoria_nombre || 'General';
        document.getElementById('txt-cuerpo').innerHTML = tema.contenido || 'Contenido vacío';
        
        const imgPortadaEl = document.getElementById('img-portada');
        if (tema.imagen_portada) {
            let imgPath = tema.imagen_portada;
            // Asegurar que la ruta comience con '/' para que el servidor la sirva correctamente
            if (!imgPath.startsWith('/') && !imgPath.startsWith('http')) {
                imgPath = '/' + imgPath;
            }
            imgPortadaEl.style.backgroundImage = `url('${imgPath}')`;
        } else {
            imgPortadaEl.style.backgroundImage = `url('/img/app.png')`;
        }

        // 4. Intercambiar visibilidad
        bloqueCarga.style.display = 'none';
        bloqueContenido.style.display = 'block';

    } catch (error) {
        console.error("Error en ver-tema.js:", error);
        bloqueCarga.innerHTML = `<p style="color: red;">Error al cargar el contenido: ${error.message}</p>`;
    }
});