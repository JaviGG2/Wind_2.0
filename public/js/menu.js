//Menu.js. Este es el menu que se usa en todas las paginas
const barraHTML = `
  <!-- Importar Material Symbols -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
  <nav class="barra-navegacion">
    <div class="logo-menu">
      <img src="/img/logo2.png?v=${window.WIND_CACHE_VERSION || Date.now()}" alt="Wind">
      <button id="btn-notif-barra" class="notif-barra-btn" aria-label="Notificaciones">
        <span class="material-symbols-outlined">notifications</span>
        <span id="notif-badge-menu" class="notif-badge" style="display:none;">0</span>
      </button>
    </div>
    <a href="/home" class="nav-link"><span class="material-symbols-outlined">explore</span><span>Descubrir</span></a>
    <a href="/comunidad" class="nav-link"><span class="material-symbols-outlined">Groups_2</span><span>Comunidad</span></a>
    <a href="/juegos" class="nav-link"><span class="material-symbols-outlined">Play_circle</span><span>Jugar</span></a>
    <a href="/dashboard" class="nav-link"><span class="material-symbols-outlined">person</span><span>Perfil</span></a>
    <a href="/ajustes-perfil" class="nav-link ajustes-link"><span class="material-symbols-outlined">settings</span><span>Ajustes</span></a>
    <a href="#" id="menu-logout" class="nav-link logout-link"><span class="material-symbols-outlined">logout</span><span>Cerrar Sesión</span></a>
  </nav>

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

  const notifBtn = document.getElementById('btn-notif-barra');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      window.location.href = '/notificaciones';
    });
  }

  iniciarScrollMenu();
  actualizarBadge();
  setInterval(() => {
    if (!document.hidden) actualizarBadge();
  }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) actualizarBadge();
  });
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
  const badge = document.getElementById('notif-badge-menu');
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

function cargarTraductor() {
  if (document.querySelector('script[src="/js/traductor.js"]')) return;
  const s = document.createElement('script');
  s.src = '/js/traductor.js';
  document.body.appendChild(s);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { insertarBarra(); cargarTraductor(); });
} else {
  insertarBarra();
  cargarTraductor();
}