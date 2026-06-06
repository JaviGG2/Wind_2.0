const formulario = document.getElementById ("form-relato");
const mensaje = document.getElementById ("mensaje-consola");
//buscar los elementos del HTML

// aqui es donde se escucha el evento de submit del formulario
formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
});
//agregar un evento al formulario para que no se recargue la página al enviar el relato

const datosRelato={
    titulo: titulo,
    contenido: contenido
}

try {
    const respuesta = await fetch("/api/relatos", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(datosRelato)
    });

    const resultado = await respiesta.json();

    if (respuesta.ok) {
        mensaje.textContent = "Relato enviado con éxito";
        formulario.reset();
    } else {
        mensaje.textContent = resultado.error || "Error al enviar el relato";
    }

} catch (error) {
    mensaje.textContent = "Error de red al enviar el relato";
    console.error("Error al enviar el relato:", error);
}