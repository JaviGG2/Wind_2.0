/* Lógica de juegos independiente del dashboard */

async function cargarMisJuegosCreados() {
    const contenedorLista = document.getElementById('lista-juegos-especialista');
    if (!contenedorLista) return;

    try {
        const respuesta = await fetch('/admin/mis-juegos');
        if (!respuesta.ok) {
            contenedorLista.innerHTML = '<p style="color: red; font-size: 0.85rem;">No se pudo cargar el historial.</p>';
            return;
        }

        const juegos = await respuesta.json();

        if (!juegos || juegos.length === 0) {
            contenedorLista.innerHTML = '<p style="font-size: 0.85rem; color: #777; text-align: center;">Aún no has publicado ninguna trivia.</p>';
            return;
        }

        renderJuegosCreados(juegos);
    } catch (error) {
        contenedorLista.innerHTML = '<p style="color: red; font-size: 0.85rem;">Error de conexión con el historial.</p>';
    }
}

function renderJuegosCreados(juegos) {
    const contenedorLista = document.getElementById('lista-juegos-especialista');
    if (!contenedorLista) return;

    contenedorLista.innerHTML = '';

    juegos.forEach(juego => {
        const tarjeta = document.createElement('div');
        tarjeta.style.cssText = 'background: #fff; padding: 12px; border: 1px solid #d0e3ff; border-radius: 6px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); text-align: left;';

        tarjeta.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <span style="font-size: 0.7rem; font-weight: bold; background: #e2e9ff; color: #0056b3; padding: 2px 6px; border-radius: 10px;">
                    ${juego.categoria_nombre || 'General'}
                </span>
                <span style="font-size: 0.7rem; font-weight: bold; background: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 10px;">
                    ${juego.puntos_recompensa} Pts
                </span>
            </div>
            <p style="font-weight: bold; font-size: 0.9rem; margin: 4px 0; color: #333;">${juego.pregunta}</p>
            <div style="font-size: 0.8rem; color: #666; padding-left: 5px; line-height: 1.5;">
                <span style="${juego.opcion_correcta === 'A' ? 'color: green; font-weight: bold;' : ''}">A) ${juego.opcion_a}</span><br>
                <span style="${juego.opcion_correcta === 'B' ? 'color: green; font-weight: bold;' : ''}">B) ${juego.opcion_b}</span><br>
                <span style="${juego.opcion_correcta === 'C' ? 'color: green; font-weight: bold;' : ''}">C) ${juego.opcion_c}</span>
            </div>
        `;

        contenedorLista.appendChild(tarjeta);
    });
}

async function cargarModuloJuegos() {
    const contenedor = document.getElementById('juegos-disponibles');
    if (!contenedor) return;

    contenedor.innerHTML = '<p style="font-size: 0.95rem; color: #666;">Cargando el módulo de juegos...</p>';

    try {
        const respuesta = await fetch('/admin/mis-juegos');
        if (!respuesta.ok) {
            contenedor.innerHTML = '<p style="color: red; font-size: 0.85rem;">No se pudo cargar el módulo de juegos.</p>';
            return;
        }

        const juegos = await respuesta.json();
        if (!juegos || juegos.length === 0) {
            contenedor.innerHTML = '<p style="font-size: 0.95rem; color: #777;">No hay juegos disponibles por ahora.</p>';
            return;
        }

        contenedor.innerHTML = '';
        juegos.slice(0, 5).forEach(juego => {
            const tarjeta = document.createElement('article');
            tarjeta.style.cssText = 'background: #121212; color: #fff; padding: 18px; border-radius: 14px; margin-bottom: 12px;';
            tarjeta.innerHTML = `
                <h3 style="margin: 0 0 10px 0; font-size: 1rem;">${juego.pregunta}</h3>
                <p style="margin: 0; font-size: 0.9rem; color: #d0d7ff;">${juego.categoria_nombre || 'General'}</p>
            `;
            contenedor.appendChild(tarjeta);
        });
    } catch (error) {
        contenedor.innerHTML = '<p style="color: red; font-size: 0.85rem;">Error de conexión con el servidor.</p>';
    }
}
