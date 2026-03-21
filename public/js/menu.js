//Menu.js. Este es el menu que se usa en todas las paginas
const barraHTML = `
  <head>
    <title>Wind</title>
  </head>
  <nav class="barra-navegacion">
    <a href="/" class="nav-link">Inicio</a>
    <a href="/explorar" class="nav-link">Explorar</a>
    <a href="/simulador" class="nav-link">Arcade</a>
    <a href="/perfil" class="nav-link">Perfil</a>
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
}

// Se ejecuta automáticamente al cargar
insertarBarra();