inicializarEditor('contenido', 'editor-contenido');

const formulario = document.getElementById('formulario-subir-tema');
const bloqueMensaje = document.getElementById('mensaje-consola');

// Cargar categorías desde la BD
(async function cargarCategorias() {
    var select = document.getElementById('categoria_id');
    try {
        var res = await fetch('/api/categorias', { credentials: 'include' });
        if (res.ok) {
            var cats = await res.json();
            select.innerHTML = '<option value="" disabled selected>Selecciona una categoría...</option>';
            cats.forEach(function (c) {
                var opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.nombre;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error('Error cargando categorías:', e);
        select.innerHTML = '<option value="" disabled selected>Error al cargar categorías</option>';
    }
})();

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limpiarMarcas();

    const editor = document.getElementById('editor-contenido');
    const contenido = editor.innerHTML.trim();
    if (!contenido || contenido === '<br>' || contenido === '') {
        mostrarMensaje('El contenido del artículo no puede estar vacío.', 'error');
        return;
    }

    const datosFormulario = new FormData();
    datosFormulario.append('categoria_id', document.getElementById('categoria_id').value);
    datosFormulario.append('titulo', document.getElementById('titulo').value);
    datosFormulario.append('contenido', contenido);

    const latInput = document.getElementById('latitud');
    const lngInput = document.getElementById('longitud');
    if (latInput && latInput.value) {
        datosFormulario.append('latitud', latInput.value);
        datosFormulario.append('longitud', lngInput.value);
    }
    
    const inputImagen = document.getElementById('imagen_portada');
    if (inputImagen.files.length > 0) {
        datosFormulario.append('imagen_portada', inputImagen.files[0]);
    }

    try {
        const respuesta = await fetch('/admin/subir-tema', {
            method: 'POST',
            body: datosFormulario
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            mostrarMensaje(resultado.mensaje || '¡Tema publicado con éxito!', 'exito');
            formulario.reset();
        } else if (resultado.malasPalabras) {
            mostrarMensaje(resultado.mensaje || 'Se detectaron palabras inapropiadas.', 'error');
            marcarMalasPalabras(resultado.malasPalabras);
        } else {
            mostrarMensaje(resultado.mensaje || 'Error al publicar el tema.', 'error');
        }
    } catch (error) {
        mostrarMensaje('Error de red al conectar con el servidor.', 'error');
    }
});

function marcarMalasPalabras(palabras) {
    if (!palabras || palabras.length === 0) return;
    try {
        const tituloInput = document.getElementById('titulo');
        const tituloValor = tituloInput.value;
        const pattern = palabras.sort((a, b) => b.length - a.length)
            .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|');

        const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');

        // Marcar título
        const palabrasEnTitulo = tituloValor.match(new RegExp(regex.source, 'gi'));
        if (palabrasEnTitulo) {
            tituloInput.classList.add('bad-word-input');
            let adv = document.getElementById('bad-word-title-adv');
            if (!adv) {
                adv = document.createElement('div');
                adv.id = 'bad-word-title-adv';
                adv.className = 'bad-word-adv';
                tituloInput.parentNode.appendChild(adv);
            }
            adv.textContent = 'Palabras inapropiadas en el título: ' + [...new Set(palabrasEnTitulo)].join(', ');
        }

        // Marcar contenido del editor — recorrer nodos de texto
        const editor = document.getElementById('editor-contenido');
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        for (const node of textNodes) {
            const texto = node.nodeValue;
            if (!texto) continue;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;
            const nodeRegex = new RegExp(regex.source, 'gi');
            while ((match = nodeRegex.exec(texto)) !== null) {
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(texto.slice(lastIndex, match.index)));
                }
                const span = document.createElement('span');
                span.className = 'bad-word-marker';
                span.textContent = match[0];
                fragment.appendChild(span);
                lastIndex = match.index + match[0].length;
            }
            if (lastIndex < texto.length) {
                fragment.appendChild(document.createTextNode(texto.slice(lastIndex)));
            }
            if (fragment.childNodes.length > 0) {
                node.parentNode.replaceChild(fragment, node);
            }
        }
    } catch (e) {
        console.error('Error al marcar palabras:', e);
    }
}

function limpiarMarcas() {
    try {
        document.getElementById('titulo').classList.remove('bad-word-input');
        const adv = document.getElementById('bad-word-title-adv');
        if (adv) adv.remove();
        const editor = document.getElementById('editor-contenido');
        editor.querySelectorAll('.bad-word-marker').forEach(el => {
            el.replaceWith(el.textContent);
        });
    } catch (e) {
        console.error('Error al limpiar marcas:', e);
    }
}

function mostrarMensaje(texto, tipo) {
    bloqueMensaje.textContent = texto;
    bloqueMensaje.className = `mensaje-alerta ${tipo}`;
}