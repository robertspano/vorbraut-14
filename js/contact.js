/* ==========================================================================
   Vorbraut 14 — Hafa samband (sér síða)
   Létt skrifta: i18n + tungumálahnappur + fyrirspurnarform (mailto, ekkert bakendi).
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

  // Fyrirspurnarform — opnar tölvupóstforrit notandans með útfylltri fyrirspurn.
  const cform = $('#contactForm');
  if (cform) {
    cform.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = (n) => (cform.elements[n] ? cform.elements[n].value.trim() : '');
      const name = val('name'), email = val('email'), phone = val('phone'), message = val('message');
      const subj = 'Fyrirspurn – Vorbraut 14';
      const body = [
        `Nafn: ${name}`,
        `Netfang: ${email}`,
        phone ? `Símanúmer: ${phone}` : null,
        '',
        message,
      ].filter((x) => x !== null).join('\n');
      window.location.href = `mailto:miklaborg@miklaborg.is?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
      const note = $('#cformNote');
      if (note) { note.textContent = t('ct.sent'); note.hidden = false; }
      cform.reset();
    });
  }

  /* farsíma-valmynd (burger) + nav-solid við skrun */
  const nav = $('#nav'), burger = $('#burger');
  const closeMenu = () => { if (nav) nav.classList.remove('open'); document.body.classList.remove('navopen'); };
  if (burger) burger.addEventListener('click', () => {
    nav.classList.toggle('open'); document.body.classList.toggle('navopen', nav.classList.contains('open'));
  });
  $$('#navmenu a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  const onNavScroll = () => { if (nav) nav.classList.toggle('nav--solid', (window.scrollY || document.documentElement.scrollTop) > 60); };
  window.addEventListener('scroll', onNavScroll, { passive: true });
  onNavScroll();

  applyLang();
  // texta-yfirskriftir úr Supabase (CMS)
  if (window.VB && window.VB.getContent) window.VB.getContent().then((ov) => {
    if (!ov) return;
    if (window.VB.applyImageOverrides) window.VB.applyImageOverrides(ov.img);
    if (window.VB.applyLayoutOverrides) window.VB.applyLayoutOverrides(ov.layout);
    if (window.VB.applyContentOverrides(ov)) applyLang();
  }).catch(() => {});
})();
