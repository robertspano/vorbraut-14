/* ==========================================================================
   Vorbraut 14 — stöðustjórnun (admin), DOMAIN-aðgangur.
   Aðeins @miklaborg.is netföng: notandi slær inn netfang -> fær kóða í tölvupóst
   -> staðfestir kóða -> kominn inn. Engin lykilorð. Breytingar varðar með RLS
   (aðeins @miklaborg.is má skrifa). Supabase email-OTP.
   ========================================================================== */
(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const URL = (window.VB && window.VB.SUPABASE_URL) || '';
  const KEY = (window.VB && window.VB.SUPABASE_ANON_KEY) || '';
  const elLogin = $('#login'), elPanel = $('#panel'), elNot = $('#notconf');
  const elMsg = $('#msg'), elList = $('#aptlist'), elWho = $('#who'), elLogout = $('#logout');

  if (!URL || !KEY || !window.supabase) { if (elNot) elNot.hidden = false; return; }
  const supa = window.supabase.createClient(URL, KEY);

  const DOMAIN = 'miklaborg.is';
  const ALLOW = ['robertstefansson2404@gmail.com'];   // auka-aðgangur (prófun) — utan @miklaborg.is
  const isAllowed = (email) => {
    const e = (email || '').trim().toLowerCase();
    return ALLOW.indexOf(e) !== -1 || new RegExp('@' + DOMAIN.replace('.', '\\.') + '$', 'i').test(e);
  };

  const STATUSES = [['available', 'Til sölu'], ['reserved', 'Með fyrirvara'], ['sold', 'Selt']];
  const label = (v) => (STATUSES.find((s) => s[0] === v) || [, v])[1];

  function msg(m, isErr, isInfo) {
    elMsg.textContent = m || '';
    elMsg.classList.toggle('info', !!isInfo && !isErr);
  }
  function toast(m, err) {
    const t = $('#toast'); if (!t) return;
    t.textContent = m; t.classList.toggle('err', !!err); t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---------- innskráning: email-OTP ---------- */
  let pendingEmail = '';
  function showLogin() { elLogin.hidden = false; elPanel.hidden = true; elLogout.hidden = true; }

  $('#sendCode').addEventListener('click', async () => {
    const email = ($('#email').value || '').trim().toLowerCase();
    if (!isAllowed(email)) { msg('Aðeins netföng sem enda á @' + DOMAIN + ' hafa aðgang.'); return; }
    const btn = $('#sendCode'); btn.disabled = true; btn.textContent = 'Sendi…';
    const { error } = await supa.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    btn.disabled = false; btn.textContent = 'Senda kóða';
    if (error) { msg('Villa við sendingu: ' + error.message); return; }
    pendingEmail = email;
    $('#step-email').hidden = true; $('#step-code').hidden = false; $('#code').focus();
    msg('Kóði sendur á ' + email + '. Sláðu hann inn hér (athugaðu ruslpóst ef hann birtist ekki).', false, true);
  });

  $('#verifyCode').addEventListener('click', async () => {
    const token = ($('#code').value || '').trim();
    if (!token) { msg('Sláðu inn kóðann úr tölvupóstinum.'); return; }
    const btn = $('#verifyCode'); btn.disabled = true; btn.textContent = 'Skrái inn…';
    const { data, error } = await supa.auth.verifyOtp({ email: pendingEmail, token, type: 'email' });
    btn.disabled = false; btn.textContent = 'Staðfesta og skrá inn';
    if (error) { msg('Rangur eða útrunninn kóði — reyndu aftur.'); return; }
    if (!isAllowed(data.user && data.user.email)) { await supa.auth.signOut(); msg('Aðeins @' + DOMAIN + ' hefur aðgang.'); return; }
    showPanel(data.session);
  });

  $('#code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#verifyCode').click(); });
  $('#email').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#sendCode').click(); });
  $('#backEmail').addEventListener('click', () => { $('#step-code').hidden = true; $('#step-email').hidden = false; msg(''); });

  /* ---------- innskráning: lykilorð (engin tölvupóstur — fyrir prófun/eiganda) ---------- */
  $('#usePw').addEventListener('click', () => { $('#mode-code').hidden = true; $('#mode-pw').hidden = false; msg(''); $('#pw').focus(); });
  $('#useCode').addEventListener('click', () => { $('#mode-pw').hidden = true; $('#mode-code').hidden = false; msg(''); });
  $('#pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#pwLogin').click(); });
  $('#pwLogin').addEventListener('click', async () => {
    const email = ($('#email').value || '').trim().toLowerCase();
    const password = $('#pw').value;
    if (!isAllowed(email)) { msg('Aðeins netföng sem enda á @' + DOMAIN + ' hafa aðgang.'); return; }
    if (!password) { msg('Sláðu inn lykilorðið.'); return; }
    const btn = $('#pwLogin'); btn.disabled = true; btn.textContent = 'Skrái inn…';
    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    btn.disabled = false; btn.textContent = 'Skrá inn';
    if (error) { msg('Innskráning mistókst: ' + error.message); return; }
    showPanel(data.session);
  });
  elLogout.addEventListener('click', async () => { await supa.auth.signOut(); location.reload(); });

  /* ---------- stjórnborð ---------- */
  async function showPanel(session) {
    elLogin.hidden = true; elNot.hidden = true; elPanel.hidden = false; elLogout.hidden = false;
    if (elWho) elWho.textContent = session.user.email;
    const { data } = await supa.from('apartments').select('id,status');
    const cur = {}; (data || []).forEach((r) => { cur[r.id] = r.status; });
    const apts = (window.VB && window.VB.APARTMENTS) || [];
    elList.innerHTML = apts.map((a) => {
      const st = cur[a.id] || a.status || 'available';
      const segs = STATUSES.map(([v, l]) =>
        `<button class="ad__seg ${v}${st === v ? ' on' : ''}" data-id="${a.id}" data-st="${v}">${l}</button>`).join('');
      return `<div class="ad__row"><div class="ad__rowid">Íbúð ${a.id}</div>` +
             `<div class="ad__rowmeta">${a.area} m² · ${a.rooms} herb. · ${a.floor}. hæð</div>` +
             `<div class="ad__segs">${segs}</div></div>`;
    }).join('');
    $$('.ad__seg', elList).forEach((b) => b.addEventListener('click', () => setStatus(b)));
  }

  async function setStatus(btn) {
    const id = btn.dataset.id, st = btn.dataset.st;
    const group = btn.parentElement;
    const prev = $$('.ad__seg.on', group)[0];
    $$('.ad__seg', group).forEach((x) => x.classList.toggle('on', x === btn)); // bjartsýn uppfærsla
    const { error } = await supa.from('apartments')
      .update({ status: st, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      $$('.ad__seg', group).forEach((x) => x.classList.toggle('on', x === prev)); // afturkalla
      toast('Villa: ' + error.message, true);
    } else {
      toast('Vistað · Íbúð ' + id + ' → ' + label(st));
    }
  }

  /* ---------- núverandi seta? ---------- */
  supa.auth.getSession().then(({ data }) => {
    const s = data && data.session;
    if (s && isAllowed(s.user && s.user.email)) showPanel(s);
    else if (s) { supa.auth.signOut().then(showLogin); }
    else showLogin();
  });
})();
