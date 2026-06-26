/* ==========================================================================
   Vorbraut 14 — one continuous cinematic scroll
   Timeline (scroll progress p, single sticky <canvas>):
     0   → D : fly DOWN   (aerial → front)         assets/cine/  f001–f096
     D   → F : HOLD on the front frame (f096)       — interactive facade here
     F   → 1 : fly UP     (front → top-down aerial)  assets/cine2/ f001–f096
   Nearest crisp frame, no crossfade — never blurs. Hero text fades out at the
   start; the hover zones + text fade in only during the hold (so they line up).
   ========================================================================== */
(function () {
  'use strict';
  const scroller = document.getElementById('scroller');
  const cine = document.getElementById('cine');
  const stick = document.getElementById('cineStick');
  const canvas = document.getElementById('cineCanvas');
  const facade = document.getElementById('facade');
  const hero = document.getElementById('cineHero');
  if (!scroller || !cine || !stick || !canvas || !facade || !hero) return;

  const ctx = canvas.getContext('2d');
  const N1 = 96;
  const down = [];
  const DIR = 'assets/cine/';
  const frameSrc = (i) => DIR + 'f' + String(i).padStart(3, '0') + '.webp';
  const loadFrame = (i) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { if (i <= 2) render(); };
    img.src = frameSrc(i);
    down[i - 1] = img;
  };
  // Hraði: sækjum HERO-rammann (f001) strax svo forsíðan birtist nánast samstundis;
  // hinir 95 streyma í bakgrunni eftir að síðan er komin upp (frestað).
  loadFrame(1);
  loadFrame(2);
  // Hversu þétt sækjum við ramma? Færri beiðnir á hægri tengingu / í gagnasparnaði.
  // Fyrst gróf þekja yfir allt niðurflugið (annar/fjórði hver rammi) -> nothæft strax,
  // svo fyllt upp í alla ramma fyrir fulla mýkt á góðri tengingu (frestað).
  const conn = navigator.connection || {};
  const slow = conn.saveData || /2g/.test(conn.effectiveType || '');
  const good = !conn.effectiveType || conn.effectiveType === '4g';   // wifi/4g eða óþekkt
  const step = slow ? 4 : (conn.effectiveType === '3g' ? 3 : 2);
  const loadStepped = () => {
    for (let i = 3; i <= N1; i += step) loadFrame(i);
    if (!down[N1 - 1]) loadFrame(N1);             // loka-ramminn (borðinn) alltaf
    if (step > 1 && good) {                         // önnur umferð (aðeins á góðri tengingu): full mýkt
      const fill = () => { for (let i = 3; i < N1; i++) if (!down[i - 1]) loadFrame(i); };
      if ('requestIdleCallback' in window) requestIdleCallback(fill, { timeout: 6000 });
      else setTimeout(fill, 2500);
    }
  };
  if ('requestIdleCallback' in window) requestIdleCallback(loadStepped, { timeout: 1800 });
  else setTimeout(loadStepped, 250);

  // timeline breakpoint (fraction of total scroll)
  const D = 0.62;   // fly-down ends / hold (interactive facade) begins and stays til footer

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (p, a, b) => { const t = clamp((p - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // Skyndiminni á útlits-málum (uppfært við resize) — kemur í veg fyrir layout-lestur
  // í hverjum skrun-ramma, sem var helsta orsök hökts á síma.
  let vpW = window.innerWidth, vpH = window.innerHeight, cineTop = 0, cineH = 0;
  function measure() { vpW = window.innerWidth; vpH = window.innerHeight; cineTop = cine.offsetTop; cineH = cine.offsetHeight; }

  const facadeSides = document.getElementById('facadeSides');
  const isMobile = () => vpW <= 860;
  // Hærri borði en 16:9 -> cover sníður landslagið af hliðunum og byggingin (aðalatriðið)
  // verður stærri á síma. Zoom-out endar því á stærri mynd (fer ekki of langt upp).
  const bannerH = () => Math.round(vpW * 0.72);      // borða-hæð (stærri bygging á síma)
  const GAP = () => Math.round(vpH * 0.04) + 26;     // dökkt svigrúm undir navinu (minna -> mynd ofar)
  const STRIP = 64;                                  // dökk röð undir myndinni fyrir Aftan/Framan
  const cardH = () => GAP() + bannerH() + STRIP;     // sett-hæð borðans á síma

  function resizeCanvas() {
    measure();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(vpW * dpr);
    canvas.height = Math.round(vpH * dpr);
    // byggingin er alltaf teiknuð COVER (zoom-out borðinn notar líka cover) → slice
    const fsvg = document.getElementById('facadeSvg');
    if (fsvg) fsvg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    if (!isMobile()) stick.style.height = '';   // tölva: CSS sér um 100vh
    render();
  }

  function fitRect(img, contain) {
    const cw = canvas.width, ch = canvas.height;
    const ir = img.naturalWidth / img.naturalHeight, wider = (cw / ch) > ir;
    let dw, dh;
    if (contain ? wider : !wider) { dh = ch; dw = ch * ir; }
    else { dw = cw; dh = cw / ir; }
    return { dx: (cw - dw) / 2, dy: (ch - dh) / 2, dw, dh };
  }
  // t=0 -> cover (fyllir skjá); t=1 -> contain (öll byggingin sést, letterbox).
  // Á lóðréttum síma "drögum við til baka" í heila byggingu þegar facade birtist,
  // svo allar íbúðir séu sýnilegar/smellanlegar (annars klippast hliðarnar af).
  function drawFrame(img, t, zoom) {
    if (!img || !img.complete || !img.naturalWidth) return;
    const a = fitRect(img, false), b = fitRect(img, true);
    let dx = a.dx + (b.dx - a.dx) * t, dy = a.dy + (b.dy - a.dy) * t;
    let dw = a.dw + (b.dw - a.dw) * t, dh = a.dh + (b.dh - a.dh) * t;
    if (zoom && zoom !== 1) {                 // stafrænn zoom um miðju -> stærri startrammi
      const cx = canvas.width / 2, cy = canvas.height / 2;
      dx = cx - (cx - dx) * zoom; dy = cy - (cy - dy) * zoom;
      dw *= zoom; dh *= zoom;
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  // Startrammi stækkaður (byggingin meira áberandi á hero) og zoom-ið fjarar út
  // snemma í niðurfluginu svo flugið taki mjúkt við. 1.0 = enginn auka-zoom.
  const startZoom = (p) => 1 + 0.22 * (1 - smooth(p, 0, 0.20));

  function progAt(sTop) {
    const total = cineH - vpH;
    if (total <= 0) return 0;
    return clamp((sTop - cineTop) / total, 0, 1);
  }
  function progress() { return progAt(scroller.scrollTop); }

  function nearestLoaded(arr, idx) {
    if (arr[idx] && arr[idx].complete && arr[idx].naturalWidth) return arr[idx];
    for (let d = 1; d < arr.length; d++) {
      const lo = idx - d, hi = idx + d;
      if (lo >= 0 && arr[lo] && arr[lo].complete && arr[lo].naturalWidth) return arr[lo];
      if (hi < arr.length && arr[hi] && arr[hi].complete && arr[hi].naturalWidth) return arr[hi];
    }
    return null;
  }

  // tölva: niðurflug 0→D, svo HOLD á f096. sími: niðurflug 0→1 (zoom-out tekur við eftir).
  function pickFrame(p) {
    if (isMobile()) return nearestLoaded(down, Math.round(p * (N1 - 1)));
    if (p < D) return nearestLoaded(down, Math.round((p / D) * (N1 - 1)));
    return down[N1 - 1] || nearestLoaded(down, N1 - 1);
  }

  function render() {
    const sTop = scroller.scrollTop;
    const p = progAt(sTop);
    ctx.fillStyle = '#0b0c0d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // hero text fade-ast snemma í niðurfluginu
    const heroOp = 1 - smooth(p, 0.0, isMobile() ? 0.16 : 0.06);
    hero.style.opacity = heroOp;
    hero.style.pointerEvents = heroOp > 0.5 ? 'auto' : 'none';

    if (isMobile()) {
      // EITT samfellt skot: þegar niðurflugi lýkur ZOOM-AR byggingin út — .cine__stick
      // minnkar úr 100vh í borða-kort (svigrúm efst + 16:9 mynd + takkaröð) og íbúðalistinn
      // rís upp undir. height = fjarlægð að botni .cine ⇒ ekkert bil við íbúðirnar.
      const vh = vpH;
      const CARD = cardH();
      const cineBottom = cineTop + cineH;
      const h = clamp(cineBottom - sTop, CARD, vh);
      stick.style.height = h + 'px';
      const m = (vh - CARD) > 0 ? clamp((vh - h) / (vh - CARD), 0, 1) : 0;   // 0 í niðurflugi → 1 fullzoom-að
      const canvasOp = clamp(1 - m * 2.2, 0, 1);                 // canvas fade-ast út → GAP/STRIP verða dökk
      if (canvasOp > 0) drawFrame(pickFrame(p), 0, startZoom(p)); // sleppa teikningu þegar canvas er ósýnilegt
      // myndin færist neðar (GAP eykst) og skilur eftir STRIP fyrir takkann — zoom-out með cover.
      // height:auto svo top+bottom ráði boxinu (CSS height:100% myndi annars ráða).
      facade.style.height = 'auto';
      facade.style.top = Math.round(GAP() * m) + 'px';
      facade.style.bottom = Math.round(STRIP * m) + 'px';
      const fo = smooth(h, vh, vh - 0.12 * vh);                 // facade fade-ast inn um leið og zoom-out hefst
      facade.style.opacity = fo;
      facade.style.pointerEvents = fo > 0.9 ? 'auto' : 'none';
      canvas.style.opacity = String(canvasOp);
      if (facadeSides) {                                        // Aftan/Framan UNDIR myndinni í STRIP-inu
        const so = smooth(m, 0.62, 0.96);
        facadeSides.style.opacity = so;
        facadeSides.style.pointerEvents = so > 0.6 ? 'auto' : 'none';
        facadeSides.style.bottom = Math.max(2, Math.round((STRIP * m - 38) / 2)) + 'px';
      }
    } else {
      drawFrame(pickFrame(p), 0, startZoom(p)); // tölva: cover + stærri startrammi
      // tölva: facade-yfirlag (+ Aftan/Framan) fade-ast inn við HOLD og helst
      facade.style.top = ''; facade.style.bottom = ''; facade.style.height = '';
      canvas.style.opacity = '';
      const facOp = smooth(p, D - 0.04, D);
      facade.style.opacity = facOp;
      facade.style.pointerEvents = (p >= D - 0.01) ? 'auto' : 'none';
      if (facadeSides) {
        facadeSides.style.opacity = facOp;
        facadeSides.style.pointerEvents = (p >= D - 0.01) ? 'auto' : 'none';
        facadeSides.style.bottom = '';
      }
    }
  }

  window.__cine = { render, progress, D };

  // Þröttlun: eitt render per skjá-ramma þó skrun-event komi mun oftar -> minna hökt.
  let rafPending = false;
  function onScroll() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; render(); });
  }
  scroller.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', resizeCanvas);

  /* ---- animated jump for [data-cinedown] (to the facade) and [data-totop] ---- */
  let anim;
  const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  const easeOut = (p) => 1 - Math.pow(1 - p, 3);   // decelerar inn í stoppið → segul-tilfinning
  function scrollTo(top, durOverride, easeFn) {
    if (anim) cancelAnimationFrame(anim);
    const start = scroller.scrollTop, dist = top - start;
    if (Math.abs(dist) < 2) return;
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) { scroller.scrollTo({ top, behavior: 'instant' }); render(); return; }
    const ease = easeFn || easeInOut;
    const dur = durOverride != null ? durOverride : clamp(Math.abs(dist) * 0.45, 600, 1500);
    let t0 = null;
    const safety = setTimeout(() => { scroller.scrollTo({ top, behavior: 'instant' }); render(); anim = null; }, dur + 300);
    const step = (ts) => {
      if (t0 == null) t0 = ts;
      const k = Math.min(1, (ts - t0) / dur);
      scroller.scrollTo({ top: start + dist * ease(k), behavior: 'instant' });
      render();
      if (k < 1) anim = requestAnimationFrame(step); else { anim = null; clearTimeout(safety); }
    };
    anim = requestAnimationFrame(step);
  }
  // skruna að interactive byggingunni: tölva = HOLD-ið; sími = þar sem borðinn hefur
  // zoom-ast út og íbúðalistinn er kominn undir hann.
  const cinedownTarget = () => isMobile()
    ? cineTop + cineH - cardH()
    : cineTop + (cineH - vpH) * Math.min(D + 0.10, 0.96);
  document.querySelectorAll('[data-cinedown]').forEach((el) => el.addEventListener('click', (e) => { if (e.cancelable) e.preventDefault(); scrollTo(cinedownTarget()); }));
  document.querySelectorAll('[data-totop]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); scrollTo(0); }));

  /* ---- sími: segul-snap á interactive byggingar-stoppið --------------------
     Á síma er erfitt að nema staðar nákvæmlega þar sem byggingin hefur zoom-ast
     fullt út (þar sem framhliðin verður smellanleg). Þegar skrun stöðvast nálægt
     þeim púnkti rennum við mjúklega á hann — eins og scroll-snap — svo notandinn
     lendir alltaf á hreinu byggingar-stoppi í stað þess að stöðvast í miðju zoom-i.
     Aðeins á síma; sleppt ef notandi kýs minni hreyfingu (prefers-reduced-motion). */
  let touching = false, settleTimer = 0;
  const reduceMo = matchMedia('(prefers-reduced-motion:reduce)');
  function snapSettle() {
    if (!isMobile() || touching || reduceMo.matches || anim) return;
    const st = scroller.scrollTop;
    const target = cineTop + cineH - cardH();         // interactive framhliðin (fullzoom-uð út)
    const bandTop = cineTop + cineH - vpH;            // þar sem zoom-out hefst
    const lo = bandTop - Math.round(vpH * 0.30);      // sterkt grip á niðurfluginu (þar sem maður þarf hjálp)
    const hi = target + Math.round(vpH * 0.07);       // létt að neðan: bara smá-overshoot, treður ekki á listanum
    if (st >= lo && st <= hi && Math.abs(st - target) > 4) {
      scrollTo(target, clamp(Math.abs(st - target) * 0.42, 220, 460), easeOut);   // snöggt, decelerar inn
    }
  }
  const queueSettle = () => { clearTimeout(settleTimer); settleTimer = setTimeout(snapSettle, 70); };
  scroller.addEventListener('touchstart', () => { touching = true; }, { passive: true });
  scroller.addEventListener('touchend', () => { touching = false; queueSettle(); }, { passive: true });
  scroller.addEventListener('touchcancel', () => { touching = false; queueSettle(); }, { passive: true });
  scroller.addEventListener('scroll', queueSettle, { passive: true });
  // Nákvæmari kveiking þar sem hann er studdur: 'scrollend' skýtur þegar skrun raunverulega
  // stöðvast (líka eftir momentum), svo snöpin grípur strax án þess að bíða eftir debounce.
  if ('onscrollend' in window) scroller.addEventListener('scrollend', () => { if (!touching) snapSettle(); });

  resizeCanvas();
  render();
})();
