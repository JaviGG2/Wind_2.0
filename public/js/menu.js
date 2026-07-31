//Menu.js. Este es el menu que se usa en todas las paginas
const barraHTML = `
  <!-- Importar Material Symbols -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
  <style>
    .migration-banner {
      display: none;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border-bottom: 2px solid #ff4500;
      color: #e0e0e0;
      font-size: 0.85rem;
      text-align: center;
      position: relative;
      z-index: 999;
      flex-wrap: wrap;
      animation: slideDown 0.4s ease;
    }
    @keyframes slideDown {
      from { max-height: 0; opacity: 0; padding: 0 20px; }
      to { max-height: 80px; opacity: 1; padding: 12px 20px; }
    }
    .migration-banner.show { display: flex; }
    .migration-banner .material-symbols-outlined {
      font-size: 20px;
      color: #ff6b35;
      flex-shrink: 0;
    }
    .migration-banner a {
      color: #ff8a65;
      font-weight: 700;
      text-decoration: none;
      border-bottom: 1px dotted #ff8a65;
    }
    .migration-banner a:hover { color: #fff; border-bottom-color: #fff; }
    .migration-dismiss {
      background: rgba(255,255,255,0.08);
      border: none;
      color: #999;
      font-size: 1.1rem;
      cursor: pointer;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .migration-dismiss:hover {
      background: rgba(255,69,0,0.3);
      color: #fff;
    }
    @media (max-width: 480px) {
      .migration-banner { font-size: 0.78rem; padding: 10px 14px; gap: 8px; }
    }
  </style>
  <div id="migration-banner" class="migration-banner">
    <span class="material-symbols-outlined">open_in_new</span>
    <span>Wind cambia de casa: <a href="https://wind-2-0-2.onrender.com" target="_blank">wind-2-0-2.onrender.com</a></span>
    <button id="dismiss-migration" class="migration-dismiss">&times;</button>
  </div>
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

  const banner = document.getElementById('migration-banner');
  const dismissBtn = document.getElementById('dismiss-migration');
  const allowedPages = ['/home', '/comunidad', '/juegos', '/dashboard'];
  if (banner && allowedPages.includes(window.location.pathname) && !sessionStorage.getItem('migration_dismissed')) {
    banner.classList.add('show');
  }
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      banner.classList.remove('show');
      sessionStorage.setItem('migration_dismissed', '1');
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
  document.addEventListener('DOMContentLoaded', () => { insertarBarra(); cargarTraductor(); restaurarScroll(); });
} else {
  insertarBarra();
  cargarTraductor();
  restaurarScroll();
}

const SCROLL_KEY = 'wind_scroll_' + location.pathname;
const DETAIL_PATHS = ['/ver-tema', '/ver-relato', '/play-game', '/modulo-detalle', '/notificaciones'];

window.addEventListener('beforeunload', () => {
  sessionStorage.setItem(SCROLL_KEY, window.scrollY);
});

function restaurarScroll() {
  const saved = sessionStorage.getItem(SCROLL_KEY);
  if (saved === null) return;
  sessionStorage.removeItem(SCROLL_KEY);
  try {
    const ref = new URL(document.referrer);
    if (!DETAIL_PATHS.some(p => ref.pathname.startsWith(p))) return;
  } catch (_) { return; }
  const pos = parseInt(saved);
  if (pos <= 0) return;
  const intentar = (intentos) => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll >= pos || intentos <= 0) {
      window.scrollTo(0, Math.min(pos, maxScroll));
      return;
    }
    setTimeout(() => intentar(intentos - 1), 200);
  };
  intentar(20);
}

// --- Service Worker + PWA Install ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

let deferredInstallPrompt = null;
window.deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  window.deferredInstallPrompt = e;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  window.deferredInstallPrompt = null;
  const banner = document.getElementById('install-banner');
  if (banner) banner.style.display = 'none';
});

// --- Dark Mode ---
(function() {
  var KEY = 'wind-theme';
  function aplicar(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = tema === 'dark' ? '#0f0f12' : '#ff4500';
  }
  var guardado = localStorage.getItem(KEY);
  if (guardado === 'dark') { aplicar('dark'); }
  else if (guardado === 'light') { aplicar('light'); }
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    aplicar('dark');
  }
  window.__setTheme = function(tema) {
    localStorage.setItem(KEY, tema);
    aplicar(tema);
  };
})();

window.addEventListener('pageshow', () => {
  const saved = sessionStorage.getItem(SCROLL_KEY);
  if (saved === null) return;
  sessionStorage.removeItem(SCROLL_KEY);
  try {
    const ref = new URL(document.referrer);
    if (!DETAIL_PATHS.some(p => ref.pathname.startsWith(p))) return;
  } catch (_) { return; }
  const pos = parseInt(saved);
  if (pos <= 0) return;
  const intentar = (intentos) => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll >= pos || intentos <= 0) {
      window.scrollTo(0, Math.min(pos, maxScroll));
      return;
    }
    setTimeout(() => intentar(intentos - 1), 200);
  };
  intentar(20);
});