const params = new URLSearchParams(window.location.search);
const relatoId = params.get('id');

const bloqueCarga = document.getElementById('bloque-carga');
const bloqueContenido = document.getElementById('bloque-contenido');
const txtTitulo = document.getElementById('txt-titulo');
const txtCuerpo = document.getElementById('txt-cuerpo');
const imgPortada = document.getElementById('img-portada');
const autorAvatar = document.getElementById('autor-avatar');
const autorNombre = document.getElementById('autor-nombre');
const autorFecha = document.getElementById('autor-fecha');

if (!relatoId) {
    if (bloqueCarga) bloqueCarga.innerHTML = '<p>No se especificó un relato.</p>';
} else {
    Promise.all([
        fetch(`/api/relatos/${relatoId}`, { credentials: 'include' }).then(r => {
            if (!r.ok) throw new Error('Relato no encontrado');
            return r.json();
        }),
        new Promise(r => setTimeout(r, 1000))
    ]).then(([relato]) => {
            if (bloqueCarga) bloqueCarga.style.display = 'none';
            if (bloqueContenido) bloqueContenido.style.display = 'block';

            const fecha = relato.fecha_publicacion
                ? new Date(relato.fecha_publicacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                : '';

            const autor = relato.autor_nombre || 'Anónimo';
            const inicial = autor.charAt(0).toUpperCase();
            const avatarFondo = relato.autor_avatar_fondo || '#e8e8e8';
            const esEspecialista = relato.autor_rol === 'Especialista';
            const badgeHtml = esEspecialista ? '<span class="badge-especialista"><img src="/img/Rol.png" alt="Especialista"></span>' : '';

            if (autorAvatar) {
                const autorHref = relato.usuario_id ? `/ver-perfil?id=${relato.usuario_id}` : null;
                if (relato.autor_avatar) {
                    const img = `<img src="${relato.autor_avatar}" alt="${autor}" onerror="this.outerHTML='${inicial}'" style="background:${avatarFondo};">`;
                    autorAvatar.innerHTML = autorHref ? `<a href="${autorHref}">${img}</a>` : img;
                } else {
                    autorAvatar.innerHTML = autorHref ? `<a href="${autorHref}">${inicial}</a>` : inicial;
                }
            }

            if (autorNombre) {
                const autorLink = relato.usuario_id ? `/ver-perfil?id=${relato.usuario_id}` : null;
                autorNombre.innerHTML = autorLink
                    ? `<a href="${autorLink}" class="autor-perfil-link">${autor}</a> ${badgeHtml}`
                    : `${autor} ${badgeHtml}`;
            }
            if (autorFecha) autorFecha.textContent = fecha;

            if (txtTitulo) txtTitulo.textContent = relato.titulo || 'Sin título';

            if (imgPortada && relato.imagen_url) {
                imgPortada.style.backgroundImage = `url(${JSON.stringify(relato.imagen_url)})`;
            } else if (imgPortada) {
                imgPortada.style.display = 'none';
            }

            if (txtCuerpo) txtCuerpo.textContent = relato.contenido_relato || '';
        })
        .catch(err => {
            if (bloqueCarga) {
                bloqueCarga.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
            }
        });
}