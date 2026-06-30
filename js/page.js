/* ==========================================================================
   Vorbraut 14 — létt skrifta fyrir undirsíður (sögukaflar)
   i18n + tungumálahnappur + farsíma-valmynd (burger) + nav-solid + reveal.
   ========================================================================== */
(function () {
  'use strict';
  const STR = (window.VB && window.VB.STR) || { is: {}, en: {} };
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  let lang = localStorage.getItem('vb-lang') || 'is';
  const t = (k) => (STR[lang] && STR[lang][k] != null ? STR[lang][k] : (STR.is[k] ?? k));

  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach((el) => { const v = t(el.dataset.i18n); if (v !== undefined) el.textContent = v; });
    if (window.VB && window.VB.syncContactLinks) window.VB.syncContactLinks();
    const label = $('#langLabel'); if (label) label.textContent = lang === 'is' ? 'English' : 'Íslenska';
  }
  const langBtn = $('#langBtn');
  if (langBtn) langBtn.addEventListener('click', () => {
    lang = lang === 'is' ? 'en' : 'is';
    localStorage.setItem('vb-lang', lang);
    applyLang();
  });

  /* farsíma-valmynd */
  const nav = $('#nav'), burger = $('#burger');
  const closeMenu = () => { nav && nav.classList.remove('open'); document.body.classList.remove('navopen'); };
  if (burger) burger.addEventListener('click', () => {
    nav.classList.toggle('open'); document.body.classList.toggle('navopen', nav.classList.contains('open'));
  });
  $$('#navmenu a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* nav verður dekkri þegar skrunað er niður af hetjumyndinni */
  const onScroll = () => { if (nav) nav.classList.toggle('nav--solid', (window.scrollY || document.documentElement.scrollTop) > 60); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* fade-up reveal */
  const ro = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
  }), { threshold: 0.12 });
  $$('.reveal').forEach((el, i) => { el.dataset.d = i % 3; ro.observe(el); });

  applyLang();
  // texta-yfirskriftir úr Supabase (CMS)
  if (window.VB && window.VB.getContent) window.VB.getContent().then((ov) => {
    if (!ov) return;
    if (window.VB.applyImageOverrides) window.VB.applyImageOverrides(ov.img);
    if (window.VB.applyLayoutOverrides) window.VB.applyLayoutOverrides(ov.layout);
    if (window.VB.applyContentOverrides(ov)) applyLang();
  }).catch(() => {});
})();
