(function () {
    var contenedor = document.getElementById('mapa-contenedor');
    var loading = document.getElementById('mapa-loading');
    if (!contenedor) return;

    var todosLosTemas = [];
    var mapa = null;
    var marcadores = [];
    var filtroActual = 'todas';

    var COLORES_CATEGORIA = {
        'Arquitectura Colonial': '#FF4500',
        'Tradiciones Indígenas (Caquetíos)': '#2E7D32',
        'Tradiciones Indígenas': '#2E7D32',
        'Personajes Históricos': '#1565C0',
        'Leyendas Falconianas': '#6A1B9A'
    };

    function colorCategoria(cat) {
        return COLORES_CATEGORIA[cat] || '#FF4500';
    }

    function crearIcono(color) {
        return L.divIcon({
            className: '',
            html: '<div class="marcador-personalizado" style="background:' + color + ';">' +
                  '<span class="material-symbols-outlined">location_on</span></div>',
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -40]
        });
    }

    function crearIconoAgrupado(color, count) {
        return L.divIcon({
            className: '',
            html: '<div class="marcador-agrupado" style="background:' + color + ';">' +
                  '<span class="marcador-agrupado-icon material-symbols-outlined">location_on</span>' +
                  '<span class="marcador-agrupado-badge">' + count + '</span></div>',
            iconSize: [46, 46],
            iconAnchor: [23, 46],
            popupAnchor: [0, -48]
        });
    }

    function crearPopupHtml(t) {
        var imgHtml = t.imagen_portada
            ? '<div class="popup-mapa-img-wrap"><img class="popup-mapa-img" src="' + t.imagen_portada + '" alt="' + t.titulo + '" onerror="this.parentElement.style.display=\'none\'"></div>'
            : '';
        var cat = t.categoria_nombre || '';
        var catBadge = cat ? '<span style="display:inline-block;font-size:10px;color:' + colorCategoria(cat) + ';font-weight:600;margin-bottom:4px;">' + cat + '</span><br>' : '';
        return '<div class="popup-mapa-card">' + imgHtml +
            '<div class="popup-mapa-body">' +
            catBadge +
            '<h3 class="popup-mapa-titulo">' + t.titulo + '</h3>' +
            '<p class="popup-mapa-autor"><span class="material-symbols-outlined">person</span>' + (t.creador_nombre || t.creador_username || 'Desconocido') + '</p>' +
            '<a class="popup-mapa-link" href="/ver-tema?id=' + t.id + '"><span class="material-symbols-outlined">open_in_new</span> Ver tema</a>' +
            '</div></div>';
    }

    function crearPopupGrupoHtml(grupo) {
        var items = grupo.map(function (t) {
            var cat = t.categoria_nombre || '';
            var color = colorCategoria(cat);
            return '<a class="popup-mapa-grupo-item" href="/ver-tema?id=' + t.id + '">' +
                '<span class="popup-mapa-grupo-dot" style="background:' + color + ';"></span>' +
                '<span class="popup-mapa-grupo-titulo">' + t.titulo + '</span>' +
                '<span class="material-symbols-outlined popup-mapa-grupo-arrow">chevron_right</span>' +
                '</a>';
        }).join('');
        return '<div class="popup-mapa-grupo">' +
            '<div class="popup-mapa-grupo-header">' + grupo.length + ' temas en esta ubicación</div>' +
            items + '</div>';
    }

    function agruparPorUbicacion(temas) {
        var grupos = {};
        temas.forEach(function (t) {
            var lat = parseFloat(t.latitud);
            var lng = parseFloat(t.longitud);
            if (isNaN(lat) || isNaN(lng)) return;
            var key = lat + ',' + lng;
            if (!grupos[key]) grupos[key] = { lat: lat, lng: lng, items: [] };
            grupos[key].items.push(t);
        });
        return grupos;
    }

    function renderizarMarcadores(temas) {
        if (mapa) {
            marcadores.forEach(function (m) { mapa.removeLayer(m); });
            marcadores = [];
        }

        if (!temas || temas.length === 0) {
            var vacio = contenedor.querySelector('.mapa-vacio');
            if (!vacio) {
                var el = document.createElement('div');
                el.className = 'mapa-vacio';
                el.innerHTML = '<span class="material-symbols-outlined">map</span><p>No hay temas en esta categoría.</p>';
                contenedor.appendChild(el);
            }
            actualizarContador(0);
            return;
        }

        var vacioEl = contenedor.querySelector('.mapa-vacio');
        if (vacioEl) vacioEl.remove();

        var grupos = agruparPorUbicacion(temas);
        var keys = Object.keys(grupos);
        var bounds = [];
        var totalMarcados = 0;

        keys.forEach(function (key) {
            var g = grupos[key];
            var count = g.items.length;
            totalMarcados += count;
            bounds.push([g.lat, g.lng]);

            if (count === 1) {
                var t = g.items[0];
                var color = colorCategoria(t.categoria_nombre);
                var marker = L.marker([g.lat, g.lng], { icon: crearIcono(color) })
                    .addTo(mapa)
                    .bindPopup(crearPopupHtml(t), { maxWidth: 280, className: 'popup-mapa' });
                marcadores.push(marker);
            } else {
                var color = colorCategoria(g.items[0].categoria_nombre);
                var marker = L.marker([g.lat, g.lng], { icon: crearIconoAgrupado(color, count) })
                    .addTo(mapa)
                    .bindPopup(crearPopupGrupoHtml(g.items), { maxWidth: 300, className: 'popup-mapa' });
                marcadores.push(marker);
            }
        });

        if (bounds.length > 0) {
            mapa.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }

        actualizarContador(totalMarcados);
    }

    function actualizarContador(n) {
        var existente = contenedor.querySelector('.mapa-contador');
        if (existente) existente.remove();
        var el = document.createElement('div');
        el.className = 'mapa-contador';
        el.innerHTML = '<span class="material-symbols-outlined">location_on</span> ' + n + ' tema' + (n !== 1 ? 's' : '');
        contenedor.appendChild(el);
    }

    function filtrarPorCategoria(cat) {
        if (cat === 'todas') return todosLosTemas;
        return todosLosTemas.filter(function (t) {
            return t.categoria_nombre && t.categoria_nombre.toLowerCase().indexOf(cat.toLowerCase()) !== -1;
        });
    }

    function buscarTemas(q) {
        if (!q || q.length < 2) return filtrarPorCategoria(filtroActual);
        var lower = q.toLowerCase();
        return todosLosTemas.filter(function (t) {
            if (t.categoria_nombre && t.categoria_nombre !== filtroActual && filtroActual !== 'todas') return false;
            return t.titulo.toLowerCase().indexOf(lower) !== -1 ||
                   (t.creador_nombre && t.creador_nombre.toLowerCase().indexOf(lower) !== -1);
        });
    }

    function actualizarMapa() {
        var filtrados = filtrarPorCategoria(filtroActual);
        renderizarMarcadores(filtrados);
    }

    async function cargarMapa() {
        try {
            var res = await fetch('/api/temas/mapa', { credentials: 'include' });
            if (!res.ok) throw new Error('Error');
            var temas = await res.json();

            if (loading) loading.classList.add('oculto');

            todosLosTemas = temas || [];

            if (!mapa) {
                mapa = L.map('mapa-contenedor', {
                    center: [11.4056, -69.6674],
                    zoom: 13,
                    zoomControl: true,
                    zoomSnap: 0.5,
                    attributionControl: false
                });

                L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                    maxZoom: 19
                }).addTo(mapa);

                L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(mapa);
            }

            renderizarMarcadores(temas);

            var params = new URLSearchParams(window.location.search);
            var destLat = params.get('lat');
            var destLng = params.get('lng');
            if (destLat && destLng) {
                destLat = parseFloat(destLat);
                destLng = parseFloat(destLng);
                if (!isNaN(destLat) && !isNaN(destLng)) {
                    mapa.setView([destLat, destLng], 16);
                    setTimeout(function () {
                        marcadores.forEach(function (m) {
                            var mlat = m.getLatLng().lat;
                            var mlng = m.getLatLng().lng;
                            if (Math.abs(mlat - destLat) < 0.0001 && Math.abs(mlng - destLng) < 0.0001) {
                                m.openPopup();
                            }
                        });
                    }, 400);
                }
            }

        } catch (err) {
            console.error('Error cargando mapa:', err);
            if (loading) {
                loading.innerHTML = '<span class="material-symbols-outlined">error_outline</span><span>Error al cargar el mapa.</span>';
            }
        }
    }

    // Botón mi ubicación
    var btnMilugar = document.getElementById('btn-milugar');
    if (btnMilugar) {
        btnMilugar.addEventListener('click', function () {
            if (!mapa) return;
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function (pos) {
                        mapa.setView([pos.coords.latitude, pos.coords.longitude], 15);
                        L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
                            radius: 8, color: '#4285F4', fillColor: '#4285F4', fillOpacity: 0.3
                        }).addTo(mapa);
                    },
                    function () {
                        mapa.setView([11.4056, -69.6674], 14);
                    }
                );
            }
        });
    }

    // Filtros
    var filtros = document.querySelectorAll('.mapa-filtro-btn');
    filtros.forEach(function (btn) {
        btn.addEventListener('click', function () {
            filtros.forEach(function (b) { b.classList.remove('activo'); });
            btn.classList.add('activo');
            filtroActual = btn.dataset.filtro;
            actualizarMapa();
        });
    });

    // Búsqueda
    var searchInput = document.getElementById('mapa-buscar-input');
    if (searchInput) {
        var searchTimer;
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(function () {
                var q = searchInput.value.trim();
                if (q.length >= 2) {
                    var resultados = buscarTemas(q);
                    renderizarMarcadores(resultados);
                } else {
                    actualizarMapa();
                }
            }, 300);
        });
    }

    cargarMapa();
})();
