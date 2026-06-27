const formulario = document.getElementById("form-relato");
const mensaje = document.getElementById("mensaje-consola");
const listaRelatos = document.getElementById("lista-relatos");

const ESTILOS_POPUP = `
.popup-relato {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}
.popup-relato.oculto { display: none !important; }
.popup-relato-contenido {
    background: #fff;
    border-radius: 12px;
    padding: 32px 28px 28px;
    max-width: 600px;
    width: 90%;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    position: relative;
}
.popup-relato-cerrar {
    position: absolute;
    top: 12px; right: 12px;
    background: none; border: none; cursor: pointer;
    color: #888; padding: 4px; border-radius: 50%;
    display: flex; z-index: 1;
}
.popup-relato-cerrar:hover { background: #f0f0f0; color: #333; }
.popup-relato-contenido h2 {
    margin: 0 0 6px; font-size: 1.3rem; color: #ff4500;
    padding-right: 28px;
}
.popup-relato-contenido .popup-meta {
    font-size: 0.85rem; color: #888; margin: 0 0 16px;
}
.popup-relato-contenido p {
    font-size: 0.95rem; line-height: 1.6; color: #444;
    white-space: pre-wrap;
}
.popup-relato-contenido img {
    max-width: 100%; height: auto; border-radius: 8px;
    margin-top: 16px; display: block;
}
`;

function inyectarEstilosPopup() {
    if (document.getElementById('popup-relato-estilos')) return;
    const style = document.createElement('style');
    style.id = 'popup-relato-estilos';
    style.textContent = ESTILOS_POPUP;
    document.head.appendChild(style);
}

function crearPopupRelato(relato) {
    inyectarEstilosPopup();

    const overlay = document.createElement('div');
    overlay.className = 'popup-relato';
    overlay.innerHTML = `
        <div class="popup-relato-contenido">
            <button type="button" class="popup-relato-cerrar">
                <span class="material-symbols-outlined">close</span>
            </button>
            <h2>${relato.titulo}</h2>
            <p class="popup-meta">${relato.autor_nombre || 'Anónimo'} — ${new Date(relato.fecha_publicacion).toLocaleDateString()}</p>
            <p>${relato.contenido_relato}</p>
            ${relato.imagen_url ? `<img src="${relato.imagen_url}" alt="${relato.titulo}">` : ''}
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.popup-relato-cerrar').addEventListener('click', () => {
        overlay.remove();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

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
            div.className = "tarjeta-relato";
            div.dataset.relatoId = relato.id;

            let imagenHTML = "";
            if (relato.imagen_url) {
                imagenHTML = `<img src="${relato.imagen_url}" alt="Imagen del relato" style="max-width:100%;height:auto;border-radius:8px;margin-top:10px;display:block;">`;
            }

            div.innerHTML = `
                <h3>${relato.titulo}</h3>
                <p>${relato.contenido_relato}</p>
                ${imagenHTML} <br>
                <small>Publicado el: ${new Date(relato.fecha_publicacion).toLocaleDateString()}</small>
                <hr>
            `;

            div.addEventListener('click', () => {
                crearPopupRelato(relato);
            });

            listaRelatos.appendChild(div);
        });
    } catch (error) {
        console.error("Error al cargar los relatos:", error);
    }
}
cargarRelatos();

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
