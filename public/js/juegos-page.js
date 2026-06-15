/* Juegos page logic */

const juegosCache = [];
const state = {
    filtro: '',
    indice: -1,
    puntosUsuario: 0
};

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

async function cargarDatosJuegos() {
    const statusEl = $('#juegos-status');
    if (statusEl) statusEl.textContent = 'Cargando...';

    try {
        const [juegosRes, perfilRes] = await Promise.all([
            fetch('/api/juegos'),
            fetch('/auth/perfil', { credentials: 'include' })
        ]);

        if (juegosRes.ok) {
            juegosCache.length = 0;
            const data = await juegosRes.json();
            data.forEach(j => juegosCache.push(j));
            if (statusEl) statusEl.textContent = `${juegosCache.length} trivia(s)`;
            $('#total-juegos-count').textContent = juegosCache.length;
        }

        if (perfilRes.ok) {
            const perfil = await perfilRes.json();
            state.puntosUsuario = (perfil.puntos || 0);
            $('#mis-puntos-count').textContent = state.puntosUsuario;
        }

        const categorias = [...new Set(juegosCache.map(j => j.categoria_nombre).filter(Boolean))];
        renderFiltros(categorias);

        if (state.filtro) {
            aplicarFiltro(state.filtro);
        } else {
            renderGrid(juegosCache);
        }
    } catch (err) {
        if (statusEl) statusEl.textContent = 'Error al cargar';
        console.error('[juegos-page] Error cargando datos:', err);
    }
}

function renderFiltros(categorias) {
    const contenedor = $('#filtros-juegos');
    if (!contenedor) return;

    const todos = contenedor.querySelector('button');
    categorias.forEach(cat => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.dataset.categoria = cat;
        chip.innerHTML = `<span class="material-symbols-outlined">category</span> ${cat}`;
        contenedor.appendChild(chip);
    });

    contenedor.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            contenedor.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const categoria = btn.dataset.categoria;
            state.filtro = categoria;
            aplicarFiltro(categoria);
        });
    });
}

function aplicarFiltro(categoria) {
    const lista = categoria
        ? juegosCache.filter(j => (j.categoria_nombre || 'General') === categoria)
        : juegosCache;
    renderGrid(lista);
}

function renderGrid(juegos) {
    const contenedor = $('#juegos-disponibles');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (juegos.length === 0) {
        contenedor.innerHTML = '<p style="color:#777; text-align:center; width:100%;">No hay trivias disponibles.</p>';
        return;
    }

    juegos.forEach(juego => {
        const tarjeta = document.createElement('article');
        tarjeta.className = 'juego-card';
        tarjeta.innerHTML = `
            <div class="juego-card-header">
                <span class="juego-cat">${juego.categoria_nombre || 'General'}</span>
                <span class="juego-pts">
                    <span class="material-symbols-outlined">star</span>
                    ${juego.puntos_recompensa || 10} pts
                </span>
            </div>
            <h3 class="juego-pregunta-texto juego-card-titulo">${juego.pregunta}</h3>
            <button class="btn-jugar" data-id="${juego.id}">
                <span class="material-symbols-outlined">play_arrow</span>
                Jugar
            </button>
        `;
        contenedor.appendChild(tarjeta);
    });

    contenedor.querySelectorAll('.btn-jugar').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id, 10);
            abrirJuego(id);
        });
    });
}

async function abrirJuego(id) {
    const juego = juegosCache.find(j => j.id === id);
    if (!juego) return;

    state.indice = juegosCache.findIndex(j => j.id === id);
    mostrarModalJuego(juego);
}

function mostrarModalJuego(juego) {
    const modal = $('#modal-juego');
    if (!modal) return;

    $('#juego-modal-cat').textContent = juego.categoria_nombre || 'General';
    $('#juego-modal-pts').textContent = juego.puntos_recompensa || 10;
    $('#modal-pregunta').textContent = juego.pregunta;

    const opcionesEl = $('#juego-opciones');
    opcionesEl.innerHTML = '';

    ['A', 'B', 'C'].forEach(letra => {
        const opcion = juego[`opcion_${letra.toLowerCase()}`];
        const btn = document.createElement('button');
        btn.className = 'opcion-btn';
        btn.innerHTML = `<span>${letra})</span> ${opcion}`;
        btn.dataset.letra = letra;
        btn.addEventListener('click', () => responderTrivia(juego, letra, btn));
        opcionesEl.appendChild(btn);
    });

    $('#juego-playing').style.display = 'block';
    $('#juego-resultado').style.display = 'none';
    modal.style.display = 'block';
}

async function responderTrivia(juego, letra, btnElegido) {
    const correcta = juego.opcion_correcta;
    const respuesta = { juego_id: juego.id, respuesta_usuario: letra };

    let puntosGanados = 0;
    let esCorrecta = false;

    try {
        const r = await fetch('/api/juegos/responder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(respuesta)
        });

        const data = await r.json();
        if (!r.ok) {
            console.error('[juegos-page] Error al enviar respuesta:', data);
        }

        esCorrecta = data.correcto === true;
        puntosGanados = (data.puntos_ganados || 0) || (esCorrecta ? (juego.puntos_recompensa || 10) : 0);

        if (esCorrecta && Number.isFinite(puntosGanados)) {
            state.puntosUsuario += puntosGanados;
        }
    } catch (err) {
        console.error('[juegos-page] Fallo en responderTrivia:', err);
    }

    const todosLosBotones = $('#juego-opciones').querySelectorAll('.opcion-btn');

    todosLosBotones.forEach(btn => {
        btn.style.pointerEvents = 'none';
        const letraBtn = btn.dataset.letra;

        if (letraBtn === correcta) {
            btn.classList.add('correcta');
        } else if (letraBtn === letra && !esCorrecta) {
            btn.classList.add('incorrecta');
        }
    });

    $('#juego-playing').style.display = 'none';
    $('#juego-resultado').style.display = 'block';

    const icono = $('#resultado-icon');
    icono.innerHTML = esCorrecta
        ? '<span class="material-symbols-outlined" style="color:#28a745; font-size:3rem;">check_circle</span>'
        : '<span class="material-symbols-outlined" style="color:#dc3545; font-size:3rem;">cancel</span>';

    $('#resultado-titulo').textContent = esCorrecta ? '¡Correcto!' : 'Incorrecto';
    $('#resultado-mensaje').textContent = esCorrecta
        ? 'Muy bien, ganaste puntos.'
        : 'Sigue intentando, la próxima será.';

    if (esCorrecta) {
        $('#resultado-puntos').style.display = 'block';
        $('#resultado-pts-num').textContent = puntosGanados;
    } else {
        $('#resultado-puntos').style.display = 'none';
    }

    const letraCorrecta = (['A', 'B', 'C'].includes(correcta.toUpperCase())) ? correcta.toUpperCase() : null;
    let textoCorrecto = '';

    if (letraCorrecta) {
        const map = { A: juego.opcion_a, B: juego.opcion_b, C: juego.opcion_c };
        textoCorrecto = (map[letraCorrecta] || correcta).trim();
    } else {
        textoCorrecto = (juego[`opcion_${correcta.toLowerCase()}`] || correcta).trim();
    }

    $('#resultado-correcta-texto').textContent = `${letraCorrecta || ''}) ${textoCorrecto}`;
    $('#btn-cerrar-resultado').onclick = cerrarModal;

    $('#mis-puntos-count').textContent = state.puntosUsuario;
}

function siguienteTrivia() {
    const siguienteIndice = state.indice + 1;
    if (siguienteIndice < juegosCache.length) {
        state.indice = siguienteIndice;
        mostrarModalJuego(juegosCache[siguienteIndice]);
    } else {
        cerrarModal();
    }
}

function cerrarModal() {
    const modal = $('#modal-juego');
    if (modal) modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    cargarDatosJuegos();

    $('#juego-close-btn')?.addEventListener('click', cerrarModal);
    $('#btn-siguiente-juego')?.addEventListener('click', siguienteTrivia);
});
