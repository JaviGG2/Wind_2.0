// ================================================================
// FUNCIÓN CENTRAL: GUARDA CUALQUIER JUEGO Y REDIRIGE
// ================================================================
function guardarEnMemoriaLocal(objetoJuego) {
    sessionStorage.setItem("juego_actual_wind", JSON.stringify(objetoJuego));
    alert("¡Juego guardado de forma local para tus pruebas!");
    window.location.href = "juego.html"; // Recuerda cambiar "juego.html" por el nombre de tu archivo si es diferente
}

// ================================================================
// ESCUCHA DE ENVIOS (SUBMIT) DE LOS FORMULARIOS
// ================================================================
document.addEventListener("DOMContentLoaded", () => {

    // 1. Enviar el Quiz
    document.getElementById("formulario-quiz").onsubmit = function(e) {
        e.preventDefault();
        guardarEnMemoriaLocal({
            genero: "quiz",
            titulo: "Trivia Patrimonial",
            puntos: document.getElementById("puntos_recompensa").value,
            datos: {
                pregunta: document.getElementById("pregunta").value,
                a: document.getElementById("opcion_a").value,
                b: document.getElementById("opcion_b").value,
                c: document.getElementById("opcion_c").value,
                correcta: document.getElementById("opcion_correcta").value
            }
        });
    };

    // 2. Enviar el Memory (PERFECTO: Guarda el texto puro directamente)
    document.getElementById("formulario-Memory").onsubmit = function(e) {
        e.preventDefault();
        let listaParejas = [];
        document.querySelectorAll(".bloque-pareja").forEach((bloque) => {
            let input = bloque.querySelector('input[type="text"]');
            // Guardamos la palabra limpia en el array para que el tablero la mezcle al azar
            if (input) listaParejas.push(input.value);
        });

        guardarEnMemoriaLocal({
            genero: "Memory",
            titulo: document.getElementById("memory-nombre").value,
            puntos: document.getElementById("puntos_memory").value,
            datos: { parejas: listaParejas }
        });
    };

    // 3. Enviar el Match (AHORA SÍ PERFECTO: Separa los inputs de forma milimétrica)
    document.getElementById("formulario-Match").onsubmit = function(e) {
        e.preventDefault();
        let listaFilas = [];
        document.querySelectorAll(".bloque-match").forEach((bloque) => {
            let inputs = bloque.querySelectorAll('input[type="text"]');
            if (inputs.length >= 2) {
                listaFilas.push({
                    pregunta: inputs[0].value,   // inputs[0] es obligatoriamente el Concepto A (pregunta)
                    respuesta: inputs[1].value   // inputs[1] es obligatoriamente el Concepto B (respuesta)
                });
            }
        });

        guardarEnMemoriaLocal({
            genero: "Match",
            titulo: document.getElementById("match-nombre").value,
            puntos: document.getElementById("puntos_match").value,
            datos: { parejasMatch: listaFilas }
        });
    };

    // 4. Enviar el Scramblee
    document.getElementById("formulario-Scramblee").onsubmit = function(e) {
        e.preventDefault();
        guardarEnMemoriaLocal({
            genero: "Scramblee",
            titulo: document.getElementById("scramble-nombre").value,
            puntos: document.getElementById("puntos_scramble").value,
            datos: {
                palabra: document.getElementById("scramble-palabra").value.toUpperCase().trim(),
                pista: document.getElementById("scramble-pista").value
            }
        });
    };
});
