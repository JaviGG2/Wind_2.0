const formulario = document.getElementById('formulario-login');
const bloqueMensaje = document.getElementById('mensaje-consola');

document.querySelectorAll('.btn-ojo').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        const icon = btn.querySelector('.material-symbols-outlined');
        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = 'visibility';
        } else {
            input.type = 'password';
            icon.textContent = 'visibility_off';
        }
    });
});

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const correo = document.getElementById('correo').value;
    const contrasena = document.getElementById('contrasena').value;

    try {
        const respuesta = await fetch('/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ correo, contrasena })
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            mostrarMensaje(resultado.mensaje || '¡Bienvenido!', 'exito');
            formulario.reset();

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

window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sesion_expirada') === 'true') {
        mostrarMensaje('Tu sesión expiró porque iniciaste sesión en otro dispositivo.', 'error');
    }
});

function mostrarMensaje(texto, tipo) {
    bloqueMensaje.textContent = texto;
    bloqueMensaje.className = `mensaje-alerta ${tipo}`;
}