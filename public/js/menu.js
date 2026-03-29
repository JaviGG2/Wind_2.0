//Menu.js. Este es el menu que se usa en todas las paginas
const barraHTML = `
  <head>
    <title>Wind</title>
    <!-- Importar Material Symbols (Versión Variable) -->
    <link rel="stylesheet" href="https://fonts.googleapis.com" />


  </head>
  <nav class="barra-navegacion">
    <a href="/" class="nav-link"><span class="material-symbols-outlined">home</span>Inicio</a>
    <a href="/explorar" class="nav-link"><span class="material-symbols-outlined">Explore</span></a>
    <a href="/simulador" class="nav-link"><span class="material-symbols-outlined">Play_circle</span></a>
    <a href="/perfil" class="nav-link"><span class="material-symbols-outlined">person</span></a>
  </nav>
`;

// Esta función "inyecta" la barra al principio del body de cualquier página
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
}

// Se ejecuta automáticamente al cargar
insertarBarra();