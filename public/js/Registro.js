const formulario = document.getElementById('formulario-registro');
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

const seccionCodigo = document.getElementById('seccion-codigo');
const formVerificar = document.getElementById('form-verificar');
const codigoInput = document.getElementById('codigo-input');
const verificarCorreoInput = document.getElementById('verificar-correo');
const txtMensajeCodigo = document.getElementById('mensaje-codigo');

const passInput = document.getElementById('contrasena');
const passConfirm = document.getElementById('contrasena-confirmar');
const passReqs = document.getElementById('password-requisitos');
const confirmAyuda = document.getElementById('confirmar-ayuda');

function validarPassword(pass) {
    return {
        largo: pass.length >= 8,
        mayuscula: /[A-Z]/.test(pass),
        numero: /[0-9]/.test(pass),
        especial: /[^a-zA-Z0-9\s]/.test(pass)
    };
}

function actualizarFeedbackPassword() {
    const pass = passInput.value;
    const v = validarPassword(pass);
    const checks = [];
    if (v.largo) checks.push('6+ caracteres');
    else checks.push('8+ caracteres');
    if (v.mayuscula) checks.push(' Mayúscula');
    else checks.push(' Mayúscula');
    if (v.numero) checks.push(' Número');
    else checks.push('Número');
    if (v.especial) checks.push(' Especial');
    else checks.push(' Especial');

    const todosValidos = v.largo && v.mayuscula && v.numero && v.especial;
    passReqs.textContent = checks.join(' · ');
    passReqs.className = 'input-ayuda' + (pass.length === 0 ? '' : (todosValidos ? ' valido' : ' invalido'));

    validarConfirmacion();
}

function validarConfirmacion() {
    if (!passConfirm.value) {
        confirmAyuda.textContent = '';
        confirmAyuda.className = 'input-ayuda';
        return;
    }
    const coinciden = passInput.value === passConfirm.value;
    confirmAyuda.textContent = coinciden ? 'Las contraseñas coinciden' : ' Las contraseñas no coinciden';
    confirmAyuda.className = 'input-ayuda' + (coinciden ? ' valido' : ' invalido');
    return coinciden;
}

passInput.addEventListener('input', actualizarFeedbackPassword);
passConfirm.addEventListener('input', validarConfirmacion);

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const botonEnviar = formulario.querySelector('button[type="submit"]');
    if (botonEnviar) {
        botonEnviar.disabled = true;
        botonEnviar.textContent = 'Procesando...';
    }

    const nombre = document.getElementById('nombre').value;
    const correo = document.getElementById('correo').value;
    const username = document.getElementById('username').value;
    const contrasena = passInput.value;
    const confirmar = passConfirm.value;

    if (contrasena !== confirmar) {
        mostrarMensaje('Las contraseñas no coinciden.', 'error');
        if (botonEnviar) { botonEnviar.disabled = false; botonEnviar.textContent = 'Registrarse'; }
        return;
    }

    const v = validarPassword(contrasena);
    if (!v.largo || !v.mayuscula || !v.numero || !v.especial) {
        mostrarMensaje('La contraseña debe tener al menos 6 caracteres, una mayúscula, un número y un carácter especial.', 'error');
        if (botonEnviar) { botonEnviar.disabled = false; botonEnviar.textContent = 'Registrarse'; }
        return;
    }

    const datosUsuario = {
        nombre, username, correo, contrasena
    };

    try {
        const respuesta = await fetch('/auth/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosUsuario)
        });

        const resultado = await respuesta.json();

        if (respuesta.status === 201 || (respuesta.ok && resultado.requiereVerificacion)) {
            formulario.style.display = 'none';
            seccionCodigo.style.display = 'block';
            verificarCorreoInput.value = resultado.correo || correo;

            if (resultado.codigoBypass) {
                alert(`[MODO PRUEBA]: Tu código de activación es: ${resultado.codigoBypass}`);
                console.log('Tu código de activación es:', resultado.codigoBypass);
            }
            formulario.reset();
            passReqs.textContent = 'Debe tener al menos 6 caracteres, 1 mayúscula, 1 número y 1 carácter especial';
            passReqs.className = 'input-ayuda';
        } else if (!respuesta.ok) {
            mostrarMensaje(resultado.mensaje || 'Ocurrió un error inesperado.', 'error');
            if (botonEnviar) { botonEnviar.disabled = false; botonEnviar.textContent = 'Registrarse'; }
        }
    } catch (error) {
        mostrarMensaje('No se pudo establecer conexión con el servidor.', 'error');
        if (botonEnviar) { botonEnviar.disabled = false; botonEnviar.textContent = 'Registrarse'; }
    }
});

window.addEventListener('DOMContentLoaded', () => {
    const parametrosUrl = new URLSearchParams(window.location.search);
    if (parametrosUrl.get('verificar') === 'true' && parametrosUrl.get('correo')) {
        formulario.style.display = 'none';
        seccionCodigo.style.display = 'block';
        verificarCorreoInput.value = parametrosUrl.get('correo');
    }
});

formVerificar.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const correo = verificarCorreoInput.value;
    const codigo = codigoInput.value;

    try {
        const respuesta = await fetch('/auth/verificar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, codigo })
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            seccionCodigo.innerHTML = `
                <h3 style="color: #2ecc71; text-align: center;">${resultado.mensaje}</h3>
                <p style="text-align: center; color: #666;">Redirigiendo al inicio de sesión...</p>
            `;
            setTimeout(() => { window.location.href = '/login'; }, 3000);
        } else {
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
