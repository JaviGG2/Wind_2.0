//Menu.js. Este es el menu que se usa en todas las paginas
const barraHTML = `
  <!-- Importar Material Symbols -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
  <nav class="barra-navegacion">
    <div class="logo-menu"><img src="/img/app.png" alt="Wind"></div>
    <a href="/home" class="nav-link"><span class="material-symbols-outlined">explore</span><span>Descubrir</span></a>
    <a href="/comunidad" class="nav-link"><span class="material-symbols-outlined">Groups_2</span><span>Comunidad</span></a>
    <a href="/juegos" class="nav-link"><span class="material-symbols-outlined">Play_circle</span><span>Jugar</span></a>
    <a href="/dashboard" class="nav-link"><span class="material-symbols-outlined">person</span><span>Perfil</span></a>
    <a href="#" id="menu-logout" class="nav-link logout-link"><span class="material-symbols-outlined">logout</span><span>Cerrar Sesión</span></a>
  </nav>
  <style>#fab-feedback,#feedback-overlay{display:none!important}</style>
  <link rel="stylesheet" href="/css/feedback.css">
  <button class="fab-feedback" id="fab-feedback" aria-label="Enviar feedback">
    <span class="material-symbols-outlined">feedback</span>
  </button>
  <div class="feedback-modal-overlay" id="feedback-overlay">
    <div class="feedback-modal">
      <div class="feedback-modal-header">
        <h3>Enviar feedback</h3>
        <button class="feedback-modal-close" id="feedback-close" type="button">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="feedback-seccion">
        <span class="material-symbols-outlined">open_in_new</span>
        <span id="feedback-pagina"></span>
      </div>
      <textarea class="feedback-textarea" id="feedback-mensaje" placeholder="Escribe tu mensaje, sugerencia o reporte..." maxlength="1000"></textarea>
      <button class="feedback-btn" id="feedback-enviar" type="button">
        <span class="material-symbols-outlined">send</span>
        Enviar feedback
      </button>
      <div class="feedback-msg" id="feedback-msg"></div>
    </div>
  </div>
`;

function insertarBarra() {
  const placeholder = document.getElementById('menu-placeholder');
  if (placeholder) {
    placeholder.outerHTML = barraHTML;
  } else {
    document.body.insertAdjacentHTML('afterbegin', barraHTML);
  }

  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });

  const logoutLink = document.getElementById('menu-logout');
  if (logoutLink) {
    logoutLink.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        const res = await fetch('/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
        if (res.ok) {
          window.location.replace('/login');
        }
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      }
    });
  }

  iniciarScrollMenu();
  actualizarBadge();
  setInterval(actualizarBadge, 30000);
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted && document.querySelector('.notif-badge')) {
    if (typeof actualizarBadge === 'function') actualizarBadge();
  }
});

function iniciarScrollMenu() {
  let lastScrollTop = 0;
  const navbar = document.querySelector('.barra-navegacion');

  if (!navbar) return;

  window.addEventListener('scroll', () => {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (Math.abs(lastScrollTop - scrollTop) <= 10) return;

    if (scrollTop > lastScrollTop && scrollTop > 50) {
      navbar.classList.add('barra-oculta');
    } else {
      navbar.classList.remove('barra-oculta');
    }

    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
  }, { passive: true });
}

async function actualizarBadge() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  try {
    const res = await fetch('/api/notificaciones/no-leidas', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const total = data.total || 0;
    if (total > 0) {
      badge.textContent = total > 99 ? '99+' : total;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  } catch (err) {
    /* silent */
  }
}

function initFeedback() {
  const fab = document.getElementById('fab-feedback');
  const overlay = document.getElementById('feedback-overlay');
  const close = document.getElementById('feedback-close');
  const enviar = document.getElementById('feedback-enviar');
  const textarea = document.getElementById('feedback-mensaje');
  const msgEl = document.getElementById('feedback-msg');
  const paginaEl = document.getElementById('feedback-pagina');

  if (!fab || !overlay) return;

  const secciones = {
    '/home': 'Descubrir', '/comunidad': 'Comunidad', '/juegos': 'Juegos',
    '/dashboard': 'Perfil', '/relatos': 'Relatos', '/ver-relato': 'Relato',
    '/ver-tema': 'Tema', '/notificaciones': 'Notificaciones',
    '/recomendaciones': 'Recomendaciones', '/play-game': 'Juego',
    '/modulos': 'Módulos', '/crear-relato': 'Crear Relato',
    '/subir-tema': 'Subir Tema', '/ajustes-perfil': 'Ajustes'
  };
  const path = window.location.pathname;
  const nombreSeccion = Object.entries(secciones).find(([k]) => path.startsWith(k))?.[1] || 'General';
  if (paginaEl) paginaEl.textContent = `Estás en: ${nombreSeccion}`;

  fab.addEventListener('click', () => {
    overlay.classList.add('open');
    textarea.value = '';
    msgEl.style.display = 'none';
    msgEl.className = 'feedback-msg';
    textarea.focus();
  });

  const cerrar = () => overlay.classList.remove('open');
  close.addEventListener('click', cerrar);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });

  enviar.addEventListener('click', async () => {
    const msg = textarea.value.trim();
    if (!msg) { mostrarMsg('Escribe un mensaje.', 'error'); return; }
    enviar.disabled = true;
    enviar.innerHTML = '<span class="material-symbols-outlined">hourglass_top</span> Enviando...';
    try {
      const r = await fetch('/api/feedback', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: msg, pagina: window.location.href })
      });
      const data = await r.json();
      if (r.ok) {
        mostrarMsg('¡Feedback enviado con éxito!', 'success');
        textarea.value = '';
        setTimeout(cerrar, 1500);
      } else {
        mostrarMsg(data.mensaje || 'Error al enviar.', 'error');
      }
    } catch (err) {
      mostrarMsg('Error de conexión.', 'error');
    } finally {
      enviar.disabled = false;
      enviar.innerHTML = '<span class="material-symbols-outlined">send</span> Enviar feedback';
    }
  });

  function mostrarMsg(texto, tipo) {
    msgEl.textContent = texto;
    msgEl.className = `feedback-msg ${tipo}`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { insertarBarra(); initFeedback(); });
} else {
  insertarBarra();
  initFeedback();
}