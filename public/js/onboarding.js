(function () {
  var LS_KEY = 'wind_onboarding_v';

  var carousel = document.getElementById('carousel');
  var dots = document.getElementById('dots');
  var btnContinue = document.getElementById('btnContinue');
  var btnSkip = document.getElementById('btnSkip');
  var slides = carousel.querySelectorAll('.ob-slide');
  var total = slides.length;

  function buildDots() {
    for (var i = 0; i < total; i++) {
      var dot = document.createElement('span');
      dot.className = 'ob-dot' + (i === 0 ? ' active' : '');
      dots.appendChild(dot);
    }
  }

  function updateDots(index) {
    var all = dots.querySelectorAll('.ob-dot');
    all.forEach(function (d, i) {
      d.classList.toggle('active', i === index);
    });
  }

  function getCurrentIndex() {
    if (!carousel) return 0;
    var w = carousel.clientWidth;
    if (w === 0) return 0;
    return Math.round(carousel.scrollLeft / w);
  }

  function scrollTo(index) {
    var w = carousel.clientWidth;
    carousel.scrollTo({ left: index * w, behavior: 'smooth' });
  }

  function completeOnboarding() {
    var version = window.WIND_CACHE_VERSION || String(Date.now());
    try { localStorage.setItem(LS_KEY, version); } catch (e) {}
    window.location.href = '/home';
  }

  buildDots();

  btnContinue.addEventListener('click', function () {
    var current = getCurrentIndex();
    if (current < total - 1) {
      scrollTo(current + 1);
    } else {
      completeOnboarding();
    }
  });

  btnSkip.addEventListener('click', completeOnboarding);

  carousel.addEventListener('scroll', function () {
    var index = getCurrentIndex();
    updateDots(index);
    if (index === total - 1) {
      btnContinue.textContent = 'Comenzar';
    } else {
      btnContinue.textContent = 'Continuar';
    }
  });

  var touchStartX = 0;
  carousel.addEventListener('touchstart', function (e) {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  carousel.addEventListener('touchend', function (e) {
    var diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 5) return;
    var index = getCurrentIndex();
    updateDots(index);
  }, { passive: true });
})();
