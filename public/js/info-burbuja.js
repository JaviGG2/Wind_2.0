import { baseDeConocimiento } from './info.js';

let popup = null;

function crearPopup() {
    const div = document.createElement('div');
    div.id = 'info-popup';
    div.className = 'info-popup oculto';
    div.innerHTML = `
        <div class="info-popup-contenido">
            <button type="button" class="info-popup-cerrar">
                <span class="material-symbols-outlined">close</span>
            </button>
            <h3 id="info-titulo"></h3>
            <div id="info-cuerpo"></div>
        </div>
    `;
    document.body.appendChild(div);

    popup = div;
    const titulo = div.querySelector('#info-titulo');
    const cuerpo = div.querySelector('#info-cuerpo');
    const cerrar = div.querySelector('.info-popup-cerrar');

    cerrar.addEventListener('click', () => popup.classList.add('oculto'));
    div.addEventListener('click', (e) => {
        if (e.target === div) popup.classList.add('oculto');
    });

    return { titulo, cuerpo };
}

function mostrarInfo(clave) {
    const info = baseDeConocimiento[clave];
    if (info) {
        if (!popup) {
            const refs = crearPopup();
            refs.titulo.textContent = info.titulo;
            refs.cuerpo.innerHTML = info.contenido;
        } else {
            const titulo = popup.querySelector('#info-titulo');
            const cuerpo = popup.querySelector('#info-cuerpo');
            titulo.textContent = info.titulo;
            cuerpo.innerHTML = info.contenido;
        }
        popup.classList.remove('oculto');
    }
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-info]');
    if (btn) mostrarInfo(btn.dataset.info);
});
