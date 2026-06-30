/* ==========================================================================
   Vorbraut 14 — app
   ========================================================================== */
(function () {
  'use strict';
  const { APARTMENTS, FACADE, STR } = window.VB;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ----------------------------- i18n ----------------------------------- */
  let lang = localStorage.getItem('vb-lang') || 'is';
  const t = (k) => (STR[lang] && STR[lang][k] != null ? STR[lang][k] : (STR.is[k] ?? k));

  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach((el) => { const v = t(el.dataset.i18n); if (v !== undefined) el.textContent = v; });
    if (window.VB.syncContactLinks) window.VB.syncContactLinks();
    $('#langLabel').textContent = lang === 'is' ? 'English' : 'Íslenska';
    buildGrid();                 // labels inside cards depend on language
    if (currentApt && !modal.hidden) openModal(currentApt); // refresh modal if open
  }
  $('#langBtn').addEventListener('click', () => {
    lang = lang === 'is' ? 'en' : 'is';
    localStorage.setItem('vb-lang', lang);
    applyLang();
  });

  /* ------------------------- nav / scrolling ---------------------------- */
  const scroller = $('#scroller');
  const nav = $('#nav');

  function onScroll() {
    nav.classList.toggle('nav--solid', scroller.scrollTop > window.innerHeight * 0.72);
  }
  scroller.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Animated section jump via rAF. Native smooth scrolling is unreliable with
  // `scroll-snap-type:mandatory` (and disabled under reduced-motion), so we
  // animate scrollTop ourselves with snap momentarily off, then restore it.
  let scrollAnim, scrollSafety;
  const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  function goToSection(top) {
    if (scrollAnim) cancelAnimationFrame(scrollAnim);
    clearTimeout(scrollSafety);
    const start = scroller.scrollTop;
    const dist = top - start;
    if (Math.abs(dist) < 2) return;
    const finish = () => {
      if (scrollAnim) { cancelAnimationFrame(scrollAnim); scrollAnim = null; }
      scroller.scrollTo({ top, behavior: 'instant' });
      scroller.style.scrollSnapType = '';
    };
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) { finish(); return; }
    scroller.style.scrollSnapType = 'none';
    const dur = Math.min(900, Math.max(420, Math.abs(dist) * 0.42));
    scrollSafety = setTimeout(finish, dur + 250); // guard if rAF is throttled
    let t0 = null;
    const step = (ts) => {
      if (t0 == null) t0 = ts;
      const p = Math.min(1, (ts - t0) / dur);
      scroller.scrollTo({ top: start + dist * easeInOut(p), behavior: 'instant' });
      if (p < 1) scrollAnim = requestAnimationFrame(step);
      else { scrollAnim = null; clearTimeout(scrollSafety); finish(); }
    };
    scrollAnim = requestAnimationFrame(step);
  }
  $$('[data-scroll]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#' || !id.startsWith('#')) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      nav.classList.remove('open');
      goToSection(target.offsetTop);
    });
  });

  // burger + farsíma-yfirlagsvalmynd
  const burger = $('#burger');
  const closeMenu = () => { nav.classList.remove('open'); document.body.classList.remove('navopen'); };
  if (burger) burger.addEventListener('click', () => {
    nav.classList.toggle('open');
    document.body.classList.toggle('navopen', nav.classList.contains('open'));
  });
  $$('#navmenu a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  // hlekkir á kafla forsíðunnar (index.html#… eða #…) -> mjúkt skrun, engin endurhleðsla
  $$('a[href*="#"]:not([data-scroll]):not([data-cinedown])').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (!/^(index\.html)?#/.test(href)) return;
    a.addEventListener('click', (e) => {
      const hash = href.split('#')[1]; const target = hash && $('#' + hash);
      if (!target) return;
      e.preventDefault(); closeMenu(); goToSection(target.offsetTop);
    });
  });
  // vörumerki á forsíðu -> efst (ekki endurhlaða)
  const navLogo = $('.nav__logo');
  if (navLogo) navLogo.addEventListener('click', (e) => { e.preventDefault(); closeMenu(); goToSection(0); });
  // lentum á forsíðu með #hash frá undirsíðu
  if (location.hash && $(location.hash)) {
    setTimeout(() => { const tgt = $(location.hash); if (tgt) goToSection(tgt.offsetTop); }, 120);
  }

  // active nav link
  const navMap = {};
  $$('.nav__links a').forEach((a) => { navMap[a.getAttribute('href').slice(1)] = a; });
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        $$('.nav__links a').forEach((x) => x.classList.remove('active'));
        const a = navMap[en.target.id]; if (a) a.classList.add('active');
      }
    });
  }, { root: scroller, threshold: 0.5 });
  ['stadsetning','ibudir','val','yfirlit','honnun','gaedi','hverfi','hafa-samband']
    .forEach((id) => { const s = $('#' + id); if (s) navObserver.observe(s); });

  /* --------------------------- reveal anim ------------------------------ */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); revealObs.unobserve(en.target); } });
  }, { root: scroller, threshold: 0.16 });
  $$('.reveal').forEach((el, i) => { el.dataset.d = (i % 3); revealObs.observe(el); });

  /* --------------------------- helpers ---------------------------------- */
  const fmtArea = (n) => n.toLocaleString('is-IS', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmtKr = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr.';
  const roomsLabel = (r) => t('unit.rooms' + r) || (r + ' herb.');
  const outLabel = (o) => t('out.' + o);
  const statusLabel = (s) => t('st.' + s);
  const floorLabel = (f) => (lang === 'is' ? f + '. hæð' : 'Floor ' + f);

  /* ===================== INTERACTIVE FACADE ============================= */
  const svg = $('#facadeSvg');
  const tip = $('#facadeTip');
  const facadeFig = $('#facade');
  const aptById = Object.fromEntries(APARTMENTS.map((a) => [a.id, a]));
  const SVGNS = 'http://www.w3.org/2000/svg';

  Object.entries(FACADE.zones).forEach(([id, pts]) => {
    const poly = document.createElementNS(SVGNS, 'polygon');
    poly.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
    poly.dataset.id = id;
    const apt = aptById[id];
    if (apt && apt.status !== 'available') poly.style.fill = statusFill(apt.status);
    poly.addEventListener('mousemove', (e) => moveTip(e, id));
    poly.addEventListener('mouseenter', () => showTip(id));
    poly.addEventListener('mouseleave', hideTip);
    poly.addEventListener('click', () => { const a = aptById[id]; if (a) openModal(a); });
    svg.appendChild(poly);
  });

  // Framan / Aftan — skipta um hlið. framan = föst inngangsmynd, aftan = interactive svalahlið
  const facadeSides = $('#facadeSides');
  if (facadeSides) facadeSides.addEventListener('click', (e) => {
    const b = e.target.closest('.facade__sidebtn'); if (!b) return;
    facadeFig.classList.toggle('is-front', b.dataset.side === 'framan');
    $$('.facade__sidebtn', facadeSides).forEach((x) => x.classList.toggle('is-on', x === b));
  });

  function statusFill(s) {
    if (s === 'sold') return '#cf4036';        // selt -> rautt
    if (s === 'reserved') return '#d8a72c';    // selt með fyrirvara -> gult
    return '#5fa83c';                          // til sölu -> grænt (CSS-sjálfgildi)
  }
  function showTip(id) {
    const a = aptById[id]; if (!a) return;
    tip.innerHTML = `<b>${lang === 'is' ? 'Íbúð' : 'Apt.'} ${a.id}</b>${fmtArea(a.area)} m² · ${roomsLabel(a.rooms)}
      <small>${floorLabel(a.floor)} · ${outLabel(a.outdoor)}</small>
      <small>${statusLabel(a.status)}</small>`;
    tip.hidden = false;
  }
  function moveTip(e, id) {
    const r = facadeFig.getBoundingClientRect();
    tip.style.left = (e.clientX - r.left) + 'px';
    tip.style.top = (e.clientY - r.top) + 'px';
  }
  function hideTip() { tip.hidden = true; }

  /* ===================== APARTMENT GRID + FILTERS ====================== */
  const grid = $('#aptRows');
  const gridEmpty = $('#gridEmpty');
  const FRANGE = { area: [64, 172], floor: [1, 4], rooms: [2, 4] };
  const state = { area: [64, 172], floor: [1, 4], rooms: [2, 4], laundry: false, pottur: false, parking: false, available: false };

  // bílastæði per íbúð (sjálfgefið 1; 0 = ekkert bílastæði)
  const parkOf = (a) => (a.parking != null ? a.parking : 1);

  function matches(a) {
    return a.area >= state.area[0] && a.area <= state.area[1]
        && a.floor >= state.floor[0] && a.floor <= state.floor[1]
        && a.rooms >= state.rooms[0] && a.rooms <= state.rooms[1]
        && (!state.laundry || a.type !== 'two')
        && (!state.pottur || a.type === 'pent')
        && (!state.parking || parkOf(a) > 0)
        && (!state.available || a.status === 'available');
  }

  function buildGrid() {
    if (!grid) return;
    const list = APARTMENTS.filter(matches);
    grid.innerHTML = list.map((a) => {
      const out = outLabel(a.outdoor).split(' / ')[0] + (a.balcony ? ' · ' + fmtArea(a.balcony) + ' m²' : '');
      return `<tr class="aptrow aptrow--${a.status}" data-id="${a.id}">
        <td class="aptrow__id" data-label="${t('col.id')}">${a.id}</td>
        <td data-label="${t('col.floor')}">${floorLabel(a.floor)}</td>
        <td data-label="${t('spec.area')}">${fmtArea(a.area)} m²</td>
        <td data-label="${t('col.rooms')}">${roomsLabel(a.rooms)}</td>
        <td data-label="${t('spec.balcony')}">${out}</td>
        <td data-label="${t('spec.parking')}">${parkOf(a) || '—'}</td>
        <td data-label="${t('spec.storage')}">${t('spec.basement')}</td>
        <td class="aptrow__price" data-label="${t('spec.price')}">${a.price ? fmtKr(a.price) : '—'}</td>
        <td data-label="${t('col.status')}"><span class="aptrow__status">${statusLabel(a.status)}</span></td>
        <td class="aptrow__viewcell"><span class="aptrow__view">${t('apts.view')}</span></td>
      </tr>`;
    }).join('');
    if (gridEmpty) gridEmpty.hidden = list.length > 0;
    $$('.aptrow', grid).forEach((r) => r.addEventListener('click', () => openModal(aptById[r.dataset.id])));
  }

  // dual-range sliðrar (Birt stærð / Hæð / Herbergi)
  function buildRange(el) {
    const key = el.dataset.key, min = +el.dataset.min, max = +el.dataset.max, step = +el.dataset.step || 1, unit = el.dataset.unit || '';
    const track = el.querySelector('.rng__track'), fill = el.querySelector('.rng__fill');
    const hLo = el.querySelector('.rng__h--lo'), hHi = el.querySelector('.rng__h--hi');
    const vLo = el.querySelector('.rng__lo'), vHi = el.querySelector('.rng__hi');
    const pct = (v) => (v - min) / (max - min) * 100;
    function draw() {
      const [lo, hi] = state[key];
      hLo.style.left = pct(lo) + '%'; hHi.style.left = pct(hi) + '%';
      fill.style.left = pct(lo) + '%'; fill.style.right = (100 - pct(hi)) + '%';
      vLo.textContent = unit ? lo + ' ' + unit : lo; vHi.textContent = unit ? hi + ' ' + unit : hi;
    }
    const valAt = (cx) => { const r = track.getBoundingClientRect(); let tt = (cx - r.left) / r.width; tt = Math.max(0, Math.min(1, tt)); return Math.round((min + tt * (max - min)) / step) * step; };
    let drag = null;
    const down = (e, w) => { drag = w; try { e.target.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); };
    hLo.addEventListener('pointerdown', (e) => down(e, 0));
    hHi.addEventListener('pointerdown', (e) => down(e, 1));
    window.addEventListener('pointermove', (e) => { if (drag == null) return; const v = valAt(e.clientX), r = state[key]; if (drag === 0) r[0] = Math.min(v, r[1]); else r[1] = Math.max(v, r[0]); draw(); buildGrid(); syncFacade(); });
    window.addEventListener('pointerup', () => { drag = null; });
    el._draw = draw; draw();
  }
  $$('.rng').forEach(buildRange);

  // gátlistar (eiginleikar íbúða)
  $$('.feat').forEach((b) => b.addEventListener('click', () => {
    const f = b.dataset.feat; state[f] = !state[f]; b.classList.toggle('on', state[f]); buildGrid(); syncFacade();
  }));

  const resetBtn = $('#resetBtn');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    state.area = FRANGE.area.slice(); state.floor = FRANGE.floor.slice(); state.rooms = FRANGE.rooms.slice();
    state.laundry = state.pottur = state.parking = state.available = false;
    $$('.feat').forEach((b) => b.classList.remove('on'));
    $$('.rng').forEach((el) => el._draw && el._draw());
    buildGrid(); syncFacade();
  });

  // dim facade zones that don't match active filters
  function syncFacade() {
    const filtering = APARTMENTS.some((a) => !matches(a));
    facadeFig.classList.toggle('dim', filtering);
    $$('polygon', svg).forEach((p) => {
      const a = aptById[p.dataset.id];
      p.classList.toggle('match', filtering && a && matches(a));
    });
  }

  /* ============================== MODAL ================================= */
  const modal = $('#modal');
  const FLOOR_SHAPES = window.VB.FLOOR_SHAPES;
  let currentApt = null;
  let viewFloor = null;      // hæð sem hæðarkortið sýnir núna
  let planView = 'line';     // 'line' = teikning, 'tex' = áferð (textured render)

  const aptsOnFloor = (f) => APARTMENTS.filter((a) => a.floor === f).sort((x, y) => x.id.localeCompare(y.id));

  /* ---- hæðarval (HÆÐ 1–4 hringir) ---- */
  function renderFloorSel(active) {
    const sel = $('#mFloorSel');
    sel.innerHTML = [1, 2, 3, 4]
      .map((f) => `<button class="aptm__fbtn${f === active ? ' is-on' : ''}" data-f="${f}">${f}</button>`)
      .join('');
    $$('.aptm__fbtn', sel).forEach((b) => b.addEventListener('click', () => {
      viewFloor = +b.dataset.f;
      renderFloorSel(viewFloor);
      renderDiagram(viewFloor, currentApt && currentApt.floor === viewFloor ? currentApt.id : null);
    }));
  }

  /* ---- hæðarkort: raunverulegar útlínur íbúðanna (úr BIM), valda íbúðin upplýst ---- */
  const polyPts = (arr) => arr.map((p) => p.join(',')).join(' ');
  function polyCentroid(pts) {                 // flatarvegið miðja (svo merkið lendi inni í forminu)
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      const cr = x0 * y1 - x1 * y0; a += cr; cx += (x0 + x1) * cr; cy += (y0 + y1) * cr;
    }
    if (Math.abs(a) < 1e-6) {
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    }
    return [cx / (3 * a), cy / (3 * a)];
  }
  function renderDiagram(floor, selId) {
    const F = FLOOR_SHAPES.floors[floor];
    const svg = $('#mDiagram');
    if (!F) { svg.innerHTML = ''; return; }
    svg.setAttribute('viewBox', FLOOR_SHAPES.viewBox);
    // heil grunnplata undir öllu — engin hvít bil sjást nokkurs staðar á byggingunni
    let html = F.footprint ? `<polygon class="dg-foot" points="${polyPts(F.footprint)}"/>` : '';
    const draw = (a) => {
      const poly = F.apts[a.id];
      if (!poly) return '';
      const [cx, cy] = polyCentroid(poly);
      const cls = 'dg-apt dg-apt--' + a.status + (a.id === selId ? ' is-sel' : '');
      return `<g class="${cls}" data-id="${a.id}">
        <polygon points="${polyPts(poly)}"/>
        <text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" dy=".34em">${a.id}</text>
      </g>`;
    };
    const list = aptsOnFloor(floor);
    list.filter((a) => a.id !== selId).forEach((a) => { html += draw(a); });  // ekki-valdar fyrst
    const selA = list.find((a) => a.id === selId);
    if (selA) html += draw(selA);                                             // valda íbúðin efst
    // áttaviti — hreinn áttavísir í lausa plássinu neðst t.h. (snertir ekki teikninguna)
    const nd = FLOOR_SHAPES.northDeg, cx = 281, cy = 168, nlen = 13.5;
    const nth = (nd + 90) * Math.PI / 180;
    const nlx = (cx + nlen * Math.sin(nth)).toFixed(1);
    const nly = (cy - nlen * Math.cos(nth)).toFixed(1);
    html += `<g class="dg-north" transform="translate(${cx},${cy})">
      <circle class="dg-north-ring" r="9.6"/>
      <g transform="rotate(${(nd + 90).toFixed(1)})">
        <path class="dg-north-l" d="M0,-8 L-2.7,4.4 L0,1.8 Z"/>
        <path class="dg-north-r" d="M0,-8 L0,1.8 L2.7,4.4 Z"/>
      </g></g>
      <text class="dg-northlbl" x="${nlx}" y="${nly}">N</text>`;
    svg.innerHTML = html;
    $$('.dg-apt', svg).forEach((g) => g.addEventListener('click', () => openModal(aptById[g.dataset.id])));
  }

  function openModal(a) {
    if (!a) return;
    currentApt = a;
    viewFloor = a.floor;

    // grunnmynd (vinstri) — sjálfgefið teikning; áferðar-takki aðeins ef til er render
    modal.dataset.apt = a.id;
    planView = 'line';
    const pv = $('#mPlanView');
    pv.hidden = !a.tex;
    $$('.aptm__pvbtn', pv).forEach((b) => {
      b.textContent = b.dataset.view === 'tex' ? (lang === 'is' ? 'Með áferð' : 'Textured')
                                               : (lang === 'is' ? 'Teikning' : 'Drawing');
    });
    applyPlanView();
    $('#mPlan').alt = (lang === 'is' ? 'Grunnmynd íbúðar ' : 'Floor plan of apartment ') + a.id;
    $('#mPlanHint').textContent = a.planExact ? t('modal.planHint') : t('modal.planSoon');

    // titill + staða
    $('#mTitle').textContent = (lang === 'is' ? 'Íbúð ' : 'Apartment ') + a.id;
    const st = $('#mStatus');
    st.textContent = statusLabel(a.status);
    st.className = 'aptm__status tag tag--' + a.status;

    // hæðarval + hæðarkort (hægri)
    renderFloorSel(a.floor);
    renderDiagram(a.floor, a.id);

    // upplýsingagrid (sama uppsetning og vesturvin, okkar gögn)
    const outVal = outLabel(a.outdoor) + (a.balcony ? ' · ' + fmtArea(a.balcony) + ' m²' : '');
    const kr = fmtKr;
    const specs = [
      [t('col.floor'), floorLabel(a.floor)],
      [t('col.rooms'), roomsLabel(a.rooms)],
      [t('spec.area'), fmtArea(a.area) + ' m²'],
      [t('spec.storage'), t('spec.basement')],
      [t('spec.parking'), parkOf(a) ? String(parkOf(a)) : '—'],
      [t('spec.balcony'), outVal],
      [t('spec.laundry'), a.type === 'two' ? t('spec.no') : t('spec.yes')],
    ];
    if (a.ceiling) specs.push([t('spec.ceiling'), a.ceiling + ' m']);
    if (a.theme) specs.push([t('spec.theme'), a.theme]);
    specs.push([t('spec.price'), a.price ? kr(a.price) : '—']);
    $('#mSpecs').innerHTML = specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() { modal.hidden = true; currentApt = null; document.body.style.overflow = ''; }
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });

  /* ---- staðsetning/stærð grunnmyndar (rammi) — sjálfgefið = "contain", annars vistuð stilling ---- */
  const planImg = $('#mPlan'), planInner = $('#mPlanInner'), planBox = $('#mPlanBtn'), planView_el = $('#mPlanView');
  // skipta milli teikningar (assets/plans) og áferðar (assets/plans_tex)
  function applyPlanView() {
    const a = currentApt; if (!a) return;
    if (planView === 'tex' && a.tex) planImg.src = 'assets/plans_tex/' + a.tex + '?r=2';
    else { planView = 'line'; planImg.src = 'assets/plans/' + a.plan + '?r=7'; }
    if (planView_el) $$('.aptm__pvbtn', planView_el).forEach((b) => b.classList.toggle('is-on', b.dataset.view === planView));
    requestAnimationFrame(() => setPlanFrame(a.id));
  }
  if (planView_el) planView_el.addEventListener('click', (e) => {
    const b = e.target.closest('.aptm__pvbtn'); if (!b) return;
    planView = b.dataset.view === 'tex' ? 'tex' : 'line';
    applyPlanView();
  });
  function setPlanFrame(id) {
    if (!planBox || !planInner || !planImg) return;
    const box = planBox.getBoundingClientRect();
    if (!box.width || !planImg.naturalWidth) return;
    const iar = planImg.naturalWidth / planImg.naturalHeight;
    let g = (window.VB.PLAN_ADJ || {})[id];   // áferð er pixla-jöfnuð við teikninguna -> sami rammi
    if (!g) {                                   // sjálfgefið: passa inn (contain), miðjað
      const fw = Math.min(box.width, box.height * iar), fh = fw / iar;
      g = { x: +((box.width - fw) / 2 / box.width * 100).toFixed(1), y: +((box.height - fh) / 2 / box.height * 100).toFixed(1),
            w: +(fw / box.width * 100).toFixed(1), h: +(fh / box.height * 100).toFixed(1) };
    }
    planInner.style.left = g.x + '%'; planInner.style.top = g.y + '%'; planInner.style.width = g.w + '%'; planInner.style.height = g.h + '%';
  }
  window.__setPlanFrame = setPlanFrame;
  if (planImg) planImg.addEventListener('load', () => { if (!modal.hidden && modal.dataset.apt) setPlanFrame(modal.dataset.apt); });

  /* ---- grunnmynd í fullri stærð (lightbox) ---- */
  const planZoom = $('#planZoom');
  $('#mPlanBtn').addEventListener('click', () => {
    if (document.body.classList.contains('planimg')) return;  // í stillingar-ham: ekki opna stækkun
    $('#planZoomImg').src = $('#mPlan').src;
    planZoom.hidden = false;
    document.body.style.overflow = 'hidden';
  });
  function closeZoom() { planZoom.hidden = true; if (modal.hidden) document.body.style.overflow = ''; }
  planZoom.addEventListener('click', closeZoom);

  /* ===================== HAFA SAMBAND (sér síða) ====================== */
  // „Hafa samband" er sér síða (hafa-samband.html) — allir [data-contact]
  // takkar fara þangað (loka fyrst íbúðar-popup ef hann er opinn).
  $$('[data-contact]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    if (!modal.hidden) closeModal();
    window.location.href = 'hafa-samband.html';
  }));

  // mjúkt skrun á section (t.d. „Söluaðilar" í footer)
  $$('[data-scrollto]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault(); const t = document.getElementById(el.dataset.scrollto);
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!planZoom.hidden) closeZoom();
    else if (!modal.hidden) closeModal();
  });

  /* ----- staða íbúða úr Supabase (lifandi: grænt/gult/rautt) ----------- */
  if (window.VB && typeof VB.getStatuses === 'function') {
    VB.getStatuses().then((m) => {
      if (!m || !Object.keys(m).length) return;
      APARTMENTS.forEach((a) => { if (m[a.id]) a.status = m[a.id]; });
      $$('polygon', svg).forEach((p) => {
        const a = aptById[p.dataset.id];
        p.style.fill = (a && a.status !== 'available') ? statusFill(a.status) : '';
      });
      buildGrid(); syncFacade();
    }).catch(() => {});
  }

  /* ------------------------------ init ---------------------------------- */
  applyLang();   // also builds grid
  // texta-yfirskriftir úr Supabase (CMS) — bræða inn og endurteikna
  if (window.VB.getContent) window.VB.getContent().then((ov) => {
    if (!ov) return;
    if (window.VB.applyImageOverrides) window.VB.applyImageOverrides(ov.img);
    if (window.VB.applyLayoutOverrides) window.VB.applyLayoutOverrides(ov.layout);
    const aptChanged = window.VB.applyAptOverrides && window.VB.applyAptOverrides(ov.apt);
    const txtChanged = window.VB.applyContentOverrides(ov);
    if (txtChanged) applyLang();          // applyLang endurteiknar töfluna líka
    else if (aptChanged) buildGrid();
    if (aptChanged) { syncFacade(); if (currentApt && modal && !modal.hidden) openModal(currentApt); }
  }).catch(() => {});
})();
