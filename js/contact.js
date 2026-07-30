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

  /* Kom gesturinn af tiltekinni íbúð? Þá segir ?ibud til um hverja.
     Aðeins þessi fjórtán auðkenni eru tekin gild — annað úr slóðinni fer
     hvergi inn á síðuna. */
  const IBUD = (function () {
    const v = new URLSearchParams(location.search).get('ibud') || '';
    return /^(0[1-3]0[1-4]|040[12])$/.test(v) ? v : null;
  })();
  const bordi = $('#ctIbud');
  const skilabodReitur = $('#cf-message');
  // Hafi gesturinn snert reitinn er hann hans — líka þótt hann hafi hreinsað
  // hann. (Að lesa 'tómur' sem 'ósnertur' skilaði textanum aftur inn þegar
  // ritstýrður texti hleðst inn eða skipt er um tungumál.)
  let gesturSnerti = false;
  if (skilabodReitur) {
    skilabodReitur.addEventListener('input', () => { gesturSnerti = true; });
  }

  function fyllaSkilabod() {
    if (!IBUD || !skilabodReitur || gesturSnerti) return;
    skilabodReitur.value = t('ct.ibudSkilabod').replace('{ibud}', IBUD);
  }

  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach((el) => { const v = t(el.dataset.i18n); if (v !== undefined) el.textContent = v; });
    if (window.VB && window.VB.syncContactLinks) window.VB.syncContactLinks();
    const label = $('#langLabel'); if (label) label.textContent = lang === 'is' ? 'English' : 'Íslenska';
    if (IBUD && bordi) {
      bordi.innerHTML = '';
      bordi.appendChild(document.createTextNode(t('ct.ibudBordi') + ' '));
      const b = document.createElement('b');
      b.textContent = IBUD;
      bordi.appendChild(b);
      bordi.hidden = false;
    }
    fyllaSkilabod();
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
    const note = $('#cformNote');
    const btn  = $('.cform__submit', cform);
    const segja = (lykill, gerd) => {
      if (!note) return;
      note.textContent = t(lykill);
      note.dataset.gerd = gerd;          // 'ok' | 'villa' | 'bid'
      note.hidden = false;
    };
    // Varaleið ef sendingin næst ekki: opna póstforritið eins og áður, en
    // AÐEINS þá — og segja það hreint út í stað þess að þykjast hafa sent.
    const mailtoVaraleid = (nafn, netfang, simi, skilabod) => {
      const efni = IBUD ? 'Fyrirspurn – Vorbraut 14 – íbúð ' + IBUD : 'Fyrirspurn – Vorbraut 14';
      const texti = [
        IBUD ? 'Íbúð: ' + IBUD : null,
        'Nafn: ' + nafn,
        'Netfang: ' + netfang,
        simi ? 'Símanúmer: ' + simi : null,
        '',
        skilabod,
      ].filter((x) => x !== null).join('\n');
      window.location.href = 'mailto:miklaborg@miklaborg.is?subject='
        + encodeURIComponent(efni) + '&body=' + encodeURIComponent(texti);
    };

    cform.addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = (n) => (cform.elements[n] ? cform.elements[n].value.trim() : '');
      const nafn = val('name'), netfang = val('email'),
            simi = val('phone'), skilabod = val('message');
      if (!nafn || !netfang || !skilabod) return;

      if (btn) { btn.disabled = true; }
      segja('ct.sending', 'bid');

      try {
        // Forskoðunin (GitHub Pages) á sér ekkert þjónustufall — hún notar
        // fallið á framleiðslunni, sem hleypir aðeins henni að (CORS).
        const API = location.hostname.endsWith('github.io')
          ? 'https://www.vorbraut14.is/api/fyrirspurn' : '/api/fyrirspurn';
        const svar = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Íbúðin fer með sem eigið gildi. Væri hún aðeins í skilaboðatextanum
          // hyrfi hún um leið og gesturinn skrifar sitt eigið erindi.
          body: JSON.stringify({ nafn, netfang, simi, skilabod, ibud: IBUD || '',
                                 vefsida: val('vefsida') }),
        });
        const d = await svar.json().catch(() => ({}));

        if (svar.ok && d.ok) {
          segja('ct.sent', 'ok');            // sannarlega sent
          cform.reset();
        } else if (svar.status === 429) {
          segja('ct.ofhratt', 'villa');
        } else {
          // 404 (t.d. á GitHub Pages þar sem þjónustuföll keyra ekki),
          // 503 (lykill ekki uppsettur) eða 502 (Resend hafnaði) -> mailto
          segja('ct.mailto', 'villa');
          mailtoVaraleid(nafn, netfang, simi, skilabod);
        }
      } catch (_) {
        segja('ct.mailto', 'villa');
        mailtoVaraleid(nafn, netfang, simi, skilabod);
      } finally {
        if (btn) { btn.disabled = false; }
      }
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
