//app.js, principal del proyecto. Funciona como servidor web (Flask)

const express = require('express');
const path = require('path'); // Librería nativa para manejar rutas
const app = express();

// 1. Habilitar la carpeta pública (CSS, JS, Imágenes)
app.use(express.static('public'));

// 2. Ruta principal para mostrar tu HTML
app.get('/', (req, res) => {
    // res.sendFile necesita la ruta absoluta del archivo
    res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

app.get('/perfil', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'perfil.html'));
});

app.listen(3000, () => {
    console.log('Servidor en http://localhost:3000');
});