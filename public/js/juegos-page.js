const urlParams = new URLSearchParams(window.location.search);
const juegoIdUrl = urlParams.get('id') || urlParams.get('juego');
if (juegoIdUrl) {
    const moduloId = urlParams.get('modulo');
    const nivelId = urlParams.get('nivel');
    let destino = `/play-game?id=${juegoIdUrl}`;
    if (moduloId) destino += `&modulo=${moduloId}`;
    if (nivelId) destino += `&nivel=${nivelId}`;
    window.location.replace(destino);
}

const juegosCache = [];
const state = { puntosUsuario: 0 };

function $(sel) { return document.querySelector(sel); }

const TIPO_INFO = {
    Quiz: { icon: 'quiz', label: 'Trivia', desc: 'Responde correctamente las preguntas', color: '#3b82f6' },
    Memory: { icon: 'memory', label: 'Memoria', desc: 'Encuentra todas las parejas', color: '#10b981' },
    Match: { icon: 'link', label: 'Relacionar', desc: 'Conecta conceptos con sus respuestas', color: '#8b5cf6' },
    Scramblee: { icon: 'abc', label: 'Ordenar', desc: 'Ordena las letras para formar la palabra', color: '#f59e0b' }
};

async function cargarDatosJuegos() {
    const statusEl = $('#juegos-status');
    if (statusEl) statusEl.innerHTML = '<img src="/images/loading.svg" class="anim-loading" alt="Cargando...">';

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
        }

        if (perfilRes.ok) {
            const perfil = await perfilRes.json();
            state.puntosUsuario = (perfil.puntos || 0);
            $('#mis-puntos-count').textContent = state.puntosUsuario;
        }

        await new Promise(r => setTimeout(r, 1000));
        renderGrupos(juegosCache);
    } catch (err) {
        if (statusEl) statusEl.textContent = 'Error al cargar';
        console.error('[juegos-page] Error cargando datos:', err);
    }
}

function agruparPorTipo(juegos) {
    const orden = ['Quiz', 'Memory', 'Match', 'Scramblee'];
    const grupos = {};
    juegos.forEach(j => {
        const t = j.tipo || 'Quiz';
        if (!grupos[t]) grupos[t] = [];
        grupos[t].push(j);
    });
    const resultado = [];
    orden.forEach(t => {
        if (grupos[t] && grupos[t].length > 0) {
            resultado.push({ tipo: t, juegos: grupos[t] });
        }
    });
    Object.keys(grupos).forEach(t => {
        if (!orden.includes(t)) {
            resultado.push({ tipo: t, juegos: grupos[t] });
        }
    });
    return resultado;
}

function crearCard(juego, index) {
    const tipo = juego.tipo || 'Quiz';
    const info = TIPO_INFO[tipo] || { icon: 'quiz', label: tipo, color: '#FF4500' };
    const jugado = juego.jugado === true;
    const tarjeta = document.createElement('article');
    tarjeta.className = `juego-card${jugado ? ' jugado' : ''}`;
    tarjeta.style.animationDelay = `${index * 60}ms`;
    tarjeta.innerHTML = `
        <div class="juego-card-banner" style="background:${info.color}">
            <span class="material-symbols-outlined">${info.icon}</span>
            <span class="juego-banner-tipo">${info.label}</span>
        </div>
        <div class="juego-card-body">
            <div class="juego-card-meta">
                <span class="juego-cat">${juego.categoria_nombre || 'General'}</span>
                <span class="juego-pts">
                    <span class="material-symbols-outlined">star</span>
                    ${juego.puntos_recompensa || 10} pts
                </span>
            </div>
            <h3 class="juego-card-titulo">${juego.titulo || juego.pregunta}</h3>
        </div>
        <div class="juego-card-footer">
            ${jugado ? '<span class="jugado-badge"><span class="material-symbols-outlined">check_circle</span> Jugado</span>' : ''}
            <div class="juego-card-actions">
                <button type="button" class="btn-valoracion" data-id="${juego.id}">
                    <span class="material-symbols-outlined btn-val-icon${(juego.mi_puntuacion || 0) > 0 ? ' rated' : ''}">${(juego.mi_puntuacion || 0) > 0 ? 'star' : 'star_outline'}</span>
                    <span class="btn-val-promedio">${(juego.promedio_valoracion || 0) > 0 ? Number(juego.promedio_valoracion).toFixed(1) : '—'}</span>
                    <span class="btn-val-count">(${juego.likes || 0})</span>
                </button>
                <a href="/play-game?id=${juego.id}" class="btn-jugar">
                    <span class="material-symbols-outlined">play_arrow</span>
                    Jugar
                </a>
            </div>
        </div>
    `;

    const btnVal = tarjeta.querySelector('.btn-valoracion');
    let miPunt = juego.mi_puntuacion || 0;
    btnVal.addEventListener('click', (ev) => {
        ev.stopPropagation();
        abrirPopupValoracion(juego.id, 'juegos', miPunt, async (val) => {
            try {
                const res = await fetch(`/api/juegos/${juego.id}/like`, {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ puntuacion: val })
                });
                if (res.ok) {
                    const data = await res.json();
                    miPunt = data.mi_puntuacion;
                    const icon = btnVal.querySelector('.btn-val-icon');
                    icon.textContent = miPunt > 0 ? 'star' : 'star_outline';
                    icon.classList.toggle('rated', miPunt > 0);
                    btnVal.querySelector('.btn-val-promedio').textContent = (data.promedio || 0).toFixed(1);
                    btnVal.querySelector('.btn-val-count').textContent = `(${data.likes})`;
                } else if (res.status === 401) {
                    window.location.href = '/login.html';
                }
            } catch (e) {
                console.error('Error al valorar:', e);
            }
        });
    });

    return tarjeta;
}

function renderGrupos(juegos) {
    const contenedor = $('#juegos-grupos');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (juegos.length === 0) {
        contenedor.innerHTML = '<div class="juegos-empty"><span class="material-symbols-outlined">sports_esports</span><p>No hay juegos disponibles.</p></div>';
        return;
    }

    const grupos = agruparPorTipo(juegos);

    grupos.forEach(grupo => {
        const info = TIPO_INFO[grupo.tipo] || { icon: 'quiz', label: grupo.tipo, desc: '', color: '#FF4500' };
        const section = document.createElement('section');
        section.className = 'juego-grupo';

        section.innerHTML = `
            <div class="juego-grupo-header">
                <div class="juego-grupo-titulo-row">
                    <span class="juego-grupo-icon" style="background:${info.color}">
                        <span class="material-symbols-outlined">${info.icon}</span>
                    </span>
                    <div>
                        <h3 class="juego-grupo-nombre">${info.label}</h3>
                        <p class="juego-grupo-desc">${info.desc}</p>
                    </div>
                </div>
                <span class="juego-grupo-count">${grupo.juegos.length}</span>
            </div>
            <div class="juego-grupo-scroll"></div>
        `;

        const scrollContainer = section.querySelector('.juego-grupo-scroll');
        grupo.juegos.forEach((juego, i) => {
            scrollContainer.appendChild(crearCard(juego, i));
        });

        contenedor.appendChild(section);

        initGrupoScrollHint(section, scrollContainer);
    });
}

function initGrupoScrollHint(section, scrollContainer) {
    scrollContainer.addEventListener('scroll', () => {
        if (scrollContainer.scrollLeft > 10) {
            section.classList.add('scrolled');
        } else {
            section.classList.remove('scrolled');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    cargarDatosJuegos();
});