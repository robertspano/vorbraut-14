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
    if (typeof syncZoneAria === 'function') syncZoneAria();
    if (typeof renderSelector === 'function') renderSelector();   // veljarinn fylgir tungumálinu
    if (currentApt && !modal.hidden) openModal(currentApt); // refresh modal if open
  }
  $('#langBtn').addEventListener('click', () => {
    lang = lang === 'is' ? 'en' : 'is';
    localStorage.setItem('vb-lang', lang);
    applyLang();
  });

  /* ------------------------- nav / scrolling ---------------------------- */
  // Skjalið sjálft er skrunflöturinn (var áður main#scroller — sjá css/styles.css).
  const scroller = document.scrollingElement || document.documentElement;
  const nav = $('#nav');

  // Valmyndin var snert í HVERJU skrun-eventi þótt ekkert breyttist. Hún er
  // position:fixed, svo hver stílbreyting á henni kostar endurteikningu.
  // Nú er aðeins skrifað þegar ástandið breytist í raun.
  // (Ekki rAF-þröttlun: rAF er sett á pásu í földum flipum og valmyndin sæti
  //  þá eftir í röngu ástandi þegar maður kæmi til baka.)
  let erSolid = null, erScrolled = null;
  function onScroll() {
    const y = scroller.scrollTop;
    const solid = y > window.innerHeight * 0.72, scrolled = y > 8;
    if (solid !== erSolid) { nav.classList.toggle('nav--solid', solid); erSolid = solid; }
    if (scrolled !== erScrolled) { nav.classList.toggle('nav--scrolled', scrolled); erScrolled = scrolled; }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Hero-myndbandið hélt áfram að spila eftir að það var skrunað út úr
     glugganum. 1080p-afkóðun í bakgrunni stelur nákvæmlega þeim römmum sem
     skrunið þarf — það var hökktið. Það heldur sér í hvíld utan gluggans.
     IntersectionObserver er settur á pásu í földum flipum, svo skrunið
     staðfestir stöðuna líka. */
  (function heroHvild() {
    const v = document.querySelector('.shero__video');
    if (!v) return;
    const setja = (synilegt) => {
      if (synilegt && v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      else if (!synilegt && !v.paused) { v.pause(); }
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { es.forEach((e) => setja(e.isIntersecting)); },
        { rootMargin: '80px 0px' }).observe(v);
    }
    // Varaleið ef IntersectionObserver liggur niðri. Heroið liggur efst á
    // síðunni, svo skrunstaðan ein dugar — engin getBoundingClientRect í
    // miðju skruni (hún þvingar fram umbrot í hverju einasta eventi).
    let heroHaed = 0;
    const maela = () => { heroHaed = (v.closest('.shero') || v).offsetHeight || window.innerHeight; };
    maela();
    window.addEventListener('resize', maela, { passive: true });
    const athuga = () => { setja(scroller.scrollTop < heroHaed + 80); };
    window.addEventListener('scroll', athuga, { passive: true });
    athuga();
  })();

  // Animated section jump via rAF. Native smooth scrolling is unreliable with
  // `scroll-snap-type:mandatory` (and disabled under reduced-motion), so we
  // animate scrollTop ourselves with snap momentarily off, then restore it.
  let scrollAnim, scrollSafety, dropAbort = null;
  const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  function goToSection(top) {
    if (dropAbort) dropAbort();
    if (scrollAnim) cancelAnimationFrame(scrollAnim);
    clearTimeout(scrollSafety);
    const start = scroller.scrollTop;
    const dist = top - start;
    if (Math.abs(dist) < 2) return;

    const stop = () => {
      if (scrollAnim) { cancelAnimationFrame(scrollAnim); scrollAnim = null; }
      clearTimeout(scrollSafety);
      scroller.style.scrollSnapType = '';
      if (dropAbort) dropAbort();
    };
    const finish = () => { stop(); scroller.scrollTo({ top, behavior: 'instant' }); };

    if (matchMedia('(prefers-reduced-motion:reduce)').matches) { finish(); return; }

    // Notandinn á ALLTAF að ráða. Snerti hann hjólið, lyklaborðið eða skjáinn
    // á meðan mjúka skrunið keyrir hættir það strax — annars berjast þau um
    // sömu skrunstöðuna og hann kippist svo aftur á áfangastað þegar það lýkur.
    const bail = () => stop();
    const opts = { passive: true };
    window.addEventListener('wheel', bail, opts);
    window.addEventListener('touchstart', bail, opts);
    window.addEventListener('keydown', bail, opts);
    dropAbort = () => {
      window.removeEventListener('wheel', bail, opts);
      window.removeEventListener('touchstart', bail, opts);
      window.removeEventListener('keydown', bail, opts);
      dropAbort = null;
    };

    scroller.style.scrollSnapType = 'none';
    const dur = Math.min(900, Math.max(420, Math.abs(dist) * 0.42));
    scrollSafety = setTimeout(finish, dur + 250); // öryggisnet ef rAF er hemlað
    let t0 = null;
    const step = (ts) => {
      if (t0 == null) t0 = ts;
      const p = Math.min(1, (ts - t0) / dur);
      scroller.scrollTo({ top: start + dist * easeInOut(p), behavior: 'instant' });
      if (p < 1) scrollAnim = requestAnimationFrame(step);
      else finish();
    };
    scrollAnim = requestAnimationFrame(step);
  }
  /* ---- Hero: fíngerð músar-parallax á myndbandsspjaldinu ---- */
  (function heroExtras() {
    // parallax: spjaldið hallar örlítið að músinni (ekki á snerti/reduced-motion)
    const panel = $('.shero__panel'), heroSec = $('.shero');
    if (panel && heroSec && matchMedia('(pointer:fine)').matches
        && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
      // rAF-hemlað: mousemove getur komið 100+ sinnum á sekúndu og hver skrif í
      // style.transform neyða fram endurútreikning. Eitt skrif á ramma dugar.
      let mx = 0, my = 0, pending = false;
      const paint = () => {
        pending = false;
        panel.style.transform = `translate(${(mx * 10).toFixed(1)}px, ${(my * 8).toFixed(1)}px)`;
      };
      heroSec.addEventListener('mousemove', (e) => {
        const r = heroSec.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width - 0.5;
        my = (e.clientY - r.top) / r.height - 0.5;
        if (!pending) { pending = true; requestAnimationFrame(paint); }
      }, { passive: true });
      // will-change aðeins á meðan músin er yfir hetjunni — annars situr
      // myndbandslagið í eigin lagi allan tímann og étur minni að óþörfu.
      heroSec.addEventListener('mouseenter', () => { panel.style.willChange = 'transform'; });
      heroSec.addEventListener('mouseleave', () => {
        panel.style.transform = '';
        panel.style.willChange = '';
      });
    }
  })();

  // hlekkir eiga að lenda UNDIR föstu valmyndinni (annars klippist toppur kaflans)
  const goToAnchor = (el) => {
    const navH = nav ? nav.offsetHeight : 84;
    goToSection(Math.max(0, el.offsetTop - navH));
  };
  // Eitt skrunkerfi fyrir alla síðuna. Innfelldu hnapparnir neðst í index.html
  // notuðu áður sitt eigið scrollTo({behavior:'smooth'}) — tvö kerfi sem gátu
  // bæði verið að skruna sama flötinn samtímis og toguðust á.
  window.VB.goToSection = goToSection;
  window.VB.goToAnchor = goToAnchor;
  // Stöðva mjúka skrunið utan frá. Án þessa klárar sjálfvirka skrunið, sem
  // keyrir þegar íbúð er valin, sig og kippir manni til baka ofan í hvert
  // skrun sem hefst á meðan (t.d. þegar ýtt er á bílakjallara-flipann).
  window.VB.stopScroll = () => {
    if (typeof dropAbort === 'function' && dropAbort) dropAbort();
    if (scrollAnim) { cancelAnimationFrame(scrollAnim); scrollAnim = null; }
    clearTimeout(scrollSafety);
  };

  $$('[data-scroll]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#' || !id.startsWith('#')) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      nav.classList.remove('open');
      goToAnchor(target);
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
      e.preventDefault(); closeMenu(); goToAnchor(target);
    });
  });
  // vörumerki á forsíðu -> efst (ekki endurhlaða)
  const navLogo = $('.nav__logo');
  if (navLogo) navLogo.addEventListener('click', (e) => { e.preventDefault(); closeMenu(); goToSection(0); });
  // lentum á forsíðu með #hash frá undirsíðu
  if (location.hash && $(location.hash)) {
    setTimeout(() => { const tgt = $(location.hash); if (tgt) goToAnchor(tgt); }, 120);
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
  }, { threshold: 0.5 });
  ['stadsetning','ibudir','val','yfirlit','honnun','gaedi','hverfi','hafa-samband']
    .forEach((id) => { const s = $('#' + id); if (s) navObserver.observe(s); });

  /* --------------------------- reveal anim ------------------------------ */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); revealObs.unobserve(en.target); } });
  }, { threshold: 0.16 });
  $$('.reveal').forEach((el, i) => { el.dataset.d = (i % 3); revealObs.observe(el); });

  const PLANV = VB.PLANV;       // útgáfumerki grunnmynda — skráð í js/data.js

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

  function byggjaSvaedi(sett) {
    [...svg.querySelectorAll('polygon')].forEach((p) => p.remove());
    Object.entries(sett || {}).forEach(([id, pts]) => {
      const poly = document.createElementNS(SVGNS, 'polygon');
      poly.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
      poly.dataset.id = id;
      poly.setAttribute('tabindex', '0');
      poly.setAttribute('role', 'button');
      const apt = aptById[id];
      if (apt) {
        if (apt.status !== 'available') {
          poly.style.fill = statusFill(apt.status);
          poly.style.stroke = statusFill(apt.status);
        }
        poly.addEventListener('mousemove', (e) => moveTip(e, id));
        poly.addEventListener('mouseenter', () => {
          showTip(id);
          hoverApt = apt; planFloor = apt.floor; renderSelector();
        });
        poly.addEventListener('mouseleave', () => {
          hideTip();
          if (hoverApt) { hoverApt = null; renderSelector(); }
        });
        poly.addEventListener('click', () => selectApt(id));
        poly.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectApt(id); }
        });
      } else {
        // Svæði sem stendur ekki fyrir íbúð — t.d. bílakjallarinn í heild.
        const v = VIEWS.find((x) => x.id === curView) || {};
        const merki = t('facade.' + id);
        poly.classList.add('facade__zone--stakt');
        poly.addEventListener('mousemove', (e) => moveTipTexti(e, merki));
        poly.addEventListener('mouseenter', () => showTipTexti(merki));
        poly.addEventListener('mouseleave', hideTip);
        // Bílakjallarinn opnast NEÐAN VIÐ veljarann, eins og íbúðirnar, í stað
        // þess að hoppa á aðra síðu. Aðrir stakir reitir fylgja zoneHref áfram.
        const fara = (id === 'kjallari' && window.VB.showKjallaraView)
          ? () => window.VB.showKjallaraView()
          : (v.zoneHref ? () => { window.location.href = v.zoneHref; } : null);
        if (fara) {
          poly.addEventListener('click', fara);
          poly.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fara(); }
          });
        }
      }
      svg.appendChild(poly);
    });
    if (typeof syncZoneAria === 'function') syncZoneAria();
  }
  // sjónarhorn -> svæðasett. 'true' = gamla bakhliðarsettið, strengur = FACADE.zones<Nafn>
  function svaediFyrir(vid) {
    const v = (window.VB.VIEWS || []).find((x) => x.id === vid);
    if (!v || !v.zones) return null;
    if (v.zones === true) return FACADE.zones;
    const lykill = 'zones' + v.zones.charAt(0).toUpperCase() + v.zones.slice(1);
    return FACADE[lykill] || null;
  }
  byggjaSvaedi(FACADE.zones);
  facadeFig.setAttribute('data-zones', Object.keys(FACADE.zones).length ? '1' : '0');

  // aria-lýsingar á íbúða-svæðunum (uppfærist við tungumála- og stöðubreytingar)
  function showTipTexti(txt) {
    if (!tip) return;
    tip.innerHTML = '<b>' + txt + '</b>';
    tip.hidden = false;
  }
  function moveTipTexti(e, txt) {
    if (!tip) return;
    if (tip.hidden) showTipTexti(txt);
    const r = svg.getBoundingClientRect();
    tip.style.left = (e.clientX - r.left) + 'px';
    tip.style.top = (e.clientY - r.top) + 'px';
  }

  function syncZoneAria() {
    $$('polygon', svg).forEach((p) => {
      const a = aptById[p.dataset.id]; if (!a) return;
      p.setAttribute('aria-label', `${lang === 'is' ? 'Íbúð' : 'Apartment'} ${a.id}, ${roomsLabel(a.rooms)}, ${fmtArea(a.area)} m², ${statusLabel(a.status)}`);
    });
  }

  /* ---- Sjónarhorn hússins (bakhlið / framhlið / hlið / bílakjallari …) ----
     Myndalögin og takkarnir eru byggð úr VIEWS; bættu bara við færslu í data.js
     til að fá nýtt sjónarhorn. Gagnvirku íbúðasvæðin virka á 'zones:true' myndinni. */
  const VIEWS = (window.VB.VIEWS && window.VB.VIEWS.length)
    ? window.VB.VIEWS
    : [{ id: 'aftan', label: 'Bakhlið', img: 'assets/renders/foto-bak.webp', zones: true }];
  const facadeSides = $('#facadeSides'), facadeViews = $('#facadeViews');
  const viewLabel = (v) => (t('facade.' + v.id) !== 'facade.' + v.id ? t('facade.' + v.id) : v.label);
  let curView = (VIEWS.find((v) => v.zones) || VIEWS[0]).id;

  if (facadeViews) facadeViews.innerHTML = VIEWS.map((v, i) =>
    `<img class="facade__img${v.id === curView ? ' is-on' : ''}" data-view="${v.id}"` +
    ` src="${v.img}" alt="Vorbraut 14 — ${v.label}"` +
    `${i ? ' loading="lazy"' : ''} decoding="async">`).join('');

  function renderSideBtns() {
    if (!facadeSides) return;
    facadeSides.innerHTML = VIEWS.map((v) =>
      `<button type="button" class="facade__sidebtn${v.id === curView ? ' is-on' : ''}"` +
      ` data-side="${v.id}" aria-pressed="${v.id === curView}">${viewLabel(v)}</button>`).join('');
  }
  renderSideBtns();

  function setSide(side) {
    if (!VIEWS.some((v) => v.id === side)) return;
    curView = side;
    facadeFig.setAttribute('data-view', side);
    // smellisvæðin fylgja sjónarhorninu; hvert getur haft sitt sett
    const sett = svaediFyrir(side);
    byggjaSvaedi(sett);
    facadeFig.setAttribute('data-zones', Object.keys(sett || {}).length ? '1' : '0');
    $$('.facade__img', facadeViews).forEach((im) => im.classList.toggle('is-on', im.dataset.view === side));
    $$('.facade__sidebtn', facadeSides).forEach((x) => {
      const on = x.dataset.side === side;
      x.classList.toggle('is-on', on);
      x.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    // útsýnis-keilurnar á grunnmyndinni fylgja: virka sjónarhornið er brúnt
    $$('#selDiagram .dg-cone').forEach((c) => c.classList.toggle('is-active', c.dataset.side === side));
  }
  setSide(curView);
  if (facadeSides) facadeSides.addEventListener('click', (e) => {
    const b = e.target.closest('.facade__sidebtn'); if (!b) return;
    setSide(b.dataset.side);
  });

  /* Keilurnar á hæðarkortinu skipta um mynd við hover/smell.
     Atburðaveiting á SVG-ið sjálft (ekki per-keilu) — lifir af endurteikningu
     kortsins, sem gerist í hvert sinn sem hæð/íbúð breytist. */
  const selDiagramSvg = $('#selDiagram');
  const inConeEdit = /[?&]conedit\b/.test(location.search);   // í ritli: draga, ekki skipta
  if (selDiagramSvg && !inConeEdit) {
    const pickCone = (e) => {
      const c = e.target.closest && e.target.closest('.dg-cone');
      if (c && c.dataset.side && c.dataset.side !== curView) setSide(c.dataset.side);
    };
    // mousemove er lykilatriði: ef keilan er endurteiknuð undir músinni kviknar
    // ENGINN nýr mouseover/mouseenter — en mousemove heldur áfram að berast.
    selDiagramSvg.addEventListener('mousemove', pickCone);
    selDiagramSvg.addEventListener('mouseover', pickCone);
    selDiagramSvg.addEventListener('click', pickCone);
    selDiagramSvg.addEventListener('touchstart', pickCone, { passive: true });
  }
  // hover á íbúð í grunnmyndinni -> nákvæmlega sú íbúð lýsist upp á byggingamyndinni
  function highlightApt(id, on) {
    $$('polygon', svg).forEach((p) => p.classList.toggle('on', !!on && p.dataset.id === id));
  }

  function statusFill(s) {
    if (s === 'sold') return '#FF5050';        // selt -> kórall-rautt (vorbrautin.is)
    if (s === 'reserved') return '#D8A72C';    // selt með fyrirvara -> gult
    return '#0D710A';                          // til sölu -> dökkgrænt (vorbrautin.is)
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
    // „Skoða" í verðskránni: upp í teikningarkaflann undir veljaranum (ekki popup)
    $$('.aptrow', grid).forEach((r) => r.addEventListener('click', () => selectApt(r.dataset.id)));
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
    // smellur á línuna: næsta doppa stekkur þangað — og eltir músina sé haldið niðri
    track.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.rng__h')) return;               // doppurnar sjá um sig sjálfar
      const v = valAt(e.clientX), r = state[key];
      const w = Math.abs(v - r[0]) <= Math.abs(v - r[1]) ? 0 : 1;
      if (w === 0) r[0] = Math.min(v, r[1]); else r[1] = Math.max(v, r[0]);
      draw(); buildGrid(); syncFacade();
      down(e, w);
    });
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

  // dim facade zones that don't match active filters or the selected floor
  function syncFacade() {
    const filtering = APARTMENTS.some((a) => !matches(a)) || selFloor != null;
    facadeFig.classList.toggle('dim', filtering);
    $$('polygon', svg).forEach((p) => {
      const a = aptById[p.dataset.id];
      const ok = a && matches(a) && (selFloor == null || a.floor === selFloor);
      p.classList.toggle('match', filtering && !!ok);
      const lit = (hoverApt && a && a.id === hoverApt.id) || (!hoverApt && selApt && a && a.id === selApt.id);
      p.classList.toggle('on', !!lit);
    });
  }

  /* ============================== MODAL ================================= */
  const modal = $('#modal');
  const FLOOR_SHAPES = window.VB.FLOOR_SHAPES;
  let currentApt = null;
  let viewFloor = null;      // hæð sem hæðarkortið sýnir núna
  let planView = 'line';     // 'line' = teikning, 'tex' = áferð (textured render)

  const aptsOnFloor = (f) => APARTMENTS.filter((a) => a.floor === f).sort((x, y) => x.id.localeCompare(y.id));

  /* ---- hæðarval (hringir — hæðir sóttar úr gögnunum) ---- */
  function renderFloorSel(active) {
    const sel = $('#mFloorSel');
    sel.innerHTML = FLOOR_LIST
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
    renderDiagramInto($('#mDiagram'), floor, selId, (id) => openModal(aptById[id]));
  }
  // teiknar hæðarkort inn í hvaða svg sem er; onPick keyrir við smell/Enter á íbúð
  function renderDiagramInto(svg, floor, selId, onPick) {
    if (!svg) return;
    const F = FLOOR_SHAPES.floors[floor];
    if (!F) { svg.innerHTML = ''; return; }
    // FASTUR rammi um hæðina — hann breytist ALDREI þótt keilurnar séu dregnar til,
    // svo grunnmyndin haldist kyrr. Keilur utan rammans sjást samt (svg er overflow:visible).
    const vb = (FLOOR_SHAPES.viewBox || '0 0 300 181').split(/\s+/).map(Number);
    // Grunnrammi + teygja svo keilurnar séu INNAN hans. Það skiptir máli: keila sem
    // liggur utan SVG-kassans teiknast (overflow:visible) en tekur EKKI við músinni.
    // Teygjan er takmörkuð (MAX) svo ein keila sem er dregin langt í burtu smækki ekki hæðina.
    const MAX = 110;
    let L = 44, R = 44, T = 36, B = 104;
    (window.VB.VIEW_CONES || []).forEach((c) => {
      const rad = 42 * (c.s || 0.8) + 6;
      L = Math.min(MAX, Math.max(L, vb[0] - (c.x - rad)));
      T = Math.min(MAX, Math.max(T, vb[1] - (c.y - rad)));
      R = Math.min(MAX, Math.max(R, (c.x + rad) - (vb[0] + vb[2])));
      B = Math.min(MAX, Math.max(B, (c.y + rad) - (vb[1] + vb[3])));
    });
    const W = vb[2] + L + R;
    svg.setAttribute('viewBox', `${vb[0] - L} ${vb[1] - T} ${W} ${vb[3] + T + B}`);
    // Stækkum SVG-kassann í sama hlutfalli og rammann -> hæðin helst NÁKVÆMLEGA jafnstór
    // á skjánum þótt ramminn víkki út fyrir keilurnar.
    if (svg.id === 'selDiagram') {
      const grow = W / (vb[2] + 88);
      svg.style.width = (grow * 100) + '%';
      svg.style.marginLeft = (-(grow - 1) * 50) + '%';
    }
    // útsýnis-keilur (sjónarhorn) — nákvæmlega form/hlutföll vorbrautin.is:
    //   <path d="M50 50 30 20a30 30 0 0 1 40 0Z"/> + <circle cx50 cy50 r6/>, hvít útlína.
    // Oddurinn (punkturinn) er myndavélarstaðurinn og fleygurinn vísar á húshliðina.
    // Virk hlið = brún (#aa8765), hin grá (#999). Hover/smellur skiptir um mynd.
    // Sýnilegi fleygurinn er mjór; ósýnilegur hringur utan um hann gerir hann
    // auðveldan að hitta með músinni (annars þarf að hitta nákvæmlega á formið).
    const CONE = '<circle class="dg-cone-hit" cx="0" cy="-16" r="26"/>' +
                 '<path d="M0 0-20-30a30 30 0 0 1 40 0Z"/><circle r="6"/>';
    const curSide = (facadeFig && facadeFig.getAttribute('data-view')) || 'aftan';
    // staðsetning/snúningur/stærð koma úr VIEW_CONES (má draga til með ?conedit)
    let html = (window.VB.VIEW_CONES || []).map((c) =>
      `<g class="dg-cone${c.side === curSide ? ' is-active' : ''}" data-side="${c.side}"
          transform="translate(${c.x},${c.y}) rotate(${c.deg}) scale(${c.s})">${CONE}</g>`).join('');
    // heil grunnplata undir öllu — engin hvít bil sjást nokkurs staðar á byggingunni
    html += F.footprint ? `<polygon class="dg-foot" points="${polyPts(F.footprint)}"/>` : '';
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
    const nd = FLOOR_SHAPES.northDeg, cx = vb[0] + vb[2] + 20, cy = vb[1] - 16, nlen = 19;
    const nth = (nd + 90) * Math.PI / 180;
    const nlx = (cx + nlen * Math.sin(nth)).toFixed(1);
    const nly = (cy - nlen * Math.cos(nth)).toFixed(1);
    html += `<g class="dg-north" transform="translate(${cx},${cy})">
      <circle class="dg-north-ring" r="13.5"/>
      <g transform="rotate(${(nd + 90).toFixed(1)})">
        <path class="dg-north-l" d="M0,-12.8 L-4.3,7 L0,2.9 Z"/>
        <path class="dg-north-r" d="M0,-12.8 L0,2.9 L4.3,7 Z"/>
      </g></g>
      <text class="dg-northlbl" x="${nlx}" y="${nly}">N</text>`;
    svg.innerHTML = html;
    $$('.dg-apt', svg).forEach((g) => {
      const a = aptById[g.dataset.id];
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      if (a) g.setAttribute('aria-label', `${lang === 'is' ? 'Íbúð' : 'Apartment'} ${a.id}, ${roomsLabel(a.rooms)}, ${fmtArea(a.area)} m², ${statusLabel(a.status)}`);
      const pick = () => onPick(g.dataset.id);
      g.addEventListener('click', pick);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      // hover á íbúð í grunnmyndinni -> sama íbúð lýsist upp á byggingamyndinni
      if (svg.id === 'selDiagram') {
        g.addEventListener('mouseenter', () => highlightApt(g.dataset.id, true));
        g.addEventListener('mouseleave', () => highlightApt(g.dataset.id, false));
        g.addEventListener('focus', () => highlightApt(g.dataset.id, true));
        g.addEventListener('blur', () => highlightApt(g.dataset.id, false));
      }
    });
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
    else { planView = 'line'; planImg.src = 'assets/plans/' + a.plan + PLANV; }
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

  /* ========== VELJARI — bygging + hæðir + hæðarkort + upplýsingar ======== */
  const selFloorsEl = $('#selFloors'), selDiagramEl = $('#selDiagram'),
        selInfoEl = $('#selInfo'), selLegendEl = $('#selLegend');
  let selApt = null;      // valin íbúð í veljaranum (ekki það sama og modal)
  let selFloor = null;    // valin hæð (null = allar hæðir)
  let hoverApt = null;    // íbúð sem sveimað er yfir á byggingamyndinni (fyrir lýsingu)
  let planFloor = null;   // hæðin sem grunnmyndin sýnir — helst þar sem síðast var staðnæmst
  const FLOOR_LIST = [...new Set(APARTMENTS.map((a) => a.floor))].sort((a, b) => a - b);

  function selectApt(id) {
    const a = aptById[id]; if (!a) return;
    selApt = a;
    planFloor = a.floor;
    if (selFloor != null && a.floor !== selFloor) selFloor = a.floor;
    renderSelector();
    showAptView(a);                       // teikningin birtist fyrir neðan + mjúkt skrun
  }

  function renderSelFloors() {
    if (!selFloorsEl) return;
    const shown = planFloor != null ? planFloor : (selApt ? selApt.floor : FLOOR_LIST[0]);  // takkinn fylgir sýndri hæð
    // Takkarnir eru byggðir EINU SINNI og svo bara uppfærðir — annars eyðileggst
    // takkinn undir músinni við hverja endurteikningu og hover-ið slitnar.
    if (!selFloorsEl.children.length) {
      selFloorsEl.innerHTML = FLOOR_LIST.map((f) =>
        `<button type="button" class="select__fbtn" data-f="${f}">${f}.</button>`).join('');
      $$('.select__fbtn', selFloorsEl).forEach((b) => {
        const f = +b.dataset.f;
        b.addEventListener('click', () => {
          selFloor = (selFloor === f) ? null : f;          // smellur aftur = afvelja síuna
          planFloor = f;                                   // grunnmyndin sýnir þessa hæð áfram
          if (selApt && selApt.floor !== f) selApt = null;
          renderSelector();
        });
        // sveim yfir hæð -> grunnmyndin sýnir þá hæð (og situr þar áfram)
        const show = () => { if (planFloor !== f) { planFloor = f; renderSelector(); } };
        b.addEventListener('mouseenter', show);
        b.addEventListener('focus', show);
      });
    }
    $$('.select__fbtn', selFloorsEl).forEach((b) => {
      const f = +b.dataset.f;
      b.classList.toggle('is-on', shown === f);
      b.setAttribute('aria-pressed', selFloor === f ? 'true' : 'false');
    });
  }

  function renderSelLegend() {
    if (!selLegendEl) return;
    // allar þrjár stöðurnar alltaf sýndar — skýringin á að vera heil lesning
    // á litakerfinu, líka þegar engin íbúð er í tiltekinni stöðu þá stundina.
    selLegendEl.innerHTML = ['available', 'reserved', 'sold']
      .map((s) => `<li class="select__leg select__leg--${s}"><i aria-hidden="true"></i>${statusLabel(s)}</li>`).join('');
  }

  /* ---- Valin íbúð: teikning + upplýsingar birtast FYRIR NEÐAN veljarann ----
     Engin popup — kaflinn opnast mjúklega og síðan rennur sjálfkrafa niður (vorbrautin-stíll). */
  const avEl = $('#aptview');

  /* Teiknar bílakjallarauppdráttinn með merkingum.
     ibudId = null -> engin merking, aðeins stæðin sjálf (þegar kjallarinn er
     skoðaður einn og sér af framhliðinni). */
  function teiknaKjallara(ibudId) {
    const K = window.VB.KJALLARI;
    const imgEl = $('#avKjPlan'), svgEl = $('#avKjSvg'), txtEl = $('#avKjTxt');
    if (!K || !imgEl || !svgEl) return;
    const k = (ibudId && K.ibudir[ibudId]) || {};
    imgEl.loading = 'eager';
    imgEl.src = K.mynd + PLANV;
    imgEl.alt = ibudId
      ? (lang === 'is' ? 'Bílakjallari — íbúð ' : 'Parking garage — apartment ') + ibudId
      : t('facade.kjallari');
    imgEl.style.cursor = 'zoom-in';
    imgEl.onclick = () => window.open(K.mynd + PLANV, '_blank', 'noopener');
    svgEl.setAttribute('viewBox', '0 0 ' + K.w + ' ' + K.h);

    const reitur = (r, cls) =>
      '<rect class="' + cls + '" x="' + r[0] + '" y="' + r[1] +
      '" width="' + (r[2] - r[0]) + '" height="' + (r[3] - r[1]) + '" rx="4"/>';
    let mm = '';
    // Þríhyrningur í hvert stæði, eins og strikaða merkið á aðaluppdrættinum:
    // ófylltur, punktalína, og fyllir stæðið. Oddurinn snýr að útveggnum —
    // efri röðin upp, neðri röðin niður — svo hann vísi eins og nef bílsins.
    const min = k.staedi || [];
    Object.entries(K.staediReitir || {}).forEach(([nafn, r]) => {
      const bw = r[2] - r[0], bh = r[3] - r[1];
      const ix = bw * 0.13, iy = bh * 0.12;           // loft inni í stæðinu
      const v = r[0] + ix, h = r[2] - ix;             // vinstri/hægri
      const mx = (r[0] + r[2]) / 2;
      const upp = (r[1] + r[3]) / 2 < K.h / 2;        // efri röðin
      const d = upp
        ? `M${mx} ${r[1] + iy} L${h} ${r[3] - iy} L${v} ${r[3] - iy} Z`
        : `M${mx} ${r[3] - iy} L${h} ${r[1] + iy} L${v} ${r[1] + iy} Z`;
      mm += `<path class="kj-thri${min.indexOf(nafn) >= 0 ? ' is-min' : ''}" d="${d}"/>`;
    });
    // Reitirnir um stæði ÞESSARAR íbúðar eru hrein afleiða af staedi-listanum.
    (k.staedi || []).forEach((nafn) => {
      const r = (K.staediReitir || {})[nafn];
      if (r) mm += reitur(r, 'kj-staedi');
    });
    if (k.geymsla) mm += reitur(k.geymsla, 'kj-geymsla');
    svgEl.innerHTML = mm;

    if (!txtEl) return;
    if (!ibudId) { txtEl.innerHTML = ''; txtEl.hidden = true; return; }
    txtEl.hidden = false;
    const st = k.staedi || [];
    // Ein lína á hvorn lið, hvor undir öðrum — ekki hlið við hlið.
    const lina = (cls, merki, gildi) =>
      '<span class="kj-lina"><b class="kj-p kj-p--' + cls + '">' + merki + '</b>' +
      '<span class="kj-gildi">' + gildi + '</span></span>';
    txtEl.innerHTML =
      (st.length
        ? lina('staedi', t('av.kjStaedi'), st.join(' · '))
        // EKKI kj-lina hér: display:contents myndi drepa reitinn og þar með
        // grid-column:1/-1, svo setningin lenti í fyrsta dálki og merkið við hlið hennar.
        : '<span class="kj-ekkert">' + t('av.kjEkkert') + '</span>') +
      (k.geymsla ? lina('geymsla', t('av.kjGeymsla'), ibudId) : '');
  }

  /* Bílakjallarinn skoðaður EINN OG SÉR — smellt á hann á framhliðinni.
     Sami kafli og íbúðirnar nota, svo hegðunin sé eins: hann opnast fyrir
     neðan veljarann og síðan rennur sjálfkrafa niður á hann. */
  let kjallaraHamur = false;
  function showKjallaraView() {
    if (!avEl) return;
    const K = window.VB.KJALLARI;
    if (!K) { window.location.href = 'adgengi.html'; return; }
    kjallaraHamur = true;
    avEl.dataset.hamur = 'kjallari';
    selApt = null;                       // engin íbúð valin á meðan
    renderSelector();

    $('#avTitle').textContent = t('facade.kjallari');
    const fjStaedi = Object.keys(K.staediReitir || {}).length;
    const fjGeymslur = Object.values(K.ibudir || {}).filter((x) => x.geymsla).length;
    $('#avSpecs').innerHTML = [
      [t('kj.flatarmal'), '345,0 m²'],
      [t('av.kjStaedi'), String(fjStaedi)],
      [t('kj.geymslur'), String(fjGeymslur)],
      [t('kj.adgengi'), t('kj.adgengiGildi')],
    ].map(([k2, v]) => `<div><dt>${k2}</dt><dd>${v}</dd></div>`).join('');

    const cta = $('#avCta', avEl);
    if (cta) { cta.setAttribute('href', 'adgengi.html'); cta.textContent = t('kj.cta'); }

    // fliparnir og íbúðarteikningin eiga ekki við hér
    const flipar = $('.aptview__flipar', avEl);
    if (flipar) flipar.hidden = true;
    const plan = $('#avPlan');
    if (plan) { plan.hidden = true; plan.removeAttribute('src'); }
    const cap = $('.aptview__plan > .aptview__cap', avEl);
    if (cap) cap.hidden = false;
    const boxEl = $('#avKjallari');
    if (boxEl) boxEl.hidden = false;

    teiknaKjallara(null);

    avEl.hidden = false;
    setTimeout(() => {
      avEl.classList.add('is-in');
      const NAV = nav ? nav.offsetHeight : 84;
      const top = scroller.scrollTop + avEl.getBoundingClientRect().top - NAV - 12;
      goToSection(Math.max(0, top));
    }, 30);
  }
  window.VB.showKjallaraView = showKjallaraView;

  function showAptView(a) {
    if (!avEl || !a) return;
    if (kjallaraHamur) {                 // koma til baka úr kjallarahamnum
      kjallaraHamur = false;
      delete avEl.dataset.hamur;
      const fl = $('.aptview__flipar', avEl); if (fl) fl.hidden = false;
      const ct = $('#avCta', avEl); if (ct) ct.textContent = t('av.cta');
      const pl = $('#avPlan'); if (pl) pl.hidden = false;
    }
    $('#avTitle').textContent = (lang === 'is' ? 'Íbúð ' : 'Apartment ') + a.id;

    // sömu reitir og á vorbrautin.is: heimilisfang, hæð, herb., birt stærð, geymsla, verð
    const rows = [
      [lang === 'is' ? 'Heimilisfang' : 'Address', 'Vorbraut 14'],
      [lang === 'is' ? 'Hæð' : 'Floor', floorLabel(a.floor)],
      [lang === 'is' ? 'Herb.' : 'Rooms', String(a.rooms)],
      [lang === 'is' ? 'Birt stærð' : 'Size', fmtArea(a.area) + ' m²'],
    ];
    if (a.balcony) rows.push([lang === 'is' ? 'Svalir' : 'Balcony', fmtArea(a.balcony) + ' m²']);
    rows.push([lang === 'is' ? 'Bílastæði' : 'Parking', String(parkOf(a) || '—')]);
    rows.push([lang === 'is' ? 'Verð' : 'Price',
               a.price ? fmtKr(a.price) : statusLabel(a.status)]);
    $('#avSpecs').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

    // Fyrirspurnarhnappurinn tekur íbúðina með sér — hafa-samband.html les
    // ?ibud og fyllir skilaboðin sjálfkrafa.
    const cta = $('#avCta', avEl);
    if (cta) cta.setAttribute('href', 'hafa-samband.html?ibud=' + encodeURIComponent(a.id));

    const plan = $('#avPlan');
    plan.src = 'assets/plans/' + a.plan + PLANV;
    plan.alt = (lang === 'is' ? 'Grunnmynd íbúðar ' : 'Floor plan ') + a.id;
    // smella á teikningu -> myndin ein opnast í fullri upplausn (nýr flipi)
    plan.onclick = () => window.open('assets/plans/' + a.plan + PLANV, '_blank', 'noopener');

    // ---- bílakjallari: stæði og geymsla þessarar íbúðar merkt á uppdrættinum ----
    teiknaKjallara(a.id);
    (function kjallari() {
      const boxEl = $('#avKjallari');
      const flipar = $$('.aptview__flipi', avEl);
      if (!boxEl || !flipar.length) return;
      // Kjallarinn liggur FYRIR NEÐAN grunnmyndina en er falinn þar til ýtt er
      // á takkann — þá opnast hann og síðan skrunar mjúklega niður á hann.
      // (CSS: .aptview__plan img hafði display:block sem sló út [hidden].)
      const skrunaAd = (el) => {
        if (window.VB.stopScroll) window.VB.stopScroll();   // stöðva sjálfvirka skrunið
        const NAV = nav ? nav.offsetHeight : 84;
        const mark = scroller.scrollTop + el.getBoundingClientRect().top - NAV - 20;
        goToSection(Math.max(0, mark));
      };
      const synaFlipa = (hvad, skruna) => {
        flipar.forEach((b) => {
          const on = b.dataset.flipi === hvad;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        boxEl.hidden = hvad !== 'kjallari';                 // grunnmyndin stendur alltaf
        if (!skruna) return;
        // rendera fyrst, skruna svo — annars mælum við ranga stöðu
        setTimeout(() => skrunaAd(hvad === 'kjallari' ? boxEl : plan), 30);
      };
      flipar.forEach((b) => { b.onclick = () => synaFlipa(b.dataset.flipi, true); });
      synaFlipa('ibud');

    })();

    avEl.hidden = false;
    // setTimeout (ekki rAF) — rAF keyrir ekki í földum/óvirkum flipum
    setTimeout(() => {
      avEl.classList.add('is-in');
      // .select er position:relative, svo offsetTop dugar ekki — reikna út frá skrunstöðu
      const er = avEl.getBoundingClientRect();
      const NAV = nav ? nav.offsetHeight : 84;          // fasta valmyndin efst
      const top = scroller.scrollTop + er.top - NAV - 12;
      goToSection(Math.max(0, top));                    // sama mjúka skrunið og annars staðar
    }, 30);
  }

  function renderSelInfo() {
    if (!selInfoEl) return;
    selInfoEl.innerHTML = '';   // upplýsingarnar birtast fyrir neðan (.aptview)
  }


  function renderSelector() {
    if (!selFloorsEl) return;                              // veljarinn er aðeins á forsíðunni
    renderSelFloors();
    renderSelLegend();
    // grunnmyndin situr á þeirri hæð sem síðast var staðnæmst við (planFloor)
    const f = planFloor != null ? planFloor : (selApt ? selApt.floor : FLOOR_LIST[0]);
    renderDiagramInto(selDiagramEl, f, hoverApt ? hoverApt.id : (selApt ? selApt.id : null), selectApt);
    renderSelInfo();
    syncFacade();
  }
  window.VB.renderSelector = renderSelector;   // ?conedit teiknar upp á nýtt eftir drag

  /* ----- staða íbúða úr Supabase (lifandi: grænt/gult/rautt) ----------- */
  if (window.VB && typeof VB.getStatuses === 'function') {
    VB.getStatuses().then((m) => {
      if (!m || !Object.keys(m).length) return;
      APARTMENTS.forEach((a) => { if (m[a.id]) a.status = m[a.id]; });
      $$('polygon', svg).forEach((p) => {
        const a = aptById[p.dataset.id];
        const litur = (a && a.status !== 'available') ? statusFill(a.status) : '';
        p.style.fill = litur;
        p.style.stroke = litur;
      });
      buildGrid(); syncZoneAria(); renderSelector(); syncFacade();
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
    if (aptChanged) { syncZoneAria(); renderSelector(); syncFacade(); if (currentApt && modal && !modal.hidden) openModal(currentApt); }
  }).catch(() => {});
})();
