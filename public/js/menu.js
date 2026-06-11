//Menu.js. Este es el menu que se usa en todas las paginas
const barraHTML = `
  <!-- Importar Material Symbols -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
  <nav class="barra-navegacion">
    <a href="/home" class="nav-link"><span class="material-symbols-outlined">home</span><span>Descubrir</span></a>
    <a href="/comunidad" class="nav-link"><span class="material-symbols-outlined">Explore</span><span>Comunidad</span></a>
    <a href="/juegos" class="nav-link"><span class="material-symbols-outlined">Play_circle</span><span>Jugar</span></a>
    <a href="/dashboard" class="nav-link"><span class="material-symbols-outlined">person</span><span>Perfil</span></a>
    <a href="#" id="menu-logout" class="nav-link logout-link"><span class="material-symbols-outlined">logout</span><span>Cerrar Sesión</span></a>
  </nav>
`;

// Esta función "inyecta" la barra de cualquier página
function insertarBarra() {
  const placeholder = document.getElementById('menu-placeholder');
  if (placeholder) {
    placeholder.outerHTML = barraHTML;
  } else {
    document.body.insertAdjacentHTML('afterbegin', barraHTML);
  }

  // Resaltar el enlace de la página actual
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

  // Iniciar la lógica de scroll después de insertar la barra
  iniciarScrollMenu();
}

// Lógica para ocultar el menú al hacer scroll (Móvil)
function iniciarScrollMenu() {
  let lastScrollTop = 0;
  const navbar = document.querySelector('.barra-navegacion');

  if (!navbar) return;

  window.addEventListener('scroll', () => {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Solo actuar si nos hemos movido más de 10px para evitar parpadeos
    if (Math.abs(lastScrollTop - scrollTop) <= 10) return;

    if (scrollTop > lastScrollTop && scrollTop > 50) {
      // Scroll hacia abajo - Ocultar
      navbar.classList.add('barra-oculta');
    } else {
      // Scroll hacia arriba - Mostrar
      navbar.classList.remove('barra-oculta');
    }

    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
  }, { passive: true });
}

// Se ejecuta al cargar el DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', insertarBarra);
} else {
  insertarBarra();
}