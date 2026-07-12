function abrirPopupValoracion(contenidoId, tipo, miPunt, onRate) {
  const existing = document.getElementById('popup-valoracion');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  overlay.id = 'popup-valoracion';
  overlay.innerHTML = `
    <div class="popup-valoracion-contenido">
      <div class="popup-valoracion-header">Tu valoraci\u00F3n</div>
      <div class="popup-valoracion-estrellas">
        ${[1,2,3,4,5].map(n => `<span class="popup-star${miPunt >= n ? ' active' : ''}" data-val="${n}"><span class="material-symbols-outlined">star</span></span>`).join('')}
      </div>
      <button class="popup-btn-cancelar">Cancelar</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const estrellas = overlay.querySelectorAll('.popup-star');
  const cancelar = overlay.querySelector('.popup-btn-cancelar');
  let seleccionado = miPunt;

  function highlight(hasta) {
    estrellas.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val, 10) <= hasta));
  }

  estrellas.forEach(s => {
    s.addEventListener('mouseenter', () => highlight(parseInt(s.dataset.val, 10)));
    s.addEventListener('mouseleave', () => highlight(seleccionado));
    s.addEventListener('click', () => {
      seleccionado = parseInt(s.dataset.val, 10);
      onRate(seleccionado);
      overlay.remove();
    });
  });

  cancelar.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
