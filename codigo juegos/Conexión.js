function guardarEnMemoriaLocal(objetoJuego) {
    sessionStorage.setItem("juego_actual_wind", JSON.stringify(objetoJuego));
    alert("¡Juego guardado de forma local para tus pruebas!");
    window.location.href = "juego.html";
}

document.addEventListener("DOMContentLoaded", () => {

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

    document.getElementById("formulario-Memory").onsubmit = function(e) {
        e.preventDefault();
        let listaParejas = [];
        document.querySelectorAll(".bloque-pareja").forEach((bloque) => {
            let input = bloque.querySelector('input[type="text"]');
            if (input) listaParejas.push(input.value);
        });

        guardarEnMemoriaLocal({
            genero: "Memory",
            titulo: document.getElementById("memory-nombre").value,
            puntos: document.getElementById("puntos_memory").value,
            datos: { parejas: listaParejas }
        });
    };

    document.getElementById("formulario-Match").onsubmit = function(e) {
        e.preventDefault();
        let listaFilas = [];
        document.querySelectorAll(".bloque-match").forEach((bloque) => {
            let inputs = bloque.querySelectorAll('input[type="text"]');
            if (inputs.length >= 2) {
                listaFilas.push({
                    pregunta: inputs[0].value,
                    respuesta: inputs[1].value
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