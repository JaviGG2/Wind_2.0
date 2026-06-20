const formulario = document.getElementById('formulario-registro');
const bloqueMensaje = document.getElementById('mensaje-consola');

// =========================================================================
// NUEVOS ELEMENTOS: Capturamos la sección del código agregada en el HTML
// =========================================================================
const seccionCodigo = document.getElementById('seccion-codigo');
const formVerificar = document.getElementById('form-verificar');
const codigoInput = document.getElementById('codigo-input');
const verificarCorreoInput = document.getElementById('verificar-correo');
const txtMensajeCodigo = document.getElementById('mensaje-codigo');

// 1. Escucha del Formulario de Registro Principal
formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault(); // Evitamos que la página se recargue automáticamente

    // Deshabilitamos el botón para evitar doble envío lento por SMTP
    const botonEnviar = formulario.querySelector('button[type="submit"]');
    if (botonEnviar) {
        botonEnviar.disabled = true;
        botonEnviar.textContent = 'Procesando...';
    }

    // Extraemos los valores limpios de los inputs del formulario
    const nombre = document.getElementById('nombre').value;
    const correo = document.getElementById('correo').value;
    const username = document.getElementById('username').value;
    const contrasena = document.getElementById('contrasena').value;

    // Estructuramos el objeto con la información
    const datosUsuario = {
        nombre: nombre,
        username: username,
        correo: correo,
        contrasena: contrasena
    };

    try {
        // Realizamos la petición HTTP POST hacia el backend de Node.js
        const respuesta = await fetch('/auth/registro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Avisamos que enviamos un JSON
            },
            body: JSON.stringify(datosUsuario) // Convertimos el objeto JS a un string JSON
        });

        // Procesamos la respuesta en formato JSON que devuelve el servidor
        const resultado = await respuesta.json();

        // Aceptamos 201 (Creado) o respuesta.ok con requiereVerificacion
        if (respuesta.status === 201 || (respuesta.ok && resultado.requiereVerificacion)) {
            formulario.style.display = 'none'; // Oculta los inputs de registro
            seccionCodigo.style.display = 'block'; // Muestra la caja del código

            // Guardamos el correo en el input oculto para saber a quién activar luego
            verificarCorreoInput.value = resultado.correo || correo;

            // Si el servidor devolvió un codigoBypass (modo desarrollo), lo mostramos
            if (resultado.codigoBypass) {
                alert(`[MODO PRUEBA]: Tu código de activación es: ${resultado.codigoBypass}`);
                console.log('Tu código de activación es:', resultado.codigoBypass);
            }

            // Limpiamos el formulario viejo por seguridad
            formulario.reset(); 
        } else if (!respuesta.ok) {
            // Si el servidor capturó un fallo de validación o duplicado (Status 400)
            mostrarMensaje(resultado.mensaje || 'Ocurrió un error inesperado.', 'error');
            if (botonEnviar) {
                botonEnviar.disabled = false;
                botonEnviar.textContent = 'Registrarse';
            }
        }
    } catch (error) {
        // En caso de que el servidor esté apagado o no haya conexión a internet
        mostrarMensaje('No se pudo establecer conexión con el servidor.', 'error');
        if (botonEnviar) {
            botonEnviar.disabled = false;
            botonEnviar.textContent = 'Registrarse';
        }
    }
});

// NUEVO: Comprobamos si venimos redirigidos del login por cuenta inactiva
window.addEventListener('DOMContentLoaded', () => {
    const parametrosUrl = new URLSearchParams(window.location.search);
    if (parametrosUrl.get('verificar') === 'true' && parametrosUrl.get('correo')) {
        formulario.style.display = 'none';
        seccionCodigo.style.display = 'block';
        verificarCorreoInput.value = parametrosUrl.get('correo');
    }
});


// 2. NUEVO EVENTO: Escucha del Formulario de Verificación de Código

formVerificar.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const correo = verificarCorreoInput.value;
    const codigo = codigoInput.value;

    try {
        const respuesta = await fetch('/auth/verificar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ correo, codigo })
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            seccionCodigo.innerHTML = `
                <h3 style="color: #2ecc71; text-align: center;">${resultado.mensaje}</h3>
                <p style="text-align: center; color: #666;">Redirigiendo al inicio de sesión...</p>
            `;

            setTimeout(() => {
                window.location.href = '/login';
            }, 3000);
        } else {
            txtMensajeCodigo.textContent = resultado.mensaje || 'Código inválido.';
            txtMensajeCodigo.style.color = '#ff4d4d';
        }

    } catch (error) {
        txtMensajeCodigo.textContent = 'Error al procesar la verificación con el servidor.';
        txtMensajeCodigo.style.color = '#ff4d4d';
    }
});

// Función dinámica encargada de renderizar los banners de alerta en el HTML
function mostrarMensaje(texto, tipo) {
    bloqueMensaje.textContent = texto;
    bloqueMensaje.className = `mensaje-alerta ${tipo}`; // Asigna los estilos correspondientes
}