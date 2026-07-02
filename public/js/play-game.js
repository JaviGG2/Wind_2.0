const params = new URLSearchParams(window.location.search);
const juegoId = params.get('id');
const moduloId = params.get('modulo');
const nivelId = params.get('nivel');

const state = {
    memoryEmparejados: 0,
    memoryTotal: 0,
    primeraCarta: null,
    segundaCarta: null,
    matchConectados: 0,
    matchTotal: 0,
    matchConcepto: null
};

function $(sel) { return document.querySelector(sel); }

if (!juegoId) {
    $('#bloque-carga').innerHTML = '<p>No se especificó un juego.</p>';
} else {
    fetch(`/api/juegos/${juegoId}`, { credentials: 'include' })
        .then(r => { if (!r.ok) throw new Error('Juego no encontrado'); return r.json(); })
        .then(juego => {
            const carga = $('#bloque-carga');
            const contenido = $('#play-contenido');
            if (carga) carga.style.display = 'none';
            if (contenido) contenido.style.display = 'block';

            fetch('/auth/perfil', { credentials: 'include' })
                .then(r => r.ok ? r.json() : null)
                .then(perfil => {
                    if (perfil) {
                        $('#play-puntos-num').textContent = perfil.puntos || 0;
                    }
                }).catch(() => {});

            mostrarJuego(juego);
        })
        .catch(err => {
            $('#bloque-carga').innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
        });
}

function mostrarJuego(juego) {
    const tipo = juego.tipo || 'Quiz';
    state.memoryEmparejados = 0;
    state.memoryTotal = 0;
    state.primeraCarta = null;
    state.segundaCarta = null;
    state.matchConectados = 0;
    state.matchTotal = 0;
    state.matchConcepto = null;

    $('#play-cat').textContent = juego.categoria_nombre || 'General';
    $('#play-pts-val').textContent = juego.puntos_recompensa || 10;
    $('#play-tipo-label').textContent = tipo;
    $('#play-tipo-icon').textContent = getTipoIcon(tipo);
    $('#play-titulo').textContent = juego.titulo || '';

    const opcionesEl = $('#play-opciones');
    opcionesEl.innerHTML = '';

    if (tipo === 'Quiz') {
        $('#play-pregunta').textContent = juego.pregunta;
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
    } else if (tipo === 'Memory') {
        const palabras = (juego.pregunta || '').split(',').map(p => p.trim()).filter(Boolean);
        state.memoryTotal = palabras.length;
        $('#play-pregunta').textContent = 'Encuentra todas las parejas';
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
    } else if (tipo === 'Match') {
        const conceptos = (juego.pregunta || '').split(',').map(p => p.trim()).filter(Boolean);
        const respuestas = (juego.opcion_a || '').split(',').map((r, i) => ({ texto: r.trim(), idx: i })).filter(r => r.texto).sort(() => Math.random() - 0.5);
        state.matchTotal = conceptos.length;
        $('#play-pregunta').textContent = 'Conecta cada concepto con su respuesta';
        const caja = document.createElement('div');
        caja.className = 'match-caja';
        const colTemas = document.createElement('div');
        colTemas.className = 'match-col';
        const colResps = document.createElement('div');
        colResps.className = 'match-col';
        conceptos.forEach((c, i) => {
            const btn = document.createElement('button');
            btn.className = 'match-btn';
            btn.textContent = c;
            btn.dataset.tipo = 'concepto';
            btn.dataset.pos = i;
            btn.addEventListener('click', () => seleccionarMatch(btn, juego));
            colTemas.appendChild(btn);
        });
        respuestas.forEach(r => {
            const btn = document.createElement('button');
            btn.className = 'match-btn';
            btn.textContent = r.texto;
            btn.dataset.tipo = 'respuesta';
            btn.dataset.idx = r.idx;
            btn.addEventListener('click', () => seleccionarMatch(btn, juego));
            colResps.appendChild(btn);
        });
        caja.appendChild(colTemas);
        caja.appendChild(colResps);
        opcionesEl.appendChild(caja);
    } else if (tipo === 'Scramblee') {
        const pista = juego.pregunta || '';
        const palabraCorrecta = (juego.opcion_a || '').toUpperCase().trim();
        const letras = palabraCorrecta.split('').sort(() => Math.random() - 0.5);
        $('#play-pregunta').textContent = pista;
        const scrambleDiv = document.createElement('div');
        scrambleDiv.className = 'scramblee-area';
        scrambleDiv.innerHTML = `
            <div class="scramblee-letras">${letras.map(l => `<span class="scramblee-letra">${l}</span>`).join('')}</div>
            <input type="text" class="scramblee-input" placeholder="Escribe la palabra ordenada..." autocomplete="off">
            <button class="opcion-btn" id="btn-validar-scramblee">Validar</button>
        `;
        opcionesEl.appendChild(scrambleDiv);
        setTimeout(() => scrambleDiv.querySelector('.scramblee-input').focus(), 100);
        scrambleDiv.querySelector('#btn-validar-scramblee').addEventListener('click', () => responderScramblee(juego));
        scrambleDiv.querySelector('.scramblee-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') responderScramblee(juego);
        });
    }

    $('#play-playing').style.display = 'block';
    $('#play-resultado').style.display = 'none';
}

function getTipoIcon(tipo) {
    const map = { Quiz: 'quiz', Memory: 'memory', Match: 'link', Scramblee: 'abc' };
    return map[tipo] || 'quiz';
}

async function completarNivelModulo() {
    if (moduloId && nivelId) {
        try {
            await fetch(`/api/modulos/${moduloId}/niveles/${nivelId}/completar`, {
                method: 'POST', credentials: 'include'
            });
        } catch (err) {
            console.error('[play-game] Fallo al completar nivel:', err);
        }
    }
}

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
        puntosGanados = data.puntos_ganados ?? (esCorrecta ? (juego.puntos_recompensa || 10) : 0);
    } catch (err) {
        console.error('[play-game] Fallo en responderTrivia:', err);
    }

    const todosLosBotones = $('#play-opciones').querySelectorAll('.opcion-btn');
    todosLosBotones.forEach(btn => {
        btn.style.pointerEvents = 'none';
        const letraBtn = btn.dataset.letra;
        if (letraBtn === correcta) {
            btn.classList.add('correcta');
        } else if (letraBtn === letra && !esCorrecta) {
            btn.classList.add('incorrecta');
        }
    });

    if (esCorrecta) await completarNivelModulo();
    mostrarResultado(juego, esCorrecta, puntosGanados);
}

function voltearMemory(carta, juego) {
    if (carta.classList.contains('volteada') || carta.classList.contains('emparejada')) return;
    if (state.primeraCarta && state.segundaCarta) return;
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

function seleccionarMatch(btn, juego) {
    if (btn.classList.contains('conectado')) return;
    if (btn.dataset.tipo === 'concepto') {
        if (state.matchConcepto) state.matchConcepto.classList.remove('seleccionado');
        state.matchConcepto = btn;
        btn.classList.add('seleccionado');
    } else if (btn.dataset.tipo === 'respuesta' && state.matchConcepto) {
        const conceptoBtn = state.matchConcepto;
        if (conceptoBtn.dataset.pos === btn.dataset.idx) {
            conceptoBtn.classList.remove('seleccionado');
            conceptoBtn.classList.add('conectado');
            btn.classList.add('conectado');
            state.matchConectados++;
            state.matchConcepto = null;
            if (state.matchConectados >= state.matchTotal) {
                completarJuego(juego);
            }
        } else {
            btn.classList.add('incorrecto');
            conceptoBtn.classList.add('incorrecto');
            setTimeout(() => {
                btn.classList.remove('incorrecto', 'seleccionado');
                conceptoBtn.classList.remove('incorrecto', 'seleccionado');
                state.matchConcepto = null;
            }, 500);
        }
    }
}

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
        puntosGanados = data.puntos_ganados ?? (esCorrecta ? (juego.puntos_recompensa || 10) : 0);
    } catch (err) {
        console.error('[play-game] Fallo en responderScramblee:', err);
    }

    if (esCorrecta) await completarNivelModulo();
    mostrarResultado(juego, esCorrecta, puntosGanados);
}

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
        puntosGanados = data.puntos_ganados ?? (juego.puntos_recompensa || 10);
    } catch (err) {
        console.error('[play-game] Fallo en completarJuego:', err);
    }

    if (esCorrecta) await completarNivelModulo();
    mostrarResultado(juego, esCorrecta, puntosGanados);
}

function mostrarResultado(juego, esCorrecta, puntosGanados) {
    $('#play-playing').style.display = 'none';
    $('#play-resultado').style.display = 'block';

    $('#resultado-icon').innerHTML = esCorrecta
        ? '<span class="material-symbols-outlined" style="color:#28a745;font-size:3rem;">check_circle</span>'
        : '<span class="material-symbols-outlined" style="color:#dc3545;font-size:3rem;">cancel</span>';

    $('#resultado-titulo').textContent = esCorrecta ? '¡Correcto!' : 'Incorrecto';
    $('#resultado-mensaje').textContent = esCorrecta
        ? 'Muy bien, ganaste puntos.'
        : 'Sigue intentando, la próxima será.';

    if (esCorrecta) {
        $('#resultado-puntos').style.display = 'flex';
        $('#resultado-pts-num').textContent = puntosGanados;
        $('#resultado-correcta-wrap').style.display = 'none';
        const ptsEl = $('#play-puntos-num');
        if (ptsEl) ptsEl.textContent = parseInt(ptsEl.textContent) + puntosGanados;
    } else {
        $('#resultado-puntos').style.display = 'none';
        const tipo = juego.tipo || 'Quiz';
        if (tipo === 'Quiz') {
            const correcta = juego.opcion_correcta || juego.correcta || '';
            const map = { A: juego.opcion_a, B: juego.opcion_b, C: juego.opcion_c };
            $('#resultado-correcta-texto').textContent = map[correcta] ? `${correcta}) ${map[correcta]}` : '';
            $('#resultado-correcta-wrap').style.display = 'block';
        } else if (tipo === 'Scramblee') {
            const palabraCorrecta = juego.opcion_a || '';
            $('#resultado-correcta-texto').textContent = `La palabra era: ${palabraCorrecta.toUpperCase()}`;
            $('#resultado-correcta-wrap').style.display = 'block';
        } else {
            $('#resultado-correcta-wrap').style.display = 'none';
        }
    }

    if (moduloId && esCorrecta) {
        const btnSig = $('#btn-siguiente-nivel');
        if (btnSig) {
            btnSig.style.display = 'inline-flex';
            btnSig.onclick = () => { window.location.href = `/modulos/${moduloId}`; };
        }
        setTimeout(() => { window.location.href = `/modulos/${moduloId}`; }, 3000);
    }
}