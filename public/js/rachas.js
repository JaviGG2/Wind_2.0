document.addEventListener('DOMContentLoaded', async () => {
    const numElem = document.getElementById('racha-num');
    const maxElem = document.getElementById('racha-max');
    const ultimoElem = document.getElementById('racha-ultimo');
    const reputacionElem = document.getElementById('racha-reputacion');
    const rangoElem = document.getElementById('racha-rango');
    const errorMsg = document.getElementById('racha-error');
    const content = document.getElementById('racha-content');

    try {
        const resRacha = await fetch('/api/rachas');
        if (!resRacha.ok) throw new Error('Error al cargar racha');
        const data = await resRacha.json();

        const actual = data.racha_creacion_actual || 0;
        const max = data.racha_creacion_maxima || 0;

        numElem.textContent = actual;
        maxElem.textContent = max;

        if (data.ultimo_creacion) {
            const fecha = new Date(data.ultimo_creacion);
            ultimoElem.textContent = fecha.toLocaleDateString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        } else {
            ultimoElem.textContent = 'Aún no has creado contenido';
        }

        const resRep = await fetch('/api/usuario/reputacion');
        if (resRep.ok) {
            const repData = await resRep.json();
            if (reputacionElem) reputacionElem.textContent = repData.puntos || 0;
            if (rangoElem) rangoElem.textContent = repData.titulo || 'Novato';
        }

        content.style.display = '';
    } catch (err) {
        errorMsg.textContent = 'No se pudo cargar la información de tu racha.';
        errorMsg.style.display = '';
    }
});
