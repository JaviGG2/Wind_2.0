const formulario = document.getElementById ("form-relato");
const mensaje = document.getElementById ("mensaje-consola");
const listaRelatos = document.getElementById("lista-relatos");
//buscar los elementos del HTML


async function cargarRelatos() {
    try {
        const respuesta = await fetch("/api/relatos"); // Petición GET por defecto
        const relatos = await respuesta.json();
        
        // Limpiar el contenedor antes de renderizar para no duplicar
        listaRelatos.innerHTML = ""; 

        if (relatos.length === 0) {
            listaRelatos.innerHTML = "<p>No hay relatos aún. ¡Sé el primero en compartir tu experiencia!</p>";
            return;
        }

        // Recorrer los relatos que devolvió el servidor y agregarlos al HTML
        relatos.forEach(relato => {
            const div = document.createElement("div");
            div.classList.add("tarjeta-relato");
            div.innerHTML = `
                <h3>${relato.titulo}</h3>
                <p>${relato.contenido_relato}</p>
                <small>Publicado el: ${new Date(relato.fecha_publicacion).toLocaleDateString()}</small>
                <hr>
            `;
            listaRelatos.appendChild(div);
        });
    } catch (error) {
        console.error("Error al cargar los relatos:", error);
    }
}
// Llamar a la función automáticamente cuando cargue la página por primera vez
cargarRelatos();

// aqui es donde se escucha el evento de submit del formulario
// =========================================================================
// ESCUCHADOR PARA ENVIAR NUEVOS RELATOS (POST)
// =========================================================================
formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault(); // Detiene la recarga de la página

    // 1. CAPTURAR los textos en el momento exacto en que se hace click en enviar
    const tituloInput = document.getElementById("titulo-relato").value;
    const contenidoInput = document.getElementById("contenido-relato").value;

    // 2. ARMAR el objeto JSON con los valores reales
    const datosRelato = {
        titulo: tituloInput,
        contenido: contenidoInput
    };

    // 3. ENVIAR los datos mediante la red
    try {
        const respuesta = await fetch("/api/relatos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datosRelato)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            mensaje.textContent = "¡Relato enviado con éxito!";
            formulario.reset(); // Limpia los cuadros de texto
            cargarRelatos();    // Actualiza la lista para ver el nuevo relato abajo
        } else {
            mensaje.textContent = resultado.error || "Error al enviar el relato";
        }

    } catch (error) {
        mensaje.textContent = "Error de red al intentar conectar con el servidor";
        console.error("Error al enviar el relato:", error);
    }
}); // <--- La llave y el paréntesis deben cerrarse al final de TODO el proceso