/* Juegos page logic */

const urlParams = new URLSearchParams(window.location.search);
const moduloId = urlParams.get('modulo');
const nivelId = urlParams.get('nivel');
const juegoIdUrl = urlParams.get('id');

const juegosCache = [];
const state = {
    filtro: '',
    indice: -1,
    puntosUsuario: 0,
    memoryEmparejados: 0,
    memoryTotal: 0,
    primeraCarta: null,
    segundaCarta: null,
    matchConectados: 0,
    matchTotal: 0,
    matchConcepto: null
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
            if (statusEl) statusEl.textContent = `${juegosCache.length} juego(s)`;
            $('#total-juegos-count').textContent = juegosCache.length;
            const jugados = data.filter(j => j.jugado).length;
            $('#total-jugados-count').textContent = jugados;
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

function getTipoIcon(tipo) {
    const map = { Quiz: 'quiz', Memory: 'memory', Match: 'link', Scramblee: 'abc' };
    return map[tipo] || 'quiz';
}

function renderGrid(juegos) {
    const contenedor = $('#juegos-disponibles');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (juegos.length === 0) {
        contenedor.innerHTML = '<div class="juegos-empty"><span class="material-symbols-outlined">sports_esports</span><p>No hay juegos disponibles en esta categoría.</p></div>';
        return;
    }

    juegos.forEach((juego, index) => {
        const tipo = juego.tipo || 'Quiz';
        const jugado = juego.jugado === true;
        const tarjeta = document.createElement('article');
        tarjeta.className = `juego-card${jugado ? ' jugado' : ''}`;
        tarjeta.style.animationDelay = `${index * 60}ms`;
        tarjeta.innerHTML = `
            <div class="juego-card-header">
                <span class="juego-cat">${juego.categoria_nombre || 'General'}</span>
                <span class="juego-tipo-badge">
                    <span class="material-symbols-outlined">${getTipoIcon(tipo)}</span>
                    ${tipo}
                </span>
                <span class="juego-pts">
                    <span class="material-symbols-outlined">star</span>
                    ${juego.puntos_recompensa || 10} pts
                </span>
            </div>
            <h3 class="juego-pregunta-texto juego-card-titulo">${juego.pregunta}</h3>
            <div class="juego-card-footer">
                ${jugado ? '<span class="jugado-badge"><span class="material-symbols-outlined">check_circle</span> Jugado</span>' : ''}
                <button class="btn-jugar" data-id="${juego.id}">
                    <span class="material-symbols-outlined">play_arrow</span>
                    Jugar
                </button>
            </div>
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

    fetch('/api/historial/registrar', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_contenido: 'juego', contenido_id: id })
    }).catch(() => {});

    state.indice = juegosCache.findIndex(j => j.id === id);
    mostrarModalJuego(juego);
}

function mostrarModalJuego(juego) {
    const modal = $('#modal-juego');
    if (!modal) return;

    const tipo = juego.tipo || 'Quiz';
    state.memoryEmparejados = 0;
    state.memoryTotal = 0;
    state.primeraCarta = null;
    state.segundaCarta = null;
    state.matchConectados = 0;
    state.matchTotal = 0;
    state.matchConcepto = null;

    $('#juego-modal-cat').textContent = juego.categoria_nombre || 'General';
    $('#juego-modal-pts').textContent = juego.puntos_recompensa || 10;
    $('#juego-modal-tipo').textContent = tipo;
    $('#juego-modal-tipo-icon').textContent = getTipoIcon(tipo);

    const opcionesEl = $('#juego-opciones');
    opcionesEl.innerHTML = '';

    if (tipo === 'Quiz') {
        $('#modal-pregunta').textContent = juego.pregunta;
        ['A', 'B', 'C'].forEach(letra => {
            const opcion = juego[`opcion_${letra.toLowerCase()}`];
            if (!opcion) return;
            const btn = document.createElement('button');
            btn.className = 'opcion-btn';
            btn.innerHTML = `<span>${letra})</span> ${opcion}`;
            btn.dataset.letra = letra;
            btn.addEventListener('click', () => responderTrivia(juego, letra, btn));
            opcionesEl.appendChild(btn);
        });
        $('#juego-opciones').style.display = '';
    } else if (tipo === 'Memory') {
        const palabras = (juego.pregunta || '').split(',').map(p => p.trim()).filter(Boolean);
        state.memoryTotal = palabras.length;
        $('#modal-pregunta').textContent = 'Encuentra todas las parejas';
        const cartas = [...palabras, ...palabras].sort(() => Math.random() - 0.5);
        const grid = document.createElement('div');
        grid.className = 'memory-grid';
        cartas.forEach((palabra, i) => {
            const carta = document.createElement('button');
            carta.className = 'memory-carta';
            carta.dataset.valor = palabra;
            carta.dataset.index = i;
            carta.innerHTML = `<span class="memory-front">?</span><span class="memory-back">${palabra}</span>`;
            carta.addEventListener('click', () => voltearMemory(carta, juego));
            grid.appendChild(carta);
        });
        opcionesEl.appendChild(grid);
        $('#juego-opciones').style.display = '';
    } else if (tipo === 'Match') {
        const conceptos = (juego.pregunta || '').split(',').map(p => p.trim()).filter(Boolean);
        const respuestas = (juego.opcion_a || '').split(',').map(r => r.trim()).filter(Boolean).sort(() => Math.random() - 0.5);
        state.matchTotal = conceptos.length;
        $('#modal-pregunta').textContent = 'Conecta cada concepto con su respuesta';
        const caja = document.createElement('div');
        caja.className = 'match-caja';
        const colTemas = document.createElement('div');
        colTemas.className = 'match-col';
        const colResps = document.createElement('div');
        colResps.className = 'match-col';
        conceptos.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'match-btn';
            btn.textContent = c;
            btn.dataset.tipo = 'concepto';
            btn.addEventListener('click', () => seleccionarMatch(btn, juego));
            colTemas.appendChild(btn);
        });
        respuestas.forEach(r => {
            const btn = document.createElement('button');
            btn.className = 'match-btn';
            btn.textContent = r;
            btn.dataset.tipo = 'respuesta';
            btn.dataset.valor = r;
            btn.addEventListener('click', () => seleccionarMatch(btn, juego));
            colResps.appendChild(btn);
        });
        caja.appendChild(colTemas);
        caja.appendChild(colResps);
        opcionesEl.appendChild(caja);
        $('#juego-opciones').style.display = '';
    } else if (tipo === 'Scramblee') {
        const pista = juego.pregunta || '';
        const palabra = (juego.opcion_a || '').toUpperCase().trim();
        const letras = palabra.split('').sort(() => Math.random() - 0.5);
        $('#modal-pregunta').textContent = pista;
        const scrambleDiv = document.createElement('div');
        scrambleDiv.className = 'scramblee-area';
        scrambleDiv.innerHTML = `
            <div class="scramblee-letras">${letras.map(l => `<span class="scramblee-letra">${l}</span>`).join('')}</div>
            <input type="text" class="scramblee-input" placeholder="Escribe la palabra ordenada..." autocomplete="off">
            <button class="opcion-btn" id="btn-validar-scramblee">Validar</button>
        `;
        opcionesEl.appendChild(scrambleDiv);
        $('#juego-opciones').style.display = '';
        setTimeout(() => scrambleDiv.querySelector('.scramblee-input').focus(), 100);
        scrambleDiv.querySelector('#btn-validar-scramblee').addEventListener('click', () => responderScramblee(juego));
        scrambleDiv.querySelector('.scramblee-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') responderScramblee(juego);
        });
    }

    $('#juego-playing').style.display = 'block';
    $('#juego-resultado').style.display = 'none';
    $('#resultado-correcta-wrap').style.display = 'none';
    modal.style.display = 'block';
}

// --- QUIZ ---
async function responderTrivia(juego, letra, btnElegido) {
    const correcta = juego.opcion_correcta || juego.correcta;
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

    mostrarResultado(juego, esCorrecta, puntosGanados);
}

// --- MEMORY ---
function voltearMemory(carta, juego) {
    if (carta.classList.contains('volteada') || carta.classList.contains('emparejada')) return;
    carta.classList.add('volteada');

    if (!state.primeraCarta) {
        state.primeraCarta = carta;
    } else if (!state.segundaCarta) {
        state.segundaCarta = carta;
        if (state.primeraCarta.dataset.valor === state.segundaCarta.dataset.valor) {
            state.primeraCarta.classList.add('emparejada');
            state.segundaCarta.classList.add('emparejada');
            state.memoryEmparejados++;
            state.primeraCarta = null;
            state.segundaCarta = null;
            if (state.memoryEmparejados >= state.memoryTotal) {
                completarJuego(juego);
            }
        } else {
            setTimeout(() => {
                state.primeraCarta.classList.remove('volteada');
                state.segundaCarta.classList.remove('volteada');
                state.primeraCarta = null;
                state.segundaCarta = null;
            }, 800);
        }
    }
}

// --- MATCH ---
function seleccionarMatch(btn, juego) {
    if (btn.classList.contains('conectado')) return;
    if (btn.dataset.tipo === 'concepto') {
        if (state.matchConcepto) state.matchConcepto.classList.remove('seleccionado');
        state.matchConcepto = btn;
        btn.classList.add('seleccionado');
    } else if (btn.dataset.tipo === 'respuesta' && state.matchConcepto) {
        btn.classList.add('seleccionado');
        state.matchConcepto.classList.remove('seleccionado');
        state.matchConcepto.classList.add('conectado');
        btn.classList.remove('seleccionado');
        btn.classList.add('conectado');
        state.matchConectados++;
        state.matchConcepto = null;
        if (state.matchConectados >= state.matchTotal) {
            completarJuego(juego);
        }
    }
}

// --- SCRAMBLEE ---
async function responderScramblee(juego) {
    const input = document.querySelector('.scramblee-input');
    if (!input) return;
    const palabra = input.value.trim();
    if (!palabra) return;

    const respuesta = { juego_id: juego.id, respuesta_usuario: palabra };
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
        esCorrecta = data.correcto === true;
        puntosGanados = (data.puntos_ganados || 0) || (esCorrecta ? (juego.puntos_recompensa || 10) : 0);
        if (esCorrecta && Number.isFinite(puntosGanados)) {
            state.puntosUsuario += puntosGanados;
        }
    } catch (err) {
        console.error('[juegos-page] Fallo en responderScramblee:', err);
    }

    mostrarResultado(juego, esCorrecta, puntosGanados);
}

// --- COMPLETAR ---
async function completarJuego(juego) {
    const respuesta = { juego_id: juego.id, respuesta_usuario: 'COMPLETADO' };
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
        esCorrecta = data.correcto === true;
        puntosGanados = (data.puntos_ganados || 0) || (juego.puntos_recompensa || 10);
        if (esCorrecta && Number.isFinite(puntosGanados)) {
            state.puntosUsuario += puntosGanados;
        }
    } catch (err) {
        console.error('[juegos-page] Fallo en completarJuego:', err);
    }

    mostrarResultado(juego, esCorrecta, puntosGanados);
}

// --- RESULTADO ---
function mostrarResultado(juego, esCorrecta, puntosGanados) {
    $('#juego-playing').style.display = 'none';
    $('#juego-resultado').style.display = 'block';

    $('#resultado-icon').innerHTML = esCorrecta
        ? '<span class="material-symbols-outlined" style="color:#28a745;font-size:3rem;">check_circle</span>'
        : '<span class="material-symbols-outlined" style="color:#dc3545;font-size:3rem;">cancel</span>';

    $('#resultado-titulo').textContent = esCorrecta ? '¡Correcto!' : 'Incorrecto';
    $('#resultado-mensaje').textContent = esCorrecta
        ? 'Muy bien, ganaste puntos.'
        : 'Sigue intentando, la próxima será.';

    if (esCorrecta) {
        $('#resultado-puntos').style.display = 'block';
        $('#resultado-pts-num').textContent = puntosGanados;
        $('#resultado-correcta-wrap').style.display = 'none';
    } else {
        $('#resultado-puntos').style.display = 'none';
        const tipo = juego.tipo || 'Quiz';
        if (tipo === 'Quiz') {
            const correcta = juego.opcion_correcta || juego.correcta || '';
            const map = { A: juego.opcion_a, B: juego.opcion_b, C: juego.opcion_c };
            $('#resultado-correcta-texto').textContent = map[correcta] ? `${correcta}) ${map[correcta]}` : '';
            $('#resultado-correcta-wrap').style.display = '';
        } else if (tipo === 'Scramblee') {
            const palabraCorrecta = juego.opcion_a || '';
            $('#resultado-correcta-texto').textContent = `La palabra era: ${palabraCorrecta.toUpperCase()}`;
            $('#resultado-correcta-wrap').style.display = '';
        } else {
            $('#resultado-correcta-wrap').style.display = 'none';
        }
    }

    if (esCorrecta && moduloId && nivelId) {
        fetch(`/api/modulos/${moduloId}/niveles/${nivelId}/completar`, {
            method: 'POST', credentials: 'include'
        }).catch(() => {});
        $('#btn-cerrar-resultado').textContent = 'Volver al módulo';
        $('#btn-cerrar-resultado').onclick = () => { window.location.href = '/modulos/' + moduloId; };
        $('#btn-siguiente-juego').style.display = 'none';
    } else {
        $('#btn-cerrar-resultado').onclick = cerrarModal;
        $('#btn-siguiente-juego').style.display = '';
    }

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
    cargarDatosJuegos().then(() => {
        if (juegoIdUrl && moduloId && nivelId) {
            const encontrado = juegosCache.find(j => j.id == juegoIdUrl);
            if (encontrado) {
                abrirJuego(encontrado.id);
            } else {
                fetch(`/api/juegos/${juegoIdUrl}`).then(r => r.json()).then(j => {
                    juegosCache.push(j);
                    abrirJuego(j.id);
                }).catch(() => {});
            }
        }
    });

    $('#juego-close-btn')?.addEventListener('click', cerrarModal);
    $('#btn-siguiente-juego')?.addEventListener('click', siguienteTrivia);
});
