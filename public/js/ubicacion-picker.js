(function () {
    const btnAbrir = document.getElementById('btn-agregar-ubicacion');
    const overlay = document.getElementById('ubicacion-modal-overlay');
    const btnCerrar = document.getElementById('btn-cerrar-ubicacion');
    const btnGuardar = document.getElementById('btn-guardar-ubicacion');
    const mapaEl = document.getElementById('mapa-ubicacion');
    const inputBuscar = document.getElementById('buscar-ubicacion');
    const latInput = document.getElementById('latitud');
    const lngInput = document.getElementById('longitud');
    const coordLat = document.getElementById('coord-lat');
    const coordLng = document.getElementById('coord-lng');
    const badge = document.getElementById('ubicacion-badge');
    const btnEditar = document.getElementById('btn-editar-ubicacion');

    if (!btnAbrir || !overlay) return;

    let mapInstance = null;
    let marker = null;
    let searchTimeout = null;
    let latSeleccionado = null;
    let lngSeleccionado = null;

    function initMapa() {
        if (mapInstance) return;
        mapInstance = L.map('mapa-ubicacion', {
            center: [11.4056, -69.6674],
            zoom: 14,
            zoomControl: true
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OSM',
            maxZoom: 19
        }).addTo(mapInstance);

        mapInstance.on('click', function (e) {
            colocarPin(e.latlng.lat, e.latlng.lng);
        });

        if (latSeleccionado && lngSeleccionado) {
            colocarPin(latSeleccionado, lngSeleccionado);
        }

        setTimeout(function () { mapInstance.invalidateSize(); }, 400);
        mapInstance.whenReady(function () {
            mapInstance.invalidateSize();
        });
    }

    function colocarPin(lat, lng) {
        latSeleccionado = lat;
        lngSeleccionado = lng;
        if (marker) {
            marker.setLatLng([lat, lng]);
        } else if (mapInstance) {
            marker = L.marker([lat, lng], { draggable: true }).addTo(mapInstance);
            marker.on('dragend', function () {
                var pos = marker.getLatLng();
                colocarPin(pos.lat, pos.lng);
            });
        }
        actualizarModalCoords(lat, lng);
        if (mapInstance) mapInstance.setView([lat, lng], mapInstance.getZoom());
    }

    function actualizarModalCoords(lat, lng) {
        if (coordLat) coordLat.textContent = lat.toFixed(6);
        if (coordLng) coordLng.textContent = lng.toFixed(6);
    }

    function abrirModal() {
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        initMapa();
    }

    function cerrarModal() {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    function guardarUbicacion() {
        if (latSeleccionado == null || lngSeleccionado == null) {
            if (coordLat) {
                coordLat.textContent = 'Selecciona un punto en el mapa';
                coordLat.style.color = '#d32f2f';
                setTimeout(function () { coordLat.style.color = ''; }, 2000);
            }
            return;
        }
        latInput.value = latSeleccionado.toFixed(6);
        lngInput.value = lngSeleccionado.toFixed(6);
        badge.style.display = 'flex';
        cerrarModal();
    }

    btnAbrir.addEventListener('click', abrirModal);
    btnCerrar.addEventListener('click', cerrarModal);
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) cerrarModal();
    });
    btnGuardar.addEventListener('click', guardarUbicacion);

    if (btnEditar) {
        btnEditar.addEventListener('click', function () {
            abrirModal();
        });
    }

    // Search with Nominatim
    if (inputBuscar) {
        var buscandoMsg = document.createElement('div');
        buscandoMsg.style.cssText = 'font-size:12px;color:#888;margin:4px 0;display:none;';
        buscandoMsg.textContent = 'Buscando...';
        inputBuscar.parentNode.insertBefore(buscandoMsg, inputBuscar.nextSibling);

        inputBuscar.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            var q = this.value.trim();
            if (q.length < 3) {
                buscandoMsg.style.display = 'none';
                return;
            }
            buscandoMsg.style.display = 'block';
            searchTimeout = setTimeout(function () {
                var url = 'https://nominatim.openstreetmap.org/search?format=json&q='
                    + encodeURIComponent(q + ', Coro, Venezuela')
                    + '&limit=5';
                fetch(url)
                    .then(function (r) {
                        if (!r.ok) throw new Error('HTTP ' + r.status);
                        return r.json();
                    })
                    .then(function (datos) {
                        buscandoMsg.style.display = 'none';
                        if (!datos || datos.length === 0) {
                            inputBuscar.placeholder = 'Sin resultados. Intenta otro lugar.';
                            setTimeout(function () { inputBuscar.placeholder = 'Buscar lugar en Coro...'; }, 2500);
                            return;
                        }
                        var r = datos[0];
                        if (!mapInstance) initMapa();
                        colocarPin(parseFloat(r.lat), parseFloat(r.lon));
                    })
                    .catch(function (err) {
                        buscandoMsg.style.display = 'none';
                        console.warn('Error al buscar ubicación:', err);
                        inputBuscar.placeholder = 'Error al buscar. Intenta de nuevo.';
                        setTimeout(function () { inputBuscar.placeholder = 'Buscar lugar en Coro...'; }, 2500);
                    });
            }, 500);
        });
    }

    // init map if coords already exist (editing)
    if (latInput && latInput.value) {
        latSeleccionado = parseFloat(latInput.value);
        lngSeleccionado = parseFloat(lngInput.value);
        badge.style.display = 'flex';
    }
})();
