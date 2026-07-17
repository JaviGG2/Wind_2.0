const baseDeConocimiento = {
    "crear-tema": {
        titulo: "¿Que son los Temas?",
        contenido: "<p>Los temas historicos son una funcionalidad que permite a los usuarios publicar informacion sobre un lugar especifico de nuestra ciudad.</p>"
    },
    "registro": {
        titulo: "Proceso de Registro",
        contenido: "<p>1. Completa el formulario.<br>2. Verifica tu correo electrónico.<br>3. ¡Listo! Ya puedes iniciar sesión.</p>"
    },
    "recuperar-password": {
        titulo: "Recuperar Contraseña",
        contenido: "<p>Ingresa tu correo y te enviaremos un enlace de restablecimiento.</p>"
    },
    "Ayuda-Descubrir": {
        titulo: "Ayuda - Descubrir",
        contenido: "<p><strong>¿Qué es este apartado?</strong><br>Aquí encuentras los temas históricos oficiales y artículos rigurosos creados por los especialistas.</p><p><strong>¿Cómo busco un tema?</strong><br>Escribe palabras clave en el buscador (ej. &quot;médanos&quot;) para filtrar al instante todo el contenido relacionado en la aplicación.</p>"
    },
    "Ayuda-Comunidad": {
        titulo: "Ayuda - Comunidad",
        contenido: "<p><strong>¿Qué es este apartado?</strong><br>Un muro comunitario para leer las experiencias y vivencias reales escritas por los ciudadanos.</p><p><strong>¿Cómo publico mi historia?</strong><br>Los relatos se redactan y se suben directamente desde la sección de tu Perfil. Una vez publicados, aparecerán listados aquí para que todos los lean.</p>"
    },
    "Ayuda-Jugar": {
        titulo: "Ayuda - Juegos",
        contenido: "<p><strong>¿Qué es este apartado?</strong><br>La zona interactiva para jugar las dinámicas educativas diseñadas por los especialistas.</p><p><strong>¿Cómo gano puntos?</strong><br>Elige entre el modo de juego libre o avanza completando los niveles de los módulos configurados para subir tu puntuación.</p>"
    },
    "Perfil(Natural)": {
        titulo: "¿Qué encuentro aquí?",
        contenido: "<p>Tu espacio personal para editar datos de tu cuenta, revisar el historial reciente de juegos completados o temas leídos, y gestionar tus relatos publicados.</p>"
    },
    "Perfil(Especialista)": {
        titulo: "Eres Especialista! ",
        contenido: "<p>Tu centro de control de autor. Este panel te habilita el acceso exclusivo a las herramientas de creacion de contenido.</p>"
    },
    "Diseñar Nivel / Minijuego": {
        titulo: "¿Para qué sirve?",
        contenido: "<p>Para configurar las preguntas, respuestas y retos que darán forma a los nuevos módulos de la zona Arcade(Jugar).</p>"
    },
    "Crear Relato Oficial o Módulo": {
        titulo: "¿Para qué sirve?",
        contenido: "<p>Para registrar contenido estructurado o documentos de apoyo histórico avalados por la cronología institucional de la ciudad.</p>"
    }
};

let popup = null;

function crearPopup() {
    const div = document.createElement('div');
    div.id = 'info-popup';
    div.className = 'info-popup oculto anim-fade-in';
    div.innerHTML = `
        <div class="info-popup-contenido anim-fade-up">
            <button type="button" class="info-popup-cerrar">
                <span class="material-symbols-outlined">close</span>
            </button>
            <h3 id="info-titulo"></h3>
            <div id="info-cuerpo" "></div>
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
