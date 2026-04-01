//Menu.js. Este es el menu que se usa en todas las paginas
const barraHTML = `
  <!-- Importar Material Symbols -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
  <nav class="barra-navegacion">
    <a href="/" class="nav-link"><span class="material-symbols-outlined">home</span><span>Inicio</span></a>
    <a href="/explorar" class="nav-link"><span class="material-symbols-outlined">Explore</span><span>Explorar</span></a>
    <a href="/simulador" class="nav-link"><span class="material-symbols-outlined">Play_circle</span><span>Play</span></a>
    <a href="/perfil" class="nav-link"><span class="material-symbols-outlined">person</span><span>Perfil</span></a>
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