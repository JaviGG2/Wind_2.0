document.addEventListener('DOMContentLoaded', async () => {
    const contenedor = document.getElementById('recom-listado');
    const estadoDiv = document.getElementById('recom-estado-info');
    const btnEntrenar = document.getElementById('btn-entrenar');

    async function cargarEstado() {
        try {
            const res = await fetch('/api/recomendaciones/estado', { credentials: 'include' });
            const data = await res.json();
            if (data.listo) {
                estadoDiv.className = 'recom-estado-card listo';
                estadoDiv.innerHTML = `
                    <div class="estado-item"><span>Motor</span><span>✓ Listo</span></div>
                    <div class="estado-item"><span>Entrenamiento</span><span>Completado al iniciar el servidor</span></div>
                `;
            } else {
                estadoDiv.className = 'recom-estado-card';
                estadoDiv.innerHTML = `<div class="estado-item"><span>Motor</span><span style="color:#ea580c;">⏳ No entrenado</span></div>`;
            }
        } catch {
            estadoDiv.innerHTML = `<p class="muted">Error al consultar estado.</p>`;
        }
    }

    async function cargarRecomendaciones() {
        contenedor.innerHTML = '<p class="muted center">Cargando recomendaciones...</p>';
        try {
            const res = await fetch('/api/recomendaciones/usuario', { credentials: 'include' });
            if (!res.ok) throw new Error('Error');
            const data = await res.json();

            const items = data.temas || [];
            if (items.length === 0) {
                contenedor.innerHTML = `
                    <div style="grid-column:1/-1;text-align:center;padding:40px 0;">
                        <span class="material-symbols-outlined" style="font-size:3rem;color:var(--texto-muted);">auto_awesome</span>
                        <p class="muted" style="margin-top:12px;">Aún no hay suficientes datos.<br>Visita algunos temas para recibir recomendaciones.</p>
                    </div>`;
                return;
            }

            contenedor.innerHTML = items.map(item => {
                const fecha = item.fecha_publicacion ? new Date(item.fecha_publicacion).toLocaleDateString() : '';
                const resumen = item.resumen || item.contenido || '';
                return `
                    <a href="/ver-tema?id=${item.id}" class="recom-card">
                        <div class="recom-card-tag">Tema histórico</div>
                        <h3>${item.titulo || 'Sin título'}</h3>
                        <p>${resumen.substring(0, 150)}...</p>
                        <div class="recom-card-footer">
                            <span>${item.categoria || 'General'} · ${fecha}</span>
                            <span class="recom-card-score">
                                <span class="material-symbols-outlined">trending_up</span>
                                ${item.likes || 0}
                            </span>
                        </div>
                    </a>
                `;
            }).join('');
        } catch {
            contenedor.innerHTML = '<p class="muted center error">Error al cargar recomendaciones.</p>';
        }
    }

    btnEntrenar.addEventListener('click', async () => {
        btnEntrenar.disabled = true;
        btnEntrenar.textContent = 'Entrenando...';
        try {
            const res = await fetch('/api/recomendaciones/entrenar', {
                method: 'POST',
                credentials: 'include'
            });
            if (res.ok) {
                await cargarEstado();
                await cargarRecomendaciones();
            }
        } catch {}
        btnEntrenar.disabled = false;
        btnEntrenar.innerHTML = '<span class="material-symbols-outlined">refresh</span> Re-entrenar';
    });

    await Promise.all([cargarEstado(), cargarRecomendaciones()]);
});
