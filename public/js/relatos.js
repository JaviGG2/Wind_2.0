const formulario = document.getElementById ("form-relato");
const mensaje = document.getElementById ("mensaje-consola");
const listaRelatos = document.getElementById("lista-relatos");

async function cargarRelatos() {
    try {
        const respuesta = await fetch("/api/relatos"); 
        const relatos = await respuesta.json();
        
        listaRelatos.innerHTML = ""; 

        if (relatos.length === 0) {
            listaRelatos.innerHTML = "<p>No hay relatos aún. ¡Sé el primero en compartir tu experiencia!</p>";
            return;
        }

        relatos.forEach(relato => {
            const div = document.createElement("div");
            div.classList.add("tarjeta-relato");

            let imagenHTML = "";
            if (relato.imagen_url) {
                imagenHTML = `<img src="${relato.imagen_url}" alt="Imagen del relato" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 10px; display: block;">`;
            }

            div.innerHTML = `
                <h3>${relato.titulo}</h3>
                <p>${relato.contenido_relato}</p>
                ${imagenHTML} <br>
                <small>Publicado el: ${new Date(relato.fecha_publicacion).toLocaleDateString()}</small>
                <hr>
            `;
            listaRelatos.appendChild(div);
        });
    } catch (error) {
        console.error("Error al cargar los relatos:", error);
    }
}
cargarRelatos();

// aqui es donde se escucha el evento de submit del formulario
formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const tituloInput = document.getElementById("titulo-relato").value;
    const contenidoInput = document.getElementById("contenido-relato").value;

    const datosRelato = {
        titulo: tituloInput,
        contenido: contenidoInput
    };

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
            formulario.reset();
            cargarRelatos();
        } else {
            mensaje.textContent = resultado.error || "Error al enviar el relato";
        }

    } catch (error) {
        mensaje.textContent = "Error de red al intentar conectar con el servidor";
        console.error("Error al enviar el relato:", error);
    }
});