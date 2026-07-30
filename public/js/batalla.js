const TIEMPO_PREGUNTA = 15;
let batallaId = null;
let preguntas = [];
let indiceActual = 0;
let respuestas = [];
let timerInterval = null;
let tiempoRestante = TIEMPO_PREGUNTA;
let tiempoAcumulado = 0;
let participantes = [];
let respondiendo = false;

function obtenerId() {
    const p = new URLSearchParams(window.location.search);
    return p.get('id');
}

document.addEventListener('DOMContentLoaded', async () => {
    batallaId = obtenerId();
    if (!batallaId) {
        document.getElementById('batalla-preguntas').style.display = 'block';
        document.getElementById('batalla-card').innerHTML = '<p>ID de batalla no válido.</p>';
        return;
    }

    try {
        const res = await fetch(`/api/batallas/${batallaId}`, { credentials: 'include' });
        if (!res.ok) { window.location.href = '/login'; return; }
        const data = await res.json();

        if (data.completado) {
            mostrarCompletado(data.participante);
            return;
        }

        preguntas = data.preguntas || [];
        participantes = data.participantes || [];

        if (!preguntas.length) {
            document.getElementById('batalla-card').innerHTML = '<p>Error al cargar preguntas.</p>';
            document.getElementById('batalla-preguntas').style.display = 'block';
            return;
        }

        document.getElementById('batalla-preguntas').style.display = 'block';
        renderParticipantesStatus();
        mostrarPregunta(0);
    } catch {
        document.getElementById('batalla-card').innerHTML = '<p>Error de conexión.</p>';
        document.getElementById('batalla-preguntas').style.display = 'block';
    }
});

function renderParticipantesStatus() {
    const lista = document.getElementById('batalla-status-lista');
    if (!lista || !participantes.length) return;
    const espera = document.getElementById('batalla-espera');
    if (espera) espera.style.display = 'none';

    participantes.forEach(p => {
        const div = document.createElement('div');
        div.className = 'batalla-status-item';
        div.innerHTML = `
            <img src="${p.imagen_perfil || '/img/avatar.svg'}" alt="" class="batalla-status-avatar" style="background-color:${p.avatar_fondo || '#e8e8e8'}">
            <span class="batalla-status-nombre">${p.nombre || p.username}</span>
            <span class="batalla-status-indicator ${p.completado ? 'completado' : 'pendiente'}">${p.completado ? 'Listo' : 'Esperando...'}</span>
        `;
        lista.appendChild(div);
    });
}

function mostrarPregunta(idx) {
    if (idx >= preguntas.length) {
        document.getElementById('batalla-finalizar').style.display = 'block';
        return;
    }

    respondiendo = true;
    indiceActual = idx;
    const p = preguntas[idx];
    document.getElementById('batalla-qnum').textContent = `Pregunta ${idx + 1}`;
    document.getElementById('batalla-pregunta').textContent = p.pregunta;
    document.getElementById('batalla-progress-text').textContent = `${idx + 1} / ${preguntas.length}`;
    document.getElementById('batalla-progress-fill').style.width = `${(idx / preguntas.length) * 100}%`;

    const opcionesDiv = document.getElementById('batalla-opciones');
    opcionesDiv.innerHTML = '';

    try {
        const opts = typeof p.opciones === 'string' ? JSON.parse(p.opciones) : p.opciones;
        opts.forEach((opt, i) => {
            const letra = String.fromCharCode(65 + i);
            const btn = document.createElement('button');
            btn.className = 'batalla-opcion';
            btn.dataset.valor = letra;
            btn.dataset.correcta = p.respuesta_correcta;
            btn.innerHTML = `<span class="batalla-opcion-letra">${letra}</span><span class="batalla-opcion-texto">${opt}</span>`;
            btn.addEventListener('click', () => seleccionarOpcion(btn, letra, p.respuesta_correcta));
            opcionesDiv.appendChild(btn);
        });
    } catch {
        opcionesDiv.innerHTML = '<p>Error al cargar opciones.</p>';
    }

    tiempoRestante = TIEMPO_PREGUNTA;
    document.getElementById('batalla-timer-num').textContent = `${TIEMPO_PREGUNTA}s`;
    document.getElementById('batalla-timer').className = 'batalla-timer';

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        tiempoRestante--;
        document.getElementById('batalla-timer-num').textContent = `${tiempoRestante}s`;
        if (tiempoRestante <= 3) {
            document.getElementById('batalla-timer').classList.add('timer-warning');
        }
        if (tiempoRestante <= 0) {
            clearInterval(timerInterval);
            tiempoAcumulado += TIEMPO_PREGUNTA;
            respuestas.push({ pregunta_id: p.id, respuesta: '', tiempo_segundos: TIEMPO_PREGUNTA });
            setTimeout(() => mostrarPregunta(indiceActual + 1), 500);
        }
    }, 1000);
}

function seleccionarOpcion(btn, letra, correcta) {
    if (!respondiendo) return;
    respondiendo = false;
    if (timerInterval) clearInterval(timerInterval);
    tiempoAcumulado += TIEMPO_PREGUNTA - tiempoRestante;

    respuestas.push({ pregunta_id: preguntas[indiceActual].id, respuesta: letra, tiempo_segundos: TIEMPO_PREGUNTA - tiempoRestante });

    document.querySelectorAll('.batalla-opcion').forEach(b => {
        b.style.pointerEvents = 'none';
        const esCorrecta = b.dataset.correcta === b.dataset.valor;
        if (esCorrecta) b.classList.add('correcta');
    });

    if (letra === correcta) {
        btn.classList.add('correcta');
    } else {
        btn.classList.add('incorrecta');
    }

    setTimeout(() => mostrarPregunta(indiceActual + 1), 1500);
}

document.getElementById('batalla-finalizar')?.addEventListener('click', async () => {
    if (timerInterval) clearInterval(timerInterval);

    const btn = document.getElementById('batalla-finalizar');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const res = await fetch(`/api/batallas/${batallaId}/responder`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ respuestas })
        });
        const data = await res.json();
        if (res.ok) {
            mostrarCompletado({ aciertos: data.aciertos, total_preguntas: preguntas.length, tiempo_total_segundos: data.tiempoTotal, puntos_ganados: data.puntos_ganados });
        } else {
            alert(data.mensaje || 'Error al enviar.');
            btn.disabled = false;
            btn.textContent = 'Finalizar batalla';
        }
    } catch {
        alert('Error de conexión.');
        btn.disabled = false;
        btn.textContent = 'Finalizar batalla';
    }
});

function mostrarCompletado(participante) {
    document.getElementById('batalla-espera').style.display = 'none';
    document.getElementById('batalla-preguntas').style.display = 'none';
    document.getElementById('batalla-completado').style.display = 'block';
    const p = participante;
    document.getElementById('batalla-completado-texto').innerHTML =
        `Acertaste <strong>${p.aciertos}</strong> de ${p.total_preguntas} preguntas en ${p.tiempo_total_segundos}s.<br>` +
        `<span style="font-size:24px;color:#16a34a;font-weight:800;">+${p.puntos_ganados} puntos</span>`;
}