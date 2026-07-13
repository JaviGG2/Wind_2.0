const formulario = document.getElementById('formulario-login');
const bloqueMensaje = document.getElementById('mensaje-consola');
const seccionVerificacion = document.getElementById('seccion-verificacion');
const verCorreo = document.getElementById('ver-correo');
const verCodigo = document.getElementById('ver-codigo');
const btnActivar = document.getElementById('btn-activar');
const btnReenviar = document.getElementById('btn-reenviar');
const verMensaje = document.getElementById('ver-mensaje');
const volverLogin = document.getElementById('volver-login');

let correoPendiente = '';

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

function mostrarAlert(texto, tipo) {
    bloqueMensaje.textContent = texto;
    bloqueMensaje.className = `mensaje-alerta ${tipo}`;
}

function mostrarVerAlert(texto, tipo) {
    verMensaje.textContent = texto;
    verMensaje.className = `mensaje-alerta ${tipo}`;
}

function mostrarVerificacion(correo) {
    correoPendiente = correo;
    verCorreo.textContent = correo;
    formulario.style.display = 'none';
    seccionVerificacion.style.display = 'block';
    verCodigo.value = '';
    verMensaje.className = 'mensaje-oculto';
    verCodigo.focus();
}

function ocultarVerificacion() {
    seccionVerificacion.style.display = 'none';
    formulario.style.display = 'block';
    bloqueMensaje.className = 'mensaje-oculto';
}

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const correo = document.getElementById('correo').value;
    const contrasena = document.getElementById('contrasena').value;
    const mantener = document.getElementById('mantener-sesion').checked;

    try {
        const respuesta = await fetch('/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, contrasena, mantener_sesion: mantener })
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            mostrarAlert(resultado.mensaje || '¡Bienvenido!', 'exito');
            formulario.reset();
            setTimeout(() => window.location.href = 'home', 1200);
        } else if (respuesta.status === 403 && resultado.requiereVerificacion) {
            mostrarAlert('', '');
            mostrarVerificacion(resultado.correo);
        } else {
            mostrarAlert(resultado.mensaje || 'Error al iniciar sesión.', 'error');
        }
    } catch (error) {
        mostrarAlert('No se pudo establecer conexión con el servidor.', 'error');
    }
});

btnActivar.addEventListener('click', async () => {
    const codigo = verCodigo.value.trim();
    if (!codigo || codigo.length !== 6) {
        mostrarVerAlert('Ingresa el código de 6 dígitos.', 'error');
        return;
    }
    btnActivar.disabled = true;
    btnActivar.textContent = 'Verificando...';
    try {
        const res = await fetch('/auth/verificar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: correoPendiente, codigo })
        });
        const data = await res.json();
        if (res.ok) {
            mostrarVerAlert(data.mensaje || '¡Cuenta activada!', 'exito');
            setTimeout(() => {
                ocultarVerificacion();
                mostrarAlert('Ya puedes iniciar sesión.', 'exito');
            }, 2000);
        } else {
            mostrarVerAlert(data.mensaje || 'Código incorrecto.', 'error');
        }
    } catch (e) {
        mostrarVerAlert('Error de conexión.', 'error');
    } finally {
        btnActivar.disabled = false;
        btnActivar.textContent = 'Activar cuenta';
    }
});

btnReenviar.addEventListener('click', async () => {
    btnReenviar.disabled = true;
    btnReenviar.textContent = 'Enviando...';
    try {
        const res = await fetch('/auth/re-enviar-codigo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: correoPendiente })
        });
        const data = await res.json();
        if (res.ok) {
            mostrarVerAlert(data.mensaje || 'Código reenviado.', 'exito');
            verCodigo.value = '';
            verCodigo.focus();
            if (data.codigoBypass) {
                verCodigo.value = data.codigoBypass;
            }
        } else {
            mostrarVerAlert(data.mensaje || 'Error al reenviar.', 'error');
        }
    } catch (e) {
        mostrarVerAlert('Error de conexión.', 'error');
    } finally {
        btnReenviar.disabled = false;
        btnReenviar.textContent = 'Reenviar código';
    }
});

volverLogin.addEventListener('click', (e) => {
    e.preventDefault();
    ocultarVerificacion();
});

window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sesion_expirada') === 'true') {
        mostrarAlert('Tu sesión expiró porque iniciaste sesión en otro dispositivo.', 'error');
    }
});
