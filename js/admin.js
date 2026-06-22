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

  /* ---------- texta-ritill (CMS): breyta öllum texta á vefnum ---------- */
  const STR = (window.VB && window.VB.STR) || { is: {}, en: {} };
  let overrides = { is: {}, en: {} };
  let contentBuilt = false;
  const esc = (s) => (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Kaflar í sömu röð og á vefnum: [lykilforskeyti, heiti, hvar það er, tengill]
  const SECTIONS = [
    ['nav',     'Valmynd (efst)',               'Tenglarnir efst á öllum síðum',           'index.html'],
    ['hero',    'Forsíða — Hetjan',             'Stóri titillinn og slagorðið efst',       'index.html'],
    ['stat',    'Forsíða — Lykiltölur',         '14 íbúðir · 4 hæðir · 16 bílastæði …',    'index.html'],
    ['cta',     'Hnappar',                      '„Skoða íbúðir", „Hafa samband" o.fl.',    'index.html'],
    ['sel',     'Forsíða — Smellanleg bygging', 'Textinn við gagnvirku bygginguna',        'index.html'],
    ['facade',  'Bygging — Aftan/Framan',       'Takkarnir við bygginguna',                'index.html'],
    ['apt',     'Íbúðir — kynning',             'Inngangstexti að íbúðalistanum',          'index.html#ibudir'],
    ['apts',    'Íbúðalisti — fyrirsögn',       'Yfir töflunni',                           'index.html#ibudir'],
    ['list',    'Íbúðalisti — ýmislegt',        'Fjöldi og „engin íbúð" skilaboð',         'index.html#ibudir'],
    ['filter',  'Íbúðalisti — síur',            'Sleðar og síu-merki',                     'index.html#ibudir'],
    ['feat',    'Íbúðalisti — eiginleikar',     'Hakreitir (bílastæði, pottur …)',         'index.html#ibudir'],
    ['col',     'Íbúðatafla — dálkahausar',     'Íbúð · Hæð · Stærð · Verð …',             'index.html#ibudir'],
    ['unit',    'Herbergjafjöldi',              '„2ja herb.", „3ja herb." …',              'index.html#ibudir'],
    ['out',     'Útisvæði',                     'Verönd / svalir / þaksvalir',             'index.html#ibudir'],
    ['lbl',     'Merkimiðar',                   'Hæð / herbergi',                          'index.html#ibudir'],
    ['spec',    'Íbúða-gluggi — upplýsingar',   'Stærð, verð, lofthæð … í glugganum',      'index.html#ibudir'],
    ['modal',   'Íbúða-gluggi — annað',         'Merkingar í íbúða-glugganum',             'index.html#ibudir'],
    ['type',    'Íbúðagerðir',                  '2ja / fjölskyldu / penthouse lýsingar'],
    ['des',     'Kafli — Arkitektúr',           'Arkitektúr-síðan',                        'arkitektur.html'],
    ['nb',      'Kafli — Húsið',                'Húsið-síðan',                             'husid.html'],
    ['loc',     'Kafli — Hverfið',              'Hverfið-síðan',                           'hverfid.html'],
    ['q',       'Algengar spurningar',          'Spurt og svarað'],
    ['sellers', 'Söluaðilar — fyrirsögn',       'Fyrirsögn + Miklaborg-merki',             'index.html#soluadilar'],
    ['ag',      'Söluaðilar — fólkið',          'Nöfn, titlar, símar og netföng',          'index.html#soluadilar'],
    ['ct',      'Hafa samband — síða',          'Fyrirspurnar-formið og textar',           'hafa-samband.html'],
    ['pager',   'Kafla-fletti',                 '„Fyrri / Næsti" neðst á köflum'],
    ['foot',    'Footer (neðst)',               'Heimilisfang og tengiliður neðst',        'index.html'],
    ['brand',   'Vörumerki',                    '„VORBRAUT 14" merkið'],
    ['scroll',  'Skruna-merki',                 '„Skruna" vísbending'],
  ];
  const SECMAP = {};
  SECTIONS.forEach((s, i) => { SECMAP[s[0]] = { title: s[1], where: s[2], url: s[3], order: i }; });

  const ROLES = {
    title: 'Fyrirsögn', kicker: 'Yfir-merki', kick: 'Yfir-merki', body: 'Meginmál', lead: 'Inngangur',
    sub: 'Undirtexti', tag: 'Slagorð', hint: 'Vísbending', note: 'Athugasemd', name: 'Nafn',
    phone: 'Sími', email: 'Netfang', pull: 'Tilvitnun', desc: 'Lýsing', size: 'Stærð', floor: 'Hæð',
    rooms: 'Herbergi', logo: 'Merki', count: 'Teljari', empty: 'Tómt-skilaboð', architect: 'Arkitekt',
    available: 'Til sölu', reserved: 'Frátekin', sold: 'Selt', parking: 'Bílastæði', storage: 'Geymsla',
    ceiling: 'Lofthæð', balcony: 'Svalir', front: 'Framan', back: 'Aftan', prev: 'Fyrri', next: 'Næsti',
    home: 'Forsíða', view: 'Skoða', reset: 'Hreinsa', all: 'Allar', book: 'Bóka', contact: 'Samband',
    no: 'Númer', landnr: 'Landeignarnúmer', addr1: 'Heimilisfang (lína 1)', addr2: 'Heimilisfang (lína 2)',
    brand1: 'Merki — lína 1', brand2: 'Merki — lína 2',
  };
  // sömu enska orðin þýða annað eftir kafla (t.d. "title" = starfsheiti hjá söluaðilum)
  const ROLE_OVERRIDE = { ag: { title: 'Starfsheiti' } };
  const humanize = (s) => s.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  function fieldLabel(key) {
    const seg = key.split('.').pop();
    const gk = groupKeyOf(key);
    if (ROLE_OVERRIDE[gk] && ROLE_OVERRIDE[gk][seg]) return ROLE_OVERRIDE[gk][seg];
    if (ROLES[seg]) return ROLES[seg];
    if (/^\d+$/.test(seg)) return 'Liður ' + seg;
    if (/^b\d+$/.test(seg)) return 'Texti ' + seg.slice(1);
    if (/^c\d+$/.test(seg)) return 'Liður ' + seg.slice(1);
    if (seg === 't') return 'Titill';
    if (seg === 'b') return 'Texti';
    return humanize(seg);
  }
  function groupKeyOf(k) {
    if (k.indexOf('.') < 0) return k;
    const p = k.split('.');
    if (p[0] === 'st' && p.length >= 2) return 'st.' + p[1];   // sögukaflar -> undirkaflar
    return p[0];
  }
  function groupTitle(gk) {
    if (SECMAP[gk]) return SECMAP[gk].title;
    const t = STR.is[gk + '.title'] || STR.is[gk + '.t'] || STR.is[gk + '.name'];
    return t ? 'Kafli — ' + t : humanize(gk);
  }
  const groupWhere = (gk) => (SECMAP[gk] ? SECMAP[gk].where : 'Texti á vefnum');
  const groupUrl = (gk) => (SECMAP[gk] ? SECMAP[gk].url : '');
  const groupOrder = (gk) => (SECMAP[gk] ? SECMAP[gk].order : 900 + gk.charCodeAt(0) / 1000);

  async function buildContentEditor() {
    const list = $('#contentList'); if (!list) return;
    list.innerHTML = '<p class="ad__sub">Sæki texta…</p>';
    overrides = { is: {}, en: {} };
    const { data } = await supa.from('content').select('key,lang,value');
    (data || []).forEach((r) => { if (r && (r.lang === 'is' || r.lang === 'en')) overrides[r.lang][r.key] = r.value; });

    const keys = [...new Set([...Object.keys(STR.is || {}), ...Object.keys(STR.en || {})])];
    const groups = {};
    keys.forEach((k) => { const gk = groupKeyOf(k); (groups[gk] = groups[gk] || []).push(k); });
    const gkeys = Object.keys(groups).sort((a, b) => groupOrder(a) - groupOrder(b));

    let html = '';
    gkeys.forEach((gk) => {
      const rows = groups[gk];
      const url = groupUrl(gk);
      const link = url ? `<a class="cgrp__see" href="${url}" target="_blank" rel="noopener" title="Skoða á vefnum">↗</a>` : '';
      let body = '';
      rows.forEach((k) => {
        const isDef = (STR.is && STR.is[k]) || '', enDef = (STR.en && STR.en[k]) || '';
        const isO = overrides.is[k] != null, enO = overrides.en[k] != null;
        const isV = isO ? overrides.is[k] : isDef, enV = enO ? overrides.en[k] : enDef;
        const search = esc((k + ' ' + isDef + ' ' + isV + ' ' + fieldLabel(k)).toLowerCase());
        body += `<div class="crow" data-search="${search}">
          <div class="crow__label">${esc(fieldLabel(k))}<span class="crow__key">${esc(k)}</span></div>
          <div class="crow__fields">
            <div class="cfield${isO ? ' is-override' : ''}"><label>Íslenska</label><textarea data-key="${esc(k)}" data-lang="is" rows="2">${esc(isV)}</textarea></div>
            <div class="cfield${enO ? ' is-override' : ''}"><label>English</label><textarea data-key="${esc(k)}" data-lang="en" rows="2">${esc(enV)}</textarea></div>
          </div></div>`;
      });
      html += `<section class="cgrp">
        <button type="button" class="cgrp__head" aria-expanded="false">
          <span class="cgrp__chev">›</span>
          <span class="cgrp__title">${esc(groupTitle(gk))}</span>
          <span class="cgrp__where">${esc(groupWhere(gk))}</span>
          <span class="cgrp__count">${rows.length}</span>${link}
        </button>
        <div class="cgrp__body" hidden>${body}</div>
      </section>`;
    });
    list.innerHTML = html;
    $$('#contentList .cgrp__head', list).forEach((h) => h.addEventListener('click', (e) => {
      if (e.target.closest('.cgrp__see')) return;
      const open = h.getAttribute('aria-expanded') === 'true';
      h.setAttribute('aria-expanded', open ? 'false' : 'true');
      h.nextElementSibling.hidden = open;
    }));
    $$('#contentList textarea', list).forEach((ta) => ta.addEventListener('change', () => saveContent(ta)));
  }

  async function saveContent(ta) {
    const key = ta.dataset.key, l = ta.dataset.lang;
    const def = (STR[l] && STR[l][key]) || '';
    const val = ta.value;
    const field = ta.closest('.cfield');
    if (val.trim() === '' || val === def) {
      const { error } = await supa.from('content').delete().eq('key', key).eq('lang', l);
      if (error) { toast('Villa: ' + error.message, true); return; }
      delete overrides[l][key];
      if (val !== def) ta.value = def;            // tæmt -> sýna sjálfgefið
      if (field) field.classList.remove('is-override');
      toast('Sett aftur í sjálfgefið');
    } else {
      const { error } = await supa.from('content')
        .upsert({ key, lang: l, value: val, updated_at: new Date().toISOString() }, { onConflict: 'key,lang' });
      if (error) { toast('Villa: ' + error.message, true); return; }
      overrides[l][key] = val;
      if (field) field.classList.add('is-override');
      toast('Vistað');
    }
  }

  // tabs
  $$('.ad__tab').forEach((b) => b.addEventListener('click', () => {
    const tab = b.dataset.tab;
    $$('.ad__tab').forEach((x) => x.classList.toggle('on', x === b));
    const va = $('#view-apts'), vc = $('#view-content');
    if (va) va.hidden = tab !== 'apts';
    if (vc) vc.hidden = tab !== 'content';
    if (tab === 'content' && !contentBuilt) { contentBuilt = true; buildContentEditor(); }
  }));

  // leit
  const cSearch = $('#cSearch');
  if (cSearch) cSearch.addEventListener('input', () => {
    const q = cSearch.value.trim().toLowerCase();
    $$('#contentList .crow').forEach((r) => { r.hidden = !!q && r.dataset.search.indexOf(q) === -1; });
    $$('#contentList .cgrp').forEach((g) => {
      const head = $('.cgrp__head', g), body = $('.cgrp__body', g);
      if (q) {
        const any = $$('.crow:not([hidden])', g).length > 0;
        g.hidden = !any;
        if (any) { head.setAttribute('aria-expanded', 'true'); body.hidden = false; }
      } else {
        g.hidden = false; head.setAttribute('aria-expanded', 'false'); body.hidden = true;
      }
    });
  });

  /* ---------- núverandi seta? ---------- */
  supa.auth.getSession().then(({ data }) => {
    const s = data && data.session;
    if (s && isAllowed(s.user && s.user.email)) showPanel(s);
    else if (s) { supa.auth.signOut().then(showLogin); }
    else showLogin();
  });
})();
