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
