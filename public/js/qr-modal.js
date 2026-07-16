window.abrirQRModal = function (opts) {
    opts = opts || {};
    var url = opts.url || window.location.href;
    var titulo = opts.titulo || '';

    var overlay = document.createElement('div');
    overlay.className = 'qr-overlay';
    overlay.innerHTML =
        '<div class="qr-modal">' +
            '<div class="qr-modal-header">' +
                '<h3>Código QR</h3>' +
                '<button class="qr-modal-close material-symbols-outlined">close</button>' +
            '</div>' +
            '<div class="qr-modal-body">' +
                '<div class="qr-loading-stage" id="qr-loading-stage">' +
                    '<img src="/images/loading-4.svg" class="qr-loading-svg" alt="Generando...">' +
                    '<span class="qr-loading-text">Generando código QR...</span>' +
                '</div>' +
                '<div class="qr-result-stage" id="qr-result-stage">' +
                    '<div id="qr-code"></div>' +
                    '<div class="qr-info">' +
                        '<h4 id="qr-titulo"></h4>' +
                        '<span class="qr-url" id="qr-url"></span>' +
                    '</div>' +
                    '<button class="qr-descargar-btn" id="qr-descargar">' +
                        '<span class="material-symbols-outlined">download</span> Descargar QR' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>';

    document.body.appendChild(overlay);

    var loadingStage = overlay.querySelector('#qr-loading-stage');
    var resultStage = overlay.querySelector('#qr-result-stage');
    var qrContainer = overlay.querySelector('#qr-code');
    var closeBtn = overlay.querySelector('.qr-modal-close');

    closeBtn.addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.remove();
    });

    document.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', handler); }
    });

    var qr;
    try {
        qr = new QRCode(qrContainer, {
            text: url,
            width: 200,
            height: 200,
            colorDark: '#111827',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch (e) {
        console.error('Error generando QR:', e);
    }

    setTimeout(function () {
        if (loadingStage) loadingStage.classList.add('oculto');
        if (resultStage) {
            resultStage.classList.add('visible');
            document.querySelector('#qr-titulo').textContent = titulo;
            document.querySelector('#qr-url').textContent = url;
        }
    }, 3900);

    var downloadBtn = overlay.querySelector('#qr-descargar');
    downloadBtn.addEventListener('click', function () {
        var canvas = qrContainer.querySelector('canvas');
        if (!canvas) return;
        var link = document.createElement('a');
        link.download = 'codigo-qr.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
};
