function crearElemento(tag, clase, texto) {
    const el = document.createElement(tag);
    if (clase) el.className = clase;
    if (texto) el.textContent = texto;
    return el;
}

function getIconForType(tipo) {
    switch (tipo) {
        case 'tema': return 'topic';
        case 'relato': return 'auto_stories';
        case 'juego': return 'stadia_controller';
        default: return 'article';
    }
}

function getTypeLabel(tipo) {
    switch (tipo) {
        case 'tema': return 'Tema';
        case 'relato': return 'Relato';
        case 'juego': return 'Juego';
        default: return 'Contenido';
    }
}

function crearResultItem(resultado) {
    const link = document.createElement('a');
    link.href = resultado.url;
    link.className = 'search-result-item';

    const thumb = crearElemento('div', 'search-result-thumb');
    if (resultado.imagen) {
        const img = document.createElement('img');
        img.src = resultado.imagen;
        img.alt = '';
        thumb.appendChild(img);
    } else {
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined';
        icon.textContent = getIconForType(resultado.tipo);
        thumb.appendChild(icon);
    }

    const info = crearElemento('div', 'search-result-info');
    const title = crearElemento('span', 'search-result-title', resultado.titulo);
    const type = crearElemento('span', 'search-result-type', getTypeLabel(resultado.tipo));

    info.appendChild(title);
    info.appendChild(type);
    link.appendChild(thumb);
    link.appendChild(info);

    return link;
}

async function buscarEnWind(termino) {
    if (!termino || termino.length < 2) {
        return { temas: [], relatos: [], juegos: [] };
    }

    const respuesta = await fetch(`/api/buscar?q=${encodeURIComponent(termino)}`);
    if (!respuesta.ok) {
        throw new Error('Error al consultar el servidor.');
    }
    return respuesta.json();
}

function crearSeccionResultados(titulo, items, iconName) {
    const section = crearElemento('section', 'search-section');
    section.dataset.tipo = titulo.toLowerCase();

    if (items.length === 0) return null;

    const header = crearElemento('h3', 'search-section-title');
    header.innerHTML = `<span class="material-symbols-outlined">${iconName}</span> ${titulo}`;
    section.appendChild(header);

    const list = crearElemento('div', 'search-result-list');
    items.forEach(item => list.appendChild(crearResultItem(item)));
    section.appendChild(list);

    return section;
}

let currentFilter = 'all';

function applyFilter(filter) {
    currentFilter = filter;
    const sections = document.querySelectorAll('#search-results .search-section');
    sections.forEach(section => {
        const tipo = section.dataset.tipo;
        section.style.display = (filter === 'all' || tipo === filter) ? '' : 'none';
    });
}

function setCapsuleExpanded(capsule, expanded) {
    if (!capsule) return;
    capsule.classList.toggle('wind-search-capsule--expanded', expanded);
    requestAnimationFrame(syncSearchSpacer);
}

function syncSearchSpacer() {
    const placeholder = document.getElementById('buscar-placeholder');
    const shell = placeholder?.querySelector('.wind-search-shell');
    if (!placeholder || !shell) return;

    if (document.body.classList.contains('search-page-body')) {
        placeholder.style.minHeight = '';
        placeholder.style.marginBottom = '';
        return;
    }

    const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--search-float-gap'), 10) || 20;
    const height = shell.getBoundingClientRect().height;
    placeholder.style.minHeight = `${height + gap}px`;
    placeholder.style.marginBottom = `${gap}px`;
}

function observeSearchShell() {
    const shell = document.querySelector('.wind-search-shell');
    if (!shell || document.body.classList.contains('search-page-body')) return;

    syncSearchSpacer();

    if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => syncSearchSpacer());
        observer.observe(shell);
    }

    window.addEventListener('resize', syncSearchSpacer, { passive: true });
}

function getSearchWidgetHTML() {
    return `
        <div class="wind-search-shell">
            <div class="wind-search-capsule" id="wind-search-capsule">
                <form class="wind-search-form" id="search-form">
                    <div class="wind-search-input-row">
                        <span class="material-symbols-outlined wind-search-icon">search</span>
                        <input
                            id="search-input"
                            class="wind-search-input"
                            type="search"
                            placeholder="Buscar temas, relatos, juegos..."
                            autocomplete="off"
                            aria-label="Buscar en Wind"
                        />
                        <button type="button" class="wind-search-clear" id="search-clear" aria-label="Limpiar búsqueda">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </form>

                <div class="wind-search-body" id="wind-search-body">
                    <div class="search-filters" id="search-filters" style="display:none;">
                        <div class="filtros-header">
                            <h3 class="filtros-titulo">Resultados</h3>
                            <span class="search-total" id="search-total">0 resultados</span>
                        </div>
                        <div class="filtros-chips">
                            <button type="button" class="chip active" data-filter="all">Todos</button>
                            <button type="button" class="chip" data-filter="temas">Temas</button>
                            <button type="button" class="chip" data-filter="relatos">Relatos</button>
                            <button type="button" class="chip" data-filter="juegos">Juegos</button>
                        </div>
                    </div>

                    <div class="search-results" id="search-results">
                        <div class="search-instruction">
                            <p>Escribe al menos 2 caracteres para buscar.</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="wind-search-categorias">
                <button type="button" class="cat-chip active" data-cat="todo">Todo</button>
                <div class="cat-select-wrapper">
                    <button type="button" class="cat-select-trigger" id="cat-select-trigger">
                        <span class="cat-select-value" id="cat-select-value">Categoría</span>
                        <svg class="cat-select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M11 5H5l3 3.5z"/>
                        </svg>
                    </button>
                    <div class="cat-select-popup anim-fade-in" id="cat-select-popup">
                        <div class="cat-select-list" id="cat-select-list"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderResultados(data, contenedor, capsule) {
    contenedor.innerHTML = '';

    const total = data.temas.length + data.relatos.length + data.juegos.length;
    const filterBar = document.getElementById('search-filters');
    const totalSpan = document.getElementById('search-total');

    currentFilter = 'all';
    document.querySelectorAll('.chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.filter === 'all');
    });

    if (total === 0) {
        filterBar.style.display = 'none';
        const empty = crearElemento('div', 'search-no-results');
        empty.innerHTML = '<p>No se encontraron resultados para esta búsqueda.</p>';
        contenedor.appendChild(empty);
        setCapsuleExpanded(capsule, true);
        return;
    }

    filterBar.style.display = 'block';
    totalSpan.textContent = `${total} resultado${total !== 1 ? 's' : ''}`;

    const temas = crearSeccionResultados('Temas', data.temas || [], 'topic');
    const relatos = crearSeccionResultados('Relatos', data.relatos || [], 'auto_stories');
    const juegos = crearSeccionResultados('Juegos', data.juegos || [], 'stadia_controller');

    [temas, relatos, juegos].filter(Boolean).forEach(section => contenedor.appendChild(section));
    setCapsuleExpanded(capsule, true);
}

function resetSearchUI(resultContainer, filterBar, capsule) {
    resultContainer.innerHTML = `
        <div class="search-instruction">
            <p>Escribe al menos 2 caracteres para buscar.</p>
        </div>`;
    filterBar.style.display = 'none';
    setCapsuleExpanded(capsule, false);
}

function crearBuscador() {
    const form = document.getElementById('search-form');
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');
    const resultContainer = document.getElementById('search-results');
    const filterBar = document.getElementById('search-filters');
    const capsule = document.getElementById('wind-search-capsule');

    if (!form || !input || !resultContainer) return;

    let ultimaConsulta = '';
    let debounceTimer = null;

    const ejecutarBusqueda = async (consulta) => {
        if (consulta.length < 2) {
            resetSearchUI(resultContainer, filterBar, capsule);
            return;
        }

        setCapsuleExpanded(capsule, true);
        resultContainer.innerHTML = '<img src="/images/loading.svg" class="anim-loading" alt="Cargando...">';
        filterBar.style.display = 'none';

        try {
            const resultados = await buscarEnWind(consulta);
            await new Promise(r => setTimeout(r, 1000));
            renderResultados(resultados, resultContainer, capsule);
        } catch (error) {
            await new Promise(r => setTimeout(r, 1000));
            resultContainer.innerHTML = `
                <div class="search-error">
                    <p>${error.message}</p>
                </div>`;
            filterBar.style.display = 'none';
            setCapsuleExpanded(capsule, true);
        }
    };

    input.addEventListener('focus', () => {
        setCapsuleExpanded(capsule, true);
    });

    input.addEventListener('input', (event) => {
        const valor = event.target.value.trim();
        clearBtn.style.display = valor ? 'flex' : 'none';

        if (!valor) {
            ultimaConsulta = '';
            resetSearchUI(resultContainer, filterBar, capsule);
            return;
        }

        setCapsuleExpanded(capsule, true);

        if (valor === ultimaConsulta) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            ultimaConsulta = valor;
            ejecutarBusqueda(valor);
        }, 300);
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const valor = input.value.trim();
        if (valor) {
            ultimaConsulta = valor;
            ejecutarBusqueda(valor);
        }
    });

    clearBtn.addEventListener('click', () => {
        input.value = '';
        input.focus();
        ultimaConsulta = '';
        clearBtn.style.display = 'none';
        resetSearchUI(resultContainer, filterBar, capsule);
    });

    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            applyFilter(chip.dataset.filter);
        });
    });

    document.querySelectorAll('.cat-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            window.dispatchEvent(new CustomEvent('category-change', { detail: { categoria_id: '', categoria_nombre: '' } }));
        });
    });

    const catSelect = document.getElementById('cat-select');
    if (catSelect) {
        catSelect.addEventListener('change', () => {
            document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
        });
    }

    document.addEventListener('click', (event) => {
        if (!capsule || !capsule.classList.contains('wind-search-capsule--expanded')) return;
        if (capsule.contains(event.target)) return;
        if (input.value.trim().length < 2) {
            resetSearchUI(resultContainer, filterBar, capsule);
        }
    });
}

async function cargarCategoriasToolbar() {
    const list = document.getElementById('cat-select-list');
    const trigger = document.getElementById('cat-select-trigger');
    const valueEl = document.getElementById('cat-select-value');
    const popup = document.getElementById('cat-select-popup');
    if (!list) return;
    try {
        const res = await fetch('/api/categorias');
        if (!res.ok) return;
        const cats = await res.json();

        function cerrarSelect(e) {
            if (!popup?.contains(e.target) && e.target !== trigger) {
                popup.classList.remove('open');
                document.removeEventListener('click', cerrarSelect);
            }
        }

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = popup.classList.toggle('open');
            if (isOpen) {
                setTimeout(() => document.addEventListener('click', cerrarSelect), 0);
            } else {
                document.removeEventListener('click', cerrarSelect);
            }
        });

        cats.forEach(c => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'cat-select-item';
            item.dataset.value = c.id;
            item.innerHTML = `
                <span class="cat-select-check">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m2.5 8.5 4 4 7-9"/>
                    </svg>
                </span>
                <span class="cat-select-item-text">${c.nombre}</span>
            `;
            item.addEventListener('click', () => {
                valueEl.textContent = c.nombre;
                popup.classList.remove('open');
                document.removeEventListener('click', cerrarSelect);
                document.querySelectorAll('.cat-chip').forEach(ch => ch.classList.remove('active'));
                document.querySelectorAll('.cat-select-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                window.dispatchEvent(new CustomEvent('category-change', { detail: { categoria_id: c.id, categoria_nombre: c.nombre } }));
            });
            list.appendChild(item);
        });
    } catch {}
}

function insertarBuscador() {
    const root = document.getElementById('buscar-placeholder');
    if (root) {
        root.innerHTML = getSearchWidgetHTML();
        crearBuscador();
        cargarCategoriasToolbar();
        observeSearchShell();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('buscar-placeholder')) {
        insertarBuscador();
    } else if (document.getElementById('search-form')) {
        crearBuscador();
        cargarCategoriasToolbar();
    }
});