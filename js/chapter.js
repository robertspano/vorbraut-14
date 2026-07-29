/* ==========================================================================
   Vorbraut 14 — SNIÐIÐ: lesframvinda á hæðarásinni + örvaflakk milli kafla.
   Keyrir Á EFTIR page.js. Snertir engan [data-i18n] hnút.
   ========================================================================== */
(function () {
  'use strict';
  var chap = document.querySelector('.chap');
  if (!chap) return;

  /* --- örvatakkar flakka milli kafla ------------------------------------- */
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    var sel = e.key === 'ArrowRight' ? '.chap__pager a.is-next'
            : e.key === 'ArrowLeft'  ? '.chap__pager a.is-prev' : null;
    if (!sel) return;
    var a = document.querySelector(sel);
    if (a) { e.preventDefault(); window.location.href = a.getAttribute('href'); }
  });

  /* --- mjúk innkoma á sniðinu og skránni ---------------------------------
     Falda ástandið er ALDREI virkt nema þessi skrifta keyri (.js-chap), og
     öryggisklukka opnar allt eftir 1,5 s. Þannig getur efni aldrei orðið
     ósýnilegt — hvorki án JS né í flipa sem browserinn hefur sett á pásu. */
  var reveal = [].slice.call(document.querySelectorAll('.chap__plate,.chap__ledger'));
  if (!reveal.length) return;
  document.documentElement.classList.add('js-chap');
  var open = function (el) { el.classList.add('is-open'); };
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      if (en.isIntersecting) { open(en.target); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  reveal.forEach(function (el) { io.observe(el); });
  setTimeout(function () { reveal.forEach(open); }, 1500);

  /* --- myndband hleðst EKKI fyrr en það sést (2,6 MB sparast annars) ------ */
  var film = document.querySelector('.chap__film');
  if (film) {
    var start = function () {
      if (!film.dataset.on) {
        film.dataset.on = '1';
        film.preload = 'auto';
        film.load();
      }
      if (!film.paused) return;
      var p = film.play();
      if (p && p.catch) p.catch(function () {});   // browser hafnar sjálfspilun -> poster stendur
    };
    /* Myndbandið spilar aðeins meðan það sést. Áður hélt það áfram að afkóða
       eftir að skrunað var framhjá — það stelur römmum frá skruninu sjálfu. */
    var fio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) { start(); }
        else if (film.dataset.on && !film.paused) { film.pause(); }
      });
    }, { rootMargin: '200px 0px' });
    fio.observe(film);
    /* varaleið: sums staðar er IntersectionObserver settur á pásu (falinn flipi,
       sparnaðarhamur). Skrunhandfangið er alltaf keyrt, svo það sér um afganginn. */
    var nearby = function () {
      var r = film.getBoundingClientRect();
      var naerri = r.top < window.innerHeight + 200 && r.bottom > -200;
      if (naerri) start();
      else if (film.dataset.on && !film.paused) film.pause();
    };
    window.addEventListener('scroll', nearby, { passive: true });
    window.addEventListener('resize', nearby, { passive: true });
    setTimeout(nearby, 400);
  }

  /* --- þjónustukort: skráin og kortið lýsa hvort annað upp -------------- */
  var kort = document.querySelector('.kort');
  if (kort) {
    var lis = kort.querySelectorAll('.kort__flokkur li[data-nr]');
    var mrk = {};
    kort.querySelectorAll('.kort__m[data-nr]').forEach(function (g) { mrk[g.dataset.nr] = g; });
    var lit = function (nr, on) {
      var g = mrk[nr];
      if (g) g.classList.toggle('is-on', on);
      var li = kort.querySelector('.kort__flokkur li[data-nr="' + nr + '"]');
      if (li) li.classList.toggle('is-on', on);
    };
    lis.forEach(function (li) {
      var nr = li.dataset.nr;
      li.addEventListener('mouseenter', function () { lit(nr, true); });
      li.addEventListener('mouseleave', function () { lit(nr, false); });
    });
    Object.keys(mrk).forEach(function (nr) {
      var g = mrk[nr];
      g.addEventListener('mouseenter', function () { lit(nr, true); });
      g.addEventListener('mouseleave', function () { lit(nr, false); });
    });

    /* sími: kortið rúllar til hliðar — byrja á Vorbraut 14, ekki á jaðrinum */
    var ramma = kort.querySelector('.kort__mynd');
    var midja = function () {
      if (ramma.scrollWidth > ramma.clientWidth) {
        ramma.scrollLeft = (ramma.scrollWidth - ramma.clientWidth) / 2;
      }
    };
    midja();
    window.addEventListener('resize', midja, { passive: true });
  }

  /* --- bílakjallari: strikuðu stæðismerkin ofan á grunnmyndina -------------
     Sömu reitir og íbúðasíðan notar, svo teikningarnar tvær segi það sama. */
  var kjSvg = document.getElementById('kjkafliSvg');
  var K = window.VB && window.VB.KJALLARI;
  if (kjSvg && K && K.staediReitir) {
    kjSvg.setAttribute('viewBox', '0 0 ' + K.w + ' ' + K.h);
    var d = '';
    Object.keys(K.staediReitir).forEach(function (nafn) {
      var r = K.staediReitir[nafn];
      var ix = (r[2] - r[0]) * 0.13, iy = (r[3] - r[1]) * 0.12;
      var v = r[0] + ix, h = r[2] - ix, mx = (r[0] + r[2]) / 2;
      var upp = (r[1] + r[3]) / 2 < K.h / 2;              // efri röðin
      d += upp
        ? '<path d="M' + mx + ' ' + (r[1] + iy) + ' L' + h + ' ' + (r[3] - iy) +
          ' L' + v + ' ' + (r[3] - iy) + ' Z"/>'
        : '<path d="M' + mx + ' ' + (r[3] - iy) + ' L' + h + ' ' + (r[1] + iy) +
          ' L' + v + ' ' + (r[1] + iy) + ' Z"/>';
    });
    kjSvg.innerHTML = d;
  }

  /* --- samanburðarsleði: myndin til hægri klippist eftir stöðu hans ------- */
  document.querySelectorAll('[data-swipe]').forEach(function (sw) {
    var box = sw.querySelector('.swipe__box');
    var inp = sw.querySelector('.swipe__range');
    if (!box || !inp) return;
    var setja = function () { box.style.setProperty('--p', inp.value + '%'); };
    inp.addEventListener('input', setja);
    setja();
  });
})();
