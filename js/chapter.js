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
      if (film.dataset.on) return;
      film.dataset.on = '1';
      film.preload = 'auto';
      film.load();
      var p = film.play();
      if (p && p.catch) p.catch(function () {});   // browser hafnar sjálfspilun -> poster stendur
    };
    var fio = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { start(); fio.disconnect(); } });
    }, { rootMargin: '200px 0px' });
    fio.observe(film);
    /* varaleið: sums staðar er IntersectionObserver settur á pásu (falinn flipi,
       sparnaðarhamur). Skrunhandfangið er alltaf keyrt, svo það sér um afganginn. */
    var nearby = function () {
      if (film.dataset.on) { window.removeEventListener('scroll', nearby); return; }
      var r = film.getBoundingClientRect();
      if (r.top < window.innerHeight + 200 && r.bottom > -200) { start(); fio.disconnect(); }
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
