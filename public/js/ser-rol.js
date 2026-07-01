document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('form-solicitud');
    const btn = document.getElementById('btn-ser-rol');
    const msg = document.getElementById('ser-rol-msg');
    const nombreInput = document.getElementById('ser-nombre');
    const usernameInput = document.getElementById('ser-username');
    const correoInput = document.getElementById('ser-correo');
    const mensajeInput = document.getElementById('ser-mensaje');
    const fotoInput = document.getElementById('ser-foto');
    const fileText = document.getElementById('ser-file-text');
    const filePreview = document.getElementById('ser-file-preview');
    const fileImg = document.getElementById('ser-file-img');
    const fileRemove = document.getElementById('ser-file-remove');

    if (!form) return;

    try {
        const res = await fetch('/auth/perfil', { credentials: 'include' });
        if (res.ok) {
            const user = await res.json();
            if (nombreInput) nombreInput.value = user.nombre || '';
            if (usernameInput) usernameInput.value = user.username || '';
            if (correoInput) correoInput.value = user.correo || '';
        }
    } catch (_) {}

    fotoInput.addEventListener('change', () => {
        const file = fotoInput.files[0];
        if (!file) {
            filePreview.style.display = 'none';
            fileText.textContent = 'Seleccionar imagen';
            return;
        }
        fileText.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            fileImg.src = e.target.result;
            filePreview.style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    });

    fileRemove.addEventListener('click', () => {
        fotoInput.value = '';
        filePreview.style.display = 'none';
        fileText.textContent = 'Seleccionar imagen';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mensaje = mensajeInput.value.trim();
        if (!mensaje) {
            msg.textContent = 'Escribe tu motivación para ser Especialista.';
            msg.className = 'ser-rol-msg error';
            mensajeInput.focus();
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined">hourglass_top</span> Enviando...';
        msg.textContent = '';
        msg.className = 'ser-rol-msg';

        const formData = new FormData();
        formData.append('mensaje', mensaje);
        if (fotoInput.files[0]) {
            formData.append('foto', fotoInput.files[0]);
        }

        try {
            const res = await fetch('/auth/solicitar-ascenso', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                msg.textContent = data.mensaje || 'Solicitud enviada. El equipo revisará tu perfil.';
                msg.className = 'ser-rol-msg success';
                btn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Solicitud enviada';
                mensajeInput.disabled = true;
                fotoInput.disabled = true;
            } else {
                msg.textContent = data.mensaje || 'Error al procesar la solicitud.';
                msg.className = 'ser-rol-msg error';
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-outlined">workspace_premium</span> Enviar solicitud';
            }
        } catch (err) {
            msg.textContent = 'Error de conexión. Intenta de nuevo.';
            msg.className = 'ser-rol-msg error';
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined">workspace_premium</span> Enviar solicitud';
        }
    });
});
