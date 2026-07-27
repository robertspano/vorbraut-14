/* ==========================================================================
   Vorbraut 14 — SNIÐIÐ: lesframvinda á hæðarásinni + örvaflakk milli kafla.
   Keyrir Á EFTIR page.js. Snertir engan [data-i18n] hnút.
   ========================================================================== */
(function () {
  'use strict';
  var chap = document.querySelector('.chap');
  if (!chap) return;

  /* --- lesframvinda (0→1) sem CSS-breyta á .chap ------------------------- */
  var tick = false;
  function measure() {
    tick = false;
    var doc = document.documentElement;
    var max = (doc.scrollHeight - window.innerHeight) || 1;
    var p = (window.scrollY || doc.scrollTop) / max;
    chap.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(4));
  }
  function onScroll() { if (!tick) { tick = true; requestAnimationFrame(measure); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  setTimeout(measure, 0);

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
  var reveal = [].slice.call(document.querySelectorAll('.chap__plate,.chap__ledger,.chap__index'));
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
})();
