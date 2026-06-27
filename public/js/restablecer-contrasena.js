const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const formulario = document.getElementById('form-restablecer');
const bloqueMensaje = document.getElementById('mensaje-consola');
const tarjeta = document.getElementById('tarjeta-restablecer');

if (!token) {
    tarjeta.innerHTML = `
        <h2>Enlace inválido</h2>
        <p>El enlace no es válido o falta el token. Solicita un nuevo restablecimiento.</p>
        <p class="texto-secundario"><a href="/recuperar-contrasena" class="enlace-secundario">Solicitar nuevo enlace</a></p>
    `;
} else {
    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        const contrasena = document.getElementById('contrasena').value;
        const confirmar = document.getElementById('confirmar').value;

        if (contrasena !== confirmar) {
            bloqueMensaje.textContent = 'Las contraseñas no coinciden.';
            bloqueMensaje.className = 'mensaje-alerta error';
            return;
        }

        try {
            const respuesta = await fetch('/auth/restablecer-contrasena', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, contrasena })
            });

            const resultado = await respuesta.json();

            if (respuesta.ok) {
                tarjeta.innerHTML = `
                    <h2>Contraseña restablecida</h2>
                    <p>${resultado.mensaje}</p>
                    <p class="texto-secundario"><a href="/login" class="enlace-secundario">Iniciar sesión</a></p>
                `;
            } else {
                bloqueMensaje.textContent = resultado.mensaje || 'Error al restablecer.';
                bloqueMensaje.className = 'mensaje-alerta error';
            }
        } catch (error) {
            bloqueMensaje.textContent = 'Error de conexión. Intenta de nuevo.';
            bloqueMensaje.className = 'mensaje-alerta error';
        }
    });
}
