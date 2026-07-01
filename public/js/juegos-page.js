const urlParams = new URLSearchParams(window.location.search);
const juegoIdUrl = urlParams.get('juego');
if (juegoIdUrl) {
    const moduloId = urlParams.get('modulo');
    const nivelId = urlParams.get('nivel');
    let destino = `/play-game?id=${juegoIdUrl}`;
    if (moduloId) destino += `&modulo=${moduloId}`;
    if (nivelId) destino += `&nivel=${nivelId}`;
    window.location.replace(destino);
}

const juegosCache = [];
const state = {
    filtro: '',
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

    const tipoLabels = { Quiz: 'Trivia', Memory: 'Memoria', Match: 'Relacionar', Scramblee: 'Ordenar' };
    const tipoDesc = {
        Quiz: 'Responde correctamente las preguntas',
        Memory: 'Encuentra todas las parejas',
        Match: 'Conecta conceptos con sus respuestas',
        Scramblee: 'Ordena las letras para formar la palabra'
    };
    const tipoColors = { Quiz: '#3b82f6', Memory: '#10b981', Match: '#8b5cf6', Scramblee: '#f59e0b' };

    juegos.forEach((juego, index) => {
        const tipo = juego.tipo || 'Quiz';
        const color = tipoColors[tipo] || '#FF4500';
        const jugado = juego.jugado === true;
        const tarjeta = document.createElement('article');
        tarjeta.className = `juego-card${jugado ? ' jugado' : ''}`;
        tarjeta.style.animationDelay = `${index * 60}ms`;
        tarjeta.innerHTML = `
            <div class="juego-card-banner" style="background:${color}">
                <span class="material-symbols-outlined">${getTipoIcon(tipo)}</span>
                <span class="juego-banner-tipo">${tipoLabels[tipo] || tipo}</span>
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
                <a href="/play-game?id=${juego.id}" class="btn-jugar">
                    <span class="material-symbols-outlined">play_arrow</span>
                    Jugar
                </a>
            </div>
        `;
        contenedor.appendChild(tarjeta);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    cargarDatosJuegos();

    window.addEventListener('category-change', (e) => {
        state.filtro = e.detail.categoria_nombre;
        aplicarFiltro(e.detail.categoria_nombre);
    });
});
