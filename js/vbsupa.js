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
      headers: { apikey: key, Authorization: 'Bearer ' + key },
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
      headers: { apikey: key, Authorization: 'Bearer ' + key },
    });
    if (!r.ok) return null;
    const rows = await r.json();
    const ov = { is: {}, en: {}, img: {} };
    (rows || []).forEach((x) => {
      if (!x || !x.key || x.value == null || !String(x.value).length) return;
      if (x.lang === 'is' || x.lang === 'en') ov[x.lang][x.key] = x.value;
      else if (x.lang === 'img') ov.img[x.key] = x.value;
    });
    return ov;
  } catch (e) { return null; }
};

/* Setur uppfærðar myndir á <img data-img="..."> (úr lang='img' í content-töflunni). */
window.VB.applyImageOverrides = function (map) {
  if (!map) return;
  document.querySelectorAll('img[data-img]').forEach(function (im) {
    var k = im.getAttribute('data-img');
    if (map[k]) im.setAttribute('src', map[k]);
  });
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
