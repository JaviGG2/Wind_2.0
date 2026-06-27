const params = new URLSearchParams(window.location.search);
const relatoId = params.get('id');

if (!relatoId) {
    document.getElementById('relato-container').innerHTML = '<p>No se especificó un relato.</p>';
} else {
    fetch(`/api/relatos/${relatoId}`)
        .then(r => {
            if (!r.ok) throw new Error('Relato no encontrado');
            return r.json();
        })
        .then(relato => {
            const container = document.getElementById('relato-container');
            let imagenHTML = '';
            if (relato.imagen_url) {
                imagenHTML = `<img src="${relato.imagen_url}" alt="${relato.titulo}" style="max-width:100%;height:auto;border-radius:8px;margin-top:16px;display:block;">`;
            }
            container.innerHTML = `
                <article>
                    <h1>${relato.titulo}</h1>
                    <p style="color:#666;font-size:0.9em;">
                        Por ${relato.autor_nombre || 'Anónimo'} —
                        ${new Date(relato.fecha_publicacion).toLocaleDateString()}
                    </p>
                    <p>${relato.contenido_relato}</p>
                    ${imagenHTML}
                </article>
            `;
        })
        .catch(err => {
            document.getElementById('relato-container').innerHTML =
                `<p style="color:red;">Error: ${err.message}</p>`;
        });
}