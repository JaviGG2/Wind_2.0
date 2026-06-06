const formulario = document.getElementById('formulario-login');
const bloqueMensaje = document.getElementById('mensaje-consola');

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault(); // Evita la recarga de página [cite: 11, 247]

    const correo = document.getElementById('correo').value;
    const contrasena = document.getElementById('contrasena').value;

    try {
        const respuesta = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ correo, contrasena })
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            mostrarMensaje(resultado.mensaje || '¡Bienvenido!', 'exito');
            formulario.reset();
            
            // Redirige al panel central de control en 1.2 segundos
            setTimeout(() => {
                window.location.href = 'home';
            }, 1200);
        } else {
            mostrarMensaje(resultado.mensaje || 'Error al iniciar sesión.', 'error');
        }
    } catch (error) {
        mostrarMensaje('No se pudo establecer conexión con el servidor.', 'error');
    }
});

formVerificar.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const correo = verificarCorreoInput.value;
    const codigo = codigoInput.value;

    try {
        // Le pegamos al nuevo endpoint que creamos en el authController
        const respuesta = await fetch('/auth/verificar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ correo, codigo })
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            // Si el código coincide, mostramos éxito y limpiamos la interfaz
            seccionCodigo.innerHTML = `
                <h3 style="color: #2ecc71; text-align: center;">${resultado.mensaje}</h3>
                <p style="text-align: center; color: #666;">Redirigiendo al inicio de sesión...</p>
            `;
            
            // Esperamos 3 segundos para que el usuario lea el mensaje y redirigimos
            setTimeout(() => {
                window.location.href = '/login'; // Tu ruta limpia del login sin .html
            }, 3000);
        } else {
            // Si el código está mal escrito o expiró, pintamos el error abajo del input
            txtMensajeCodigo.textContent = resultado.mensaje || 'Código inválido.';
            txtMensajeCodigo.style.color = '#ff4d4d';
        }

    } catch (error) {
        txtMensajeCodigo.textContent = 'Error al procesar la verificación con el servidor.';
        txtMensajeCodigo.style.color = '#ff4d4d';
    }
});


function mostrarMensaje(texto, tipo) {
    bloqueMensaje.textContent = texto;
    bloqueMensaje.className = `mensaje-alerta ${tipo}`;
}