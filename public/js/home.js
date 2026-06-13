document.addEventListener('DOMContentLoaded', () => {
    const temasContainer = document.getElementById('temas-listado');
    const mensajeCarga = document.getElementById('temas-mensaje');

    if (!temasContainer || !mensajeCarga) return;

    async function cargarTemas() {
        mensajeCarga.textContent = 'Cargando temas históricos...';

        try {
            const respuesta = await fetch('/api/temas',  {
            method: 'GET',
        credentials: 'include', // <--- ¡ESTA ES LA LÍNEA MÁGICA! Obliga al navegador a llevar la cookie
        headers: {
            'Content-Type': 'application/json'
        }
    });
            if (!respuesta.ok) {
                mensajeCarga.textContent = 'No se pudieron cargar los temas. Intenta de nuevo más tarde.';
                return;
            }

            const temas = await respuesta.json();
            if (!Array.isArray(temas) || temas.length === 0) {
                mensajeCarga.textContent = 'No hay temas disponibles por ahora.';
                return;
            }

            mensajeCarga.style.display = 'none';
            temas.forEach(tema => temasContainer.appendChild(crearTarjetaTema(tema)));
        } catch (error) {
            mensajeCarga.textContent = 'Error de conexión al cargar los temas.';
            console.error('Error al obtener temas:', error);
        }
    }

    function crearTarjetaTema(tema) {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'tarjeta-tema';
    // Le ponemos una manito al cursor para que sepa que es cliqueable
    tarjeta.style.cursor = 'pointer'; 

    tarjeta.innerHTML = `
        <div class="tema-imagen" style="background-image: url('${tema.imagen_portada || '/img/app.png'}');"></div>
        <div class="tema-contenido">
            <h3 class="tema-titulo">${tema.titulo || 'Tema sin título'}</h3>
            <p>${crearExtracto(tema.contenido)}</p>
            <div class="tema-meta">
                <span class="tema-categoria">${tema.categoria_nombre || 'General'}</span>
                <span class="tema-autor">Por: ${tema.creador_nombre || 'Anónimo'}</span>
            </div>
            <div style="margin-top: 15px; text-align: right;">
                <span class="btn-explorar" style="font-weight: bold; color: #d35400;">
                    Explorar Contenido →
                </span>
            </div>
        </div>
    `;

    // 🔑 LA SOLUCIÓN MANDATORIA: Al hacer clic en CUALQUIER parte de la tarjeta,
    // obligamos al navegador a mudarse de página, rompiendo cualquier bloqueo.
    tarjeta.addEventListener('click', (evento) => {
        // Evitamos que otros scripts interfieran
        evento.stopPropagation(); 
        
        // Lo mandamos directo a la nueva vista con su ID
        window.location.href = `/ver-tema?id=${tema.id}`;
    });

    return tarjeta;
    }
    

    function crearExtracto(texto) {
        if (!texto) return 'Contenido no disponible.';
        const limpio = texto.replace(/(<([^>]+)>)/gi, '');
        return limpio.length > 160 ? `${limpio.slice(0, 160).trim()}...` : limpio;
    }

    cargarTemas();
});