function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', async () => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) { document.getElementById('batalla-podium').innerHTML = '<p>ID no válido.</p>'; return; }

    try {
        const res = await fetch(`/api/batallas/${id}/resultados`, { credentials: 'include' });
        if (!res.ok) { document.getElementById('batalla-podium').innerHTML = '<p>Error al cargar resultados.</p>'; return; }
        const data = await res.json();

        const podium = document.getElementById('batalla-podium');
        const tabla = document.getElementById('batalla-tabla');
        const medallas = ['🥇', '🥈', '🥉'];
        const colores = ['#ffd700', '#c0c0c0', '#cd7f32'];

        data.resultados.forEach((r, i) => {
            const card = document.createElement('div');
            card.className = 'batalla-podium-card';
            card.style.setProperty('--podium-color', colores[i]);
            card.style.animationDelay = `${i * 150}ms`;
            card.innerHTML = `
                <div class="batalla-podium-medalla">${medallas[i]}</div>
                <img src="${r.imagen_perfil || '/img/avatar.svg'}" alt="" class="batalla-podium-avatar" style="background-color:${r.avatar_fondo || '#e8e8e8'}">
                <div class="batalla-podium-nombre">${escapeHtml(r.nombre || r.username)}</div>
                <div class="batalla-podium-aciertos">${r.aciertos} / ${r.total_preguntas}</div>
                <div class="batalla-podium-tiempo">${r.tiempo_total_segundos || 0}s</div>
                <div class="batalla-podium-puntos">+${r.puntos_ganados} pts</div>
            `;
            podium.appendChild(card);
        });

        data.resultados.forEach((r, i) => {
            const row = document.createElement('div');
            row.className = 'batalla-tabla-row';
            row.innerHTML = `
                <div class="batalla-tabla-pos">${r.posicion}</div>
                <img src="${r.imagen_perfil || '/img/avatar.svg'}" alt="" class="batalla-tabla-avatar" style="background-color:${r.avatar_fondo || '#e8e8e8'}">
                <div class="batalla-tabla-info">
                    <div class="batalla-tabla-nombre">${escapeHtml(r.nombre || r.username)}</div>
                </div>
                <div class="batalla-tabla-stats">
                    <span>${r.aciertos}/${r.total_preguntas}</span>
                    <span>${r.tiempo_total_segundos || 0}s</span>
                    <span class="batalla-tabla-puntos">+${r.puntos_ganados}</span>
                </div>
            `;
            tabla.appendChild(row);
        });
    } catch {
        document.getElementById('batalla-podium').innerHTML = '<p>Error de conexión.</p>';
    }
});