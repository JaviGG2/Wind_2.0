# Wind_2.0
Nueva versión

Instrucciones:

a/ PARA INICIAR EL PROYECTO:
1. Abrir la terminal en la carpeta del proyecto.
2. Ejecutar el comando:node app.js
3. Abrir el navegador en la dirección: http://localhost:3000

b/ PARA EDITAR EL MENU
1. Esta en la carpeta js dentro de public, y para insectar el menu en el html deben colocar este script: <script src="/js/menu.js"></script>, y llamar el estilo del menu dentro del html con <link rel="stylesheet" href="/css/menu.css"> , con su otro estilo del html que estan trabajando (Traten de no poner el mismo nombre de las 
clases)

2. Para editar el estilo deben ir al archivo menu.css dentro de public, este es el estilo especifico del menu, como  ya dije, se deve crear otro css para la base como tal, ojo siguendo el  css home para que no se pierda el estilo de la base, y para que se vea bien en pc y movil deben usar las media queries que estan en el css home. Ojo igual pueden meter contenido dentro no hay problema solo asegurarse de que sea responsivo. 

como ya les dije, el home.html tiene dos estilos css

<link rel="stylesheet" href="/css/home.css">
<link rel="stylesheet" href="/css/menu.css">

El primero es el estilo de la base, y el segundo es el estilo del menu. 

c/ PARA ESTABLCER PAGINAS
1. deben "registrar" el archivo html en app.js, como en Python se registra una ruta con @app.route('/home'), y llamar al archivo 

app.get('/', (req, res) => {
   
    res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

2. deben crear un archivo html en la carpeta views, y llamarlo en app.js


//Tienen libertad de diseñar siguiemto la idea, pueden agregar coasas en home, tarjetas etc.  Pero obvio sin afectar la posision y propiedades de los menus.

//falta los iconos de la barra de navegacion
//falta mas estilo en la barra de navegacion
