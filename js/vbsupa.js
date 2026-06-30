/* ==========================================================================
   Vorbraut 14 — opinber lestur á stöðu íbúða úr Supabase (engin innskráning).
   Notað á forsíðunni til að lita facade-svæðin (grænt/gult/rautt) eftir stöðu.
   Skilar {} ef Supabase er óstillt eða villa kemur upp -> data.js sjálfgildi gilda.
   ========================================================================== */
window.VB = window.VB || {};
window.VB.getStatuses = async function () {
  const url = (window.VB.SUPABASE_URL || '').replace(/\/$/, '');
  const key = window.VB.SUPABASE_ANON_KEY || '';
  if (!url || !key) return {};
  try {
    const r = await fetch(url + '/rest/v1/apartments?select=id,status', {
      headers: { apikey: key, Authorization: 'Bearer ' + key }, cache: 'no-store',
    });
    if (!r.ok) return {};
    const rows = await r.json();
    const m = {};
    (rows || []).forEach((x) => { if (x && x.id) m[x.id] = x.status; });
    return m;
  } catch (e) { return {}; }
};

/* ----- texta-yfirskriftir (CMS) — opinber lestur úr töflunni public.content -----
   Skilar {is:{lykill:gildi}, en:{...}} eða null ef óstillt/villa. Tóm gildi hunsuð
   svo sjálfgildið í content.js gildi áfram. */
window.VB.getContent = async function () {
  const url = (window.VB.SUPABASE_URL || '').replace(/\/$/, '');
  const key = window.VB.SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  try {
    const r = await fetch(url + '/rest/v1/content?select=key,lang,value', {
      headers: { apikey: key, Authorization: 'Bearer ' + key }, cache: 'no-store',
    });
    if (!r.ok) return null;
    const rows = await r.json();
    const BLANK = window.VB.BLANK || '__VB_BLANK__';
    const ov = { is: {}, en: {}, img: {}, apt: {}, layout: {} };
    (rows || []).forEach((x) => {
      if (!x || !x.key || x.value == null) return;
      var v = String(x.value);
      if (x.lang === 'is' || x.lang === 'en') {
        if (v === BLANK) v = '';          // vísvitandi tómt -> sýna ekkert á vefnum
        else if (!v.length) return;        // óvart tómt -> nota sjálfgildi
        ov[x.lang][x.key] = v;
      } else if (!v.length) {
        return;                            // tölur/myndir/útlit: tóm gildi hunsuð
      } else if (x.lang === 'img') ov.img[x.key] = v;
      else if (x.lang === 'apt') ov.apt[x.key] = v;
      else if (x.lang === 'layout') ov.layout[x.key] = v;
    });
    return ov;
  } catch (e) { return null; }
};

/* Útlit: fela/færa hluti sem merktir eru data-block="..." (úr lang='layout').
   value='hidden' -> falinn.  key sem endar á ':order', value=JSON listi af lyklum -> röð barna. */
window.VB.applyLayoutOverrides = function (map) {
  if (!map) return;
  var find = function (k) { try { return document.querySelector('[data-block="' + (window.CSS && CSS.escape ? CSS.escape(k) : k) + '"]'); } catch (e) { return null; } };
  Object.keys(map).forEach(function (k) {
    if (/:order$/.test(k)) return;
    if (map[k] === 'hidden') { var el = find(k); if (el) el.style.display = 'none'; }
  });
  Object.keys(map).forEach(function (k) {
    if (!/:order$/.test(k)) return;
    var parent = find(k.replace(/:order$/, '')); if (!parent) return;
    var order; try { order = JSON.parse(map[k]); } catch (e) { return; }
    if (!Array.isArray(order)) return;
    var els = order.map(find).filter(function (e) { return e && e.parentNode === parent; });
    if (els.length < 2) return;
    // akkeri = hnúturinn á eftir síðasta merkta barni (heldur ómerktum systkinum á sínum stað)
    var last = els[0];
    els.forEach(function (e) { if (last.compareDocumentPosition(e) & 4) last = e; });
    var anchor = last.nextSibling;
    els.forEach(function (e) { parent.insertBefore(e, anchor); });
  });
};

/* Setur uppfærðar myndir á <img data-img="..."> (úr lang='img' í content-töflunni). */
window.VB.applyImageOverrides = function (map) {
  if (!map) return;
  document.querySelectorAll('img[data-img]').forEach(function (im) {
    var k = im.getAttribute('data-img');
    if (map[k]) im.setAttribute('src', map[k]);
  });
};

/* Uppfærir íbúðagögn (stærð/herbergi/verð…) úr lang='apt' (lyklar: "<id>.<reitur>").
   Breytir window.VB.APARTMENTS á staðnum -> tafla, smá-gluggi og íbúða-gluggi sýna nýju gildin. */
window.VB.applyAptOverrides = function (map) {
  if (!map || !window.VB.APARTMENTS) return false;
  var n = 0;
  Object.keys(map).forEach(function (k) {
    var dot = k.indexOf('.'); if (dot < 0) return;
    var id = k.slice(0, dot), field = k.slice(dot + 1), raw = map[k];
    var a = window.VB.APARTMENTS.find(function (x) { return x.id === id; });
    if (!a) return;
    if (field === 'area' || field === 'balcony') { var f = parseFloat(String(raw).replace(',', '.')); if (!isNaN(f)) { a[field] = f; n++; } }
    else if (field === 'rooms' || field === 'beds' || field === 'price') { var i = parseInt(String(raw).replace(/[^\d]/g, ''), 10); if (!isNaN(i)) { a[field] = i; n++; } }
    else { a[field] = raw; n++; }
  });
  return n > 0;
};

/* Bræðir yfirskriftir inn í window.VB.STR (sama hlut -> t() sér breytingarnar). */
window.VB.applyContentOverrides = function (ov) {
  if (!ov || !window.VB.STR) return false;
  let n = 0;
  ['is', 'en'].forEach((L) => {
    if (!ov[L] || !window.VB.STR[L]) return;
    Object.keys(ov[L]).forEach((k) => { window.VB.STR[L][k] = ov[L][k]; n++; });
  });
  return n > 0;
};

/* Heldur tel:/mailto: tenglum í takt við ritstýranlegan texta (data-i18n).
   Kallað eftir applyLang svo breytt símanúmer/netfang virki líka sem tenglar. */
window.VB.syncContactLinks = function (root) {
  (root || document).querySelectorAll('a[data-i18n][href^="mailto:"], a[data-i18n][href^="tel:"]').forEach(function (a) {
    var txt = (a.textContent || '').trim();
    if (!txt) return;
    if (txt.indexOf('@') >= 0) a.setAttribute('href', 'mailto:' + txt);
    else { var d = txt.replace(/\D/g, '').replace(/^354/, ''); if (d) a.setAttribute('href', 'tel:+354' + d); }
  });
};
