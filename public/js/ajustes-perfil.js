let usuario = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/auth/perfil', { credentials: 'include' });
        if (!res.ok) { window.location.href = '/login'; return; }
        usuario = await res.json();
    } catch {
        window.location.href = '/login';
        return;
    }

    document.getElementById('info-correo').textContent = usuario.correo || '-';
    document.getElementById('info-username').textContent = usuario.username || '-';
    document.getElementById('info-rol').textContent = usuario.rol || '-';
    document.getElementById('info-puntos').textContent = usuario.puntos ?? 0;

    const avatarPreview = document.getElementById('avatar-preview');
    if (usuario.imagen_perfil) avatarPreview.src = usuario.imagen_perfil;

    cargarNivelPerfil();

    document.getElementById('btn-guardar-username')?.addEventListener('click', async () => {
        const input = document.getElementById('input-nuevo-username');
        const username = input.value.trim().toLowerCase();
        if (!username) return;
        const msj = document.getElementById('mensaje-username');
        try {
            const res = await fetch('/auth/actualizar-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username })
            });
            const data = await res.json();
            if (res.ok) {
                msj.textContent = data.mensaje;
                msj.className = 'ajustes-mensaje exito';
                document.getElementById('info-username').textContent = username;
                input.value = '';
            } else {
                msj.textContent = data.mensaje || 'Error';
                msj.className = 'ajustes-mensaje error';
            }
        } catch {
            msj.textContent = 'Error de conexión.';
            msj.className = 'ajustes-mensaje error';
        }
    });

    document.getElementById('form-foto-perfil')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('input-foto');
        if (!input.files || !input.files[0]) return;
        const msj = document.getElementById('mensaje-foto');
        const fd = new FormData();
        fd.append('foto_perfil', input.files[0]);
        try {
            const res = await fetch('/auth/actualizar-foto', {
                method: 'POST',
                credentials: 'include',
                body: fd
            });
            const data = await res.json();
            if (res.ok) {
                msj.textContent = data.mensaje;
                msj.className = 'ajustes-mensaje exito';
                input.value = '';
            } else {
                msj.textContent = data.mensaje || 'Error';
                msj.className = 'ajustes-mensaje error';
            }
        } catch {
            msj.textContent = 'Error de conexión.';
            msj.className = 'ajustes-mensaje error';
        }
    });

    document.getElementById('btn-cambiar-contrasena')?.addEventListener('click', async () => {
        const contrasenaActual = document.getElementById('input-contrasena-actual').value;
        const nuevaContrasena = document.getElementById('input-nueva-contrasena').value;
        const msj = document.getElementById('mensaje-contrasena');
        if (!contrasenaActual || !nuevaContrasena) {
            msj.textContent = 'Completa ambos campos.';
            msj.className = 'ajustes-mensaje error';
            return;
        }
        if (nuevaContrasena.length < 6) {
            msj.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
            msj.className = 'ajustes-mensaje error';
            return;
        }
        try {
            const res = await fetch('/auth/cambiar-contrasena', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ contrasenaActual, nuevaContrasena })
            });
            const data = await res.json();
            if (res.ok) {
                msj.textContent = data.mensaje;
                msj.className = 'ajustes-mensaje exito';
                document.getElementById('input-contrasena-actual').value = '';
                document.getElementById('input-nueva-contrasena').value = '';
            } else {
                msj.textContent = data.mensaje || 'Error';
                msj.className = 'ajustes-mensaje error';
            }
        } catch {
            msj.textContent = 'Error de conexión.';
            msj.className = 'ajustes-mensaje error';
        }
    });
});

async function cargarNivelPerfil() {
    try {
        const res = await fetch('/api/usuario/nivel');
        if (!res.ok) return;
        const data = await res.json();
        document.getElementById('info-nivel').textContent = `Nv ${data.nivel} — ${data.titulo} (${data.puntos} pts)`;
    } catch {}
}
