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

  /* ---------- innskráning: einfaldur aðgangskóði ---------- */
  const CODE = '1111';
  function showLogin() { elLogin.hidden = false; elPanel.hidden = true; elLogout.hidden = true; const c = $('#code'); if (c) c.focus(); }
  function tryEnter() {
    const v = ($('#code').value || '').trim();
    if (v === CODE) { try { localStorage.setItem('vb-admin', '1'); } catch (e) {} msg(''); showPanel(); }
    else { msg('Rangur kóði.'); }
  }
  if ($('#enter')) $('#enter').addEventListener('click', tryEnter);
  if ($('#code')) $('#code').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryEnter(); });
  elLogout.addEventListener('click', () => { try { localStorage.removeItem('vb-admin'); } catch (e) {} location.reload(); });

  /* ---------- stjórnborð ---------- */
  async function showPanel() {
    elLogin.hidden = true; elNot.hidden = true; elPanel.hidden = false; elLogout.hidden = false;
    if (elWho) elWho.textContent = 'Stjórnandi';
    await ensureOverrides();
    const sn = $('#setupNote'); if (sn) sn.hidden = !contentTableMissing;
    const cb = $('#copySql');
    if (cb && !cb._w) { cb._w = 1; cb.addEventListener('click', () => { const t = ($('#setupSql') || {}).textContent || ''; if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('SQL afritað'), () => toast('Gat ekki afritað', true)); }); }
    const { data } = await supa.from('apartments').select('id,status');
    const cur = {}; (data || []).forEach((r) => { cur[r.id] = r.status; });
    const apts = (window.VB && window.VB.APARTMENTS) || [];
    const fv = (id, f, d) => { const v = aptOv[id + '.' + f]; return (v != null && v !== '') ? v : (d != null ? d : ''); };
    elList.innerHTML = apts.map((a) => {
      const st = cur[a.id] || a.status || 'available';
      const segs = STATUSES.map(([v, l]) =>
        `<button class="ad__seg ${v}${st === v ? ' on' : ''}" data-id="${a.id}" data-st="${v}">${l}</button>`).join('');
      return `<div class="ad__row ad__row--apt">
        <div class="ad__rowid">Íbúð ${a.id}<span class="ad__rowsub">${a.floor}. hæð</span></div>
        <div class="ad__aptf">
          <label>Stærð (m²)<input type="text" inputmode="decimal" data-apt="${a.id}" data-field="area" value="${fv(a.id, 'area', a.area)}"></label>
          <label>Herb.<input type="text" inputmode="numeric" data-apt="${a.id}" data-field="rooms" value="${fv(a.id, 'rooms', a.rooms)}"></label>
          <label>Verð (kr)<input type="text" inputmode="numeric" data-apt="${a.id}" data-field="price" value="${fv(a.id, 'price', a.price != null ? a.price : '')}"></label>
        </div>
        <div class="ad__segs">${segs}</div>
      </div>`;
    }).join('');
    $$('.ad__seg', elList).forEach((b) => b.addEventListener('click', () => setStatus(b)));
    $$('.ad__aptf input', elList).forEach((inp) => inp.addEventListener('change', () => saveAptField(inp)));
  }

  async function saveAptField(inp) {
    const id = inp.dataset.apt, field = inp.dataset.field;
    const apt = ((window.VB && window.VB.APARTMENTS) || []).find((x) => x.id === id);
    const def = apt && apt[field] != null ? String(apt[field]) : '';
    const val = (inp.value || '').trim();
    const res = await saveValue(id + '.' + field, 'apt', val, def);
    if (res === 'reverted') { inp.value = def; delete aptOv[id + '.' + field]; }
    else if (res === true) aptOv[id + '.' + field] = val;
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
  const BLANK = (window.VB && window.VB.BLANK) || '__VB_BLANK__';   // vísvitandi tómur texti
  let overrides = { is: {}, en: {} };
  let contentBuilt = false, veBuilt = false, contentTabInit = false, overridesLoaded = false, pendingImg = null, aptOv = {}, layoutOv = {}, undoStack = [], contentTableMissing = false;
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

  const debounce = (fn, ms) => { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms); }; };

  async function buildContentEditor() {
    const list = $('#contentList'); if (!list) return;
    list.innerHTML = '<p class="ad__sub">Sæki texta…</p>';
    await ensureOverrides();

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
    $$('#contentList textarea', list).forEach((ta) => {
      const deb = debounce(() => saveContent(ta), 700);
      ta.addEventListener('input', deb);     // vistast sjálfkrafa á meðan þú skrifar
      ta.addEventListener('change', () => saveContent(ta));
    });
  }

  async function ensureOverrides() {
    if (overridesLoaded) return;
    overridesLoaded = true;
    const { data, error } = await supa.from('content').select('key,lang,value');
    contentTableMissing = !!error;
    overrides = { is: {}, en: {} }; aptOv = {}; layoutOv = {};
    (data || []).forEach((r) => {
      if (!r) return;
      if (r.lang === 'is' || r.lang === 'en') overrides[r.lang][r.key] = (r.value === BLANK ? '' : r.value);
      else if (r.lang === 'apt') aptOv[r.key] = r.value;
      else if (r.lang === 'layout') layoutOv[r.key] = r.value;
    });
  }

  // útlits-yfirskrift (fela/röð) -> content lang='layout'
  async function saveLayout(key, val) {
    const res = await saveValue(key, 'layout', val, '');
    if (res === 'reverted') delete layoutOv[key]; else if (res === true) layoutOv[key] = val;
    return res;
  }

  /* ---------- afturkalla (undo) ---------- */
  function pushUndo(label, fn) { undoStack.push({ label: label, fn: fn }); updateUndo(); }
  function updateUndo() { const b = $('#veUndo'); if (b) { b.disabled = undoStack.length === 0; b.textContent = '↩ Afturkalla' + (undoStack.length ? ' (' + undoStack.length + ')' : ''); } }
  async function doUndo() {
    const a = undoStack.pop(); if (!a) { updateUndo(); return; }
    try { await a.fn(); } catch (e) {}
    updateUndo(); toast('Afturkallað' + (a.label ? ': ' + a.label : ''));
  }

  // kjarni: vista -> Supabase. Skilar 'blanked' | 'reverted' | true | false.
  async function saveValue(key, lang, val, def) {
    if (!overrides[lang]) overrides[lang] = {};
    const isText = (lang === 'is' || lang === 'en');
    // Texti tæmdur vísvitandi (sjálfgildið er ekki sjálft tómt) -> vista sem „tómt"
    // svo hann komi EKKI sjálfkrafa aftur. Afturkalla skilar honum.
    if (isText && val.trim() === '' && (def == null ? '' : String(def)).trim() !== '') {
      const { error } = await supa.from('content')
        .upsert({ key, lang, value: BLANK, updated_at: new Date().toISOString() }, { onConflict: 'key,lang' });
      if (error) { toast('Villa: ' + error.message, true); return false; }
      overrides[lang][key] = '';
      toast('✓ Tómt — sést ekki á vefnum');
      return 'blanked';
    }
    if (val.trim() === '' || val === def) {
      const { error } = await supa.from('content').delete().eq('key', key).eq('lang', lang);
      if (error) { toast('Villa: ' + error.message, true); return false; }
      delete overrides[lang][key];
      toast('Sett aftur í sjálfgefið');
      return 'reverted';
    }
    const { error } = await supa.from('content')
      .upsert({ key, lang, value: val, updated_at: new Date().toISOString() }, { onConflict: 'key,lang' });
    if (error) { toast('Villa: ' + error.message, true); return false; }
    overrides[lang][key] = val;
    toast('✓ Vistað — birtist á vefnum');
    return true;
  }

  async function saveContent(ta) {
    const key = ta.dataset.key, l = ta.dataset.lang;
    const def = (STR[l] && STR[l][key]) || '';
    const field = ta.closest('.cfield');
    const res = await saveValue(key, l, ta.value, def);
    if (res === 'reverted') { ta.value = def; if (field) field.classList.remove('is-override'); }
    else if (res === true || res === 'blanked') { if (field) field.classList.add('is-override'); }
  }

  /* ---------- sjónrænn ritill: smelltu á texta beint á síðunni (iframe, sama lén) ---------- */
  const VE_PAGES = [
    ['index.html', 'Forsíða'], ['verkefnid.html', 'Verkefnið'], ['arkitektur.html', 'Arkitektúr'],
    ['husid.html', 'Húsið'], ['utsyni.html', 'Útsýni'], ['utirymi.html', 'Útirými'],
    ['adgengi.html', 'Aðgengi'], ['hverfid.html', 'Hverfið'], ['hafa-samband.html', 'Hafa samband'],
  ];
  function buildVisualEditor() {
    const sel = $('#vePage'), frame = $('#veFrame');
    if (!sel || !frame) return;
    sel.innerHTML = VE_PAGES.map((p) => `<option value="${p[0]}">${esc(p[1])}</option>`).join('');
    const load = () => { frame.src = sel.value + '?ve=' + Date.now(); };
    sel.addEventListener('change', load);
    $$('.cedit__lang [data-velang]').forEach((b) => b.addEventListener('click', () => {
      $$('.cedit__lang [data-velang]').forEach((x) => x.classList.toggle('on', x === b));
      try { localStorage.setItem('vb-lang', b.dataset.velang); } catch (e) {}
      load();
    }));
    const closeBtn = $('#veClose');
    if (closeBtn) closeBtn.addEventListener('click', () => { const lb = $('.cedit__mode[data-mode="list"]'); if (lb) lb.click(); });
    const fileInput = $('#veFile');
    if (fileInput) fileInput.addEventListener('change', () => uploadImage(fileInput));
    const undoBtn = $('#veUndo');
    if (undoBtn) undoBtn.addEventListener('click', doUndo);
    document.addEventListener('keydown', (e) => {
      const ve = $('#visualEditor');
      if (ve && !ve.hidden && (e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); doUndo(); }
    });
    updateUndo();
    frame.addEventListener('load', () => attachEditor(frame));
    load();
  }

  async function uploadImage(fi) {
    const file = fi.files && fi.files[0];
    if (!file || !pendingImg) return;
    const img = pendingImg; pendingImg = null;
    const key = img.getAttribute('data-img');
    const prevSrc = img.getAttribute('src');
    const prevOv = (overrides.img && overrides.img[key] != null) ? overrides.img[key] : null;
    toast('Hleð upp mynd…');
    const ext = ((file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')) || 'jpg';
    const path = key.replace(/[^a-z0-9]/gi, '_') + '_' + Date.now() + '.' + ext;
    const up = await supa.storage.from('site-images').upload(path, file, { upsert: true, cacheControl: '604800' });
    if (up.error) { toast('Villa við upphleðslu: ' + up.error.message, true); return; }
    const pub = supa.storage.from('site-images').getPublicUrl(path);
    const url = pub && pub.data && pub.data.publicUrl;
    if (!url) { toast('Villa: vantar slóð á mynd', true); return; }
    const res = await saveValue(key, 'img', url, '');
    if (res === true) {
      img.src = url; toast('Mynd uppfærð');
      pushUndo('mynd', async () => {
        if (prevOv != null) { await saveValue(key, 'img', prevOv, ''); img.src = prevOv; }
        else { await saveValue(key, 'img', '', ''); img.src = prevSrc; }
      });
    }
  }
  function attachEditor(frame) {
    let doc, win;
    try { doc = frame.contentDocument; win = frame.contentWindow; } catch (e) { return; }
    if (!doc || !doc.body || doc.getElementById('ve-style')) return;
    const st = doc.createElement('style'); st.id = 've-style';
    st.textContent =
      '[data-i18n]{cursor:text!important;pointer-events:auto!important}' +
      '[data-i18n]:hover{outline:1.5px dashed rgba(95,168,60,.9)!important;outline-offset:2px;background:rgba(95,168,60,.07)!important}' +
      // tæmd svæði haldast smellanleg í ritlinum (sést ekki á vefnum sjálfum)
      '[data-i18n]:empty{display:inline-block;min-width:2.4em;min-height:1em;outline:1.5px dashed rgba(95,168,60,.55)!important;outline-offset:2px;background:rgba(95,168,60,.06)!important}' +
      '[data-i18n].ve-on{outline:2px solid #5fa83c!important;outline-offset:2px;background:rgba(95,168,60,.14)!important;border-radius:2px;position:relative;z-index:2147483600}' +
      'img[data-img]{cursor:pointer!important;pointer-events:auto!important}' +
      'img[data-img]:hover{outline:2px dashed rgba(95,168,60,.95)!important;outline-offset:3px}' +
      '[data-block]:hover{outline:1.5px dashed rgba(95,168,60,.45);outline-offset:-2px}' +
      '#ve-blockbar{position:fixed;z-index:2147483646;display:none;gap:.25rem;background:#0b0c0d;border:1px solid rgba(255,255,255,.28);border-radius:8px;padding:.28rem;box-shadow:0 6px 22px rgba(0,0,0,.45)}' +
      '#ve-blockbar button{background:rgba(255,255,255,.12);border:0;color:#fff;font:inherit;font-size:.82rem;padding:.32rem .55rem;border-radius:5px;cursor:pointer}' +
      '#ve-blockbar button:hover{background:#5fa83c}';
    doc.head.appendChild(st);

    // breytingaham: smellur breytir texta/mynd í stað þess að navigera/triggera
    doc.addEventListener('click', (e) => {
      if (e.target.closest('#ve-blockbar')) return;   // blokk-stikan sér um sína eigin smelli
      if (e.target.closest('#modal, #planZoom')) return;   // íbúða-glugginn virkar eðlilega (loka-X, hæðir o.fl.)
      let img = e.target.closest('img[data-img]');
      let el = e.target.closest('[data-i18n]');
      if (!img && !el && doc.elementsFromPoint) {   // leita undir bendli ef yfirlag (bygging/áttavísir) hylur textann
        const stack = doc.elementsFromPoint(e.clientX, e.clientY);
        for (let i = 0; i < stack.length; i++) {
          if (!img) { const ci = stack[i].closest && stack[i].closest('img[data-img]'); if (ci) img = ci; }
          if (!el) { const ct = stack[i].closest && stack[i].closest('[data-i18n]'); if (ct) el = ct; }
          if (img || el) break;
        }
      }
      if (img) { e.preventDefault(); e.stopPropagation(); pendingImg = img; const fi = $('#veFile'); if (fi) { fi.value = ''; fi.click(); } return; }
      if (el) { e.preventDefault(); e.stopPropagation(); startEdit(el, doc, win); return; }
      const a = e.target.closest('a,button'); if (a) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    // blokk-stjórntæki: fela / færa hluti merkta data-block
    const bar = doc.createElement('div'); bar.id = 've-blockbar';
    bar.innerHTML = '<button data-act="up" title="Færa upp">↑</button><button data-act="down" title="Færa niður">↓</button><button data-act="hide">Fela</button>';
    doc.body.appendChild(bar);
    let curBlock = null, hideT = null;
    const showBar = (b) => {
      curBlock = b; const r = b.getBoundingClientRect(); bar.style.display = 'flex';
      bar.style.top = Math.max(6, r.top + 6) + 'px';
      bar.style.left = Math.max(6, Math.min(win.innerWidth - bar.offsetWidth - 6, r.right - bar.offsetWidth - 6)) + 'px';
      bar.querySelector('[data-act="hide"]').textContent = b.dataset.veHidden ? 'Sýna' : 'Fela';
      clearTimeout(hideT);
    };
    const hideSoon = () => { hideT = setTimeout(() => { bar.style.display = 'none'; }, 450); };
    doc.querySelectorAll('[data-block]').forEach((b) => {
      b.addEventListener('mouseenter', () => showBar(b));
      b.addEventListener('mouseleave', hideSoon);
    });
    bar.addEventListener('mouseenter', () => clearTimeout(hideT));
    bar.addEventListener('mouseleave', hideSoon);

    const esc1 = (k) => (win.CSS && win.CSS.escape ? win.CSS.escape(k) : k);
    const blockKeys = (parent) => [...parent.children].filter((c) => c.hasAttribute && c.hasAttribute('data-block')).map((c) => c.getAttribute('data-block'));
    const reorderDom = (parent, keys) => {
      const els = keys.map((k) => parent.querySelector(':scope > [data-block="' + esc1(k) + '"]')).filter(Boolean);
      if (els.length < 2) return;
      let last = els[0]; els.forEach((e) => { if (last.compareDocumentPosition(e) & 4) last = e; });
      const anchor = last.nextSibling;
      els.forEach((e) => parent.insertBefore(e, anchor));
    };
    const blockHide = (el) => {
      const key = el.dataset.block;
      const on = () => { el.style.opacity = '.32'; el.style.outline = '2px dashed rgba(207,64,54,.85)'; el.dataset.veHidden = '1'; };
      const off = () => { el.style.opacity = ''; el.style.outline = ''; delete el.dataset.veHidden; };
      if (el.dataset.veHidden) { saveLayout(key, ''); off(); toast('Sýnt aftur'); pushUndo('sýna', async () => { await saveLayout(key, 'hidden'); on(); }); }
      else { saveLayout(key, 'hidden'); on(); toast('Falið (sést ekki á vefnum)'); pushUndo('fela', async () => { await saveLayout(key, ''); off(); }); }
      showBar(el);
    };
    const blockMove = (el, dir) => {
      const parent = el.parentNode, pk = parent && parent.getAttribute && parent.getAttribute('data-block');
      if (!pk) { toast('Ekki hægt að færa þennan hlut', true); return; }
      const before = blockKeys(parent);
      let sib = dir < 0 ? el.previousElementSibling : el.nextElementSibling;
      while (sib && !(sib.hasAttribute && sib.hasAttribute('data-block'))) sib = dir < 0 ? sib.previousElementSibling : sib.nextElementSibling;
      if (!sib) return;
      if (dir < 0) parent.insertBefore(el, sib); else parent.insertBefore(sib, el);
      const after = blockKeys(parent);
      saveLayout(pk + ':order', JSON.stringify(after));
      showBar(el);
      pushUndo('færa', async () => { reorderDom(parent, before); await saveLayout(pk + ':order', JSON.stringify(before)); });
    };
    bar.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation(); if (!curBlock) return;
      const act = btn.dataset.act;
      if (act === 'hide') blockHide(curBlock); else blockMove(curBlock, act === 'up' ? -1 : 1);
    }));
  }
  function startEdit(el, doc, win) {
    if (el.isContentEditable) return;
    const key = el.dataset.i18n;
    let lang = 'is'; try { lang = win.localStorage.getItem('vb-lang') || 'is'; } catch (e) {}
    const def = (STR[lang] && STR[lang][key]) || '';
    const orig = el.textContent;
    el.contentEditable = 'true'; el.classList.add('ve-on'); el.focus();
    try { const r = doc.createRange(); r.selectNodeContents(el); const s = win.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {}
    let done = false;
    const onBlur = () => finish(true);
    const onKey = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    };
    const autoSave = debounce(async () => {        // vistast sjálfkrafa á meðan þú skrifar
      if (done) return;
      const v = el.textContent;
      if (v.trim() === orig.trim()) return;        // óbreytt (tómt telst breyting -> vistast)
      const ok = await saveValue(key, lang, v, def);
      if ((ok === true || ok === 'blanked') && win.VB && win.VB.STR && win.VB.STR[lang]) {
        win.VB.STR[lang][key] = (ok === 'blanked' ? '' : v.trim());
      }
    }, 700);
    async function finish(commit) {
      if (done) return; done = true;
      el.removeEventListener('blur', onBlur); el.removeEventListener('keydown', onKey); el.removeEventListener('input', autoSave);
      el.contentEditable = 'false'; el.classList.remove('ve-on');
      const val = el.textContent.trim();
      if (!commit) { el.textContent = orig; return; }
      if (val === orig.trim()) return;
      const setSTR = (v) => { if (win.VB && win.VB.STR && win.VB.STR[lang]) win.VB.STR[lang][key] = v; };
      const res = await saveValue(key, lang, val, def);
      if (res === 'reverted') { el.textContent = def; setSTR(def); }
      else if (res === 'blanked') { el.textContent = ''; setSTR(''); }   // tæmt vísvitandi -> stendur tómt
      else if (res === true) setSTR(val);
      if (res) pushUndo('texti', async () => {
        const r2 = await saveValue(key, lang, orig, def);
        el.textContent = (r2 === 'reverted') ? def : orig;
        setSTR(el.textContent);
      });
    }
    el.addEventListener('blur', onBlur);
    el.addEventListener('keydown', onKey);
    el.addEventListener('input', autoSave);
  }

  // tabs
  $$('.ad__tab').forEach((b) => b.addEventListener('click', () => {
    const tab = b.dataset.tab;
    $$('.ad__tab').forEach((x) => x.classList.toggle('on', x === b));
    const va = $('#view-apts'), vc = $('#view-content');
    if (va) va.hidden = tab !== 'apts';
    if (vc) vc.hidden = tab !== 'content';
    if (tab === 'content' && !contentTabInit) {
      contentTabInit = true;
      ensureOverrides().then(() => { if (!veBuilt) { veBuilt = true; buildVisualEditor(); } });
    }
  }));

  // skipta milli sjónræns ritils og lista
  $$('.cedit__mode').forEach((b) => b.addEventListener('click', () => {
    const mode = b.dataset.mode;
    $$('.cedit__mode').forEach((x) => x.classList.toggle('on', x === b));
    const ve = $('#visualEditor'), le = $('#listEditor');
    if (ve) ve.hidden = mode !== 'visual';
    if (le) le.hidden = mode !== 'list';
    if (mode === 'visual' && !veBuilt) { veBuilt = true; buildVisualEditor(); }
    if (mode === 'list' && !contentBuilt) { contentBuilt = true; buildContentEditor(); }
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

  /* ---------- muna að notandi er kominn inn (þar til hann skráir sig út) ---------- */
  try { if (localStorage.getItem('vb-admin') === '1') showPanel(); else showLogin(); }
  catch (e) { showLogin(); }
})();
