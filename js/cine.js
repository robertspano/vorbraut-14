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

  const facadeSides = document.getElementById('facadeSides');
  const isMobile = () => window.innerWidth <= 860;
  const bannerH = () => Math.round(window.innerWidth * 9 / 16);   // 16:9 borða-hæð
  const GAP = () => Math.round(window.innerHeight * 0.045) + 44;  // dökkt svigrúm undir navinu (mynd neðar)
  const STRIP = 66;                                               // dökk röð undir myndinni fyrir Aftan/Framan
  const cardH = () => GAP() + bannerH() + STRIP;                  // sett-hæð borðans á síma

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
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
  function drawFrame(img, t) {
    if (!img || !img.complete || !img.naturalWidth) return;
    const a = fitRect(img, false), b = fitRect(img, true);
    const dx = a.dx + (b.dx - a.dx) * t, dy = a.dy + (b.dy - a.dy) * t;
    const dw = a.dw + (b.dw - a.dw) * t, dh = a.dh + (b.dh - a.dh) * t;
    ctx.globalAlpha = 1;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function progress() {
    const total = cine.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return clamp((scroller.scrollTop - cine.offsetTop) / total, 0, 1);
  }

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
    const p = progress();
    ctx.fillStyle = '#0b0c0d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawFrame(pickFrame(p), 0);              // alltaf cover — engin letterbox

    // hero text fade-ast snemma í niðurfluginu
    const heroOp = 1 - smooth(p, 0.0, isMobile() ? 0.16 : 0.06);
    hero.style.opacity = heroOp;
    hero.style.pointerEvents = heroOp > 0.5 ? 'auto' : 'none';

    if (isMobile()) {
      // EITT samfellt skot: þegar niðurflugi lýkur ZOOM-AR byggingin út — .cine__stick
      // minnkar úr 100vh í borða-kort (svigrúm efst + 16:9 mynd + takkaröð) og íbúðalistinn
      // rís upp undir. height = fjarlægð að botni .cine ⇒ ekkert bil við íbúðirnar.
      const vh = window.innerHeight;
      const CARD = cardH();
      const cineBottom = cine.offsetTop + cine.offsetHeight;
      const h = clamp(cineBottom - scroller.scrollTop, CARD, vh);
      stick.style.height = h + 'px';
      const m = (vh - CARD) > 0 ? clamp((vh - h) / (vh - CARD), 0, 1) : 0;   // 0 í niðurflugi → 1 fullzoom-að
      // myndin færist neðar (GAP eykst) og skilur eftir STRIP fyrir takkann — zoom-out með cover.
      // height:auto svo top+bottom ráði boxinu (CSS height:100% myndi annars ráða).
      facade.style.height = 'auto';
      facade.style.top = Math.round(GAP() * m) + 'px';
      facade.style.bottom = Math.round(STRIP * m) + 'px';
      const fo = smooth(h, vh, vh - 0.12 * vh);                 // facade fade-ast inn um leið og zoom-out hefst
      facade.style.opacity = fo;
      facade.style.pointerEvents = fo > 0.9 ? 'auto' : 'none';
      canvas.style.opacity = String(clamp(1 - m * 2.2, 0, 1));  // canvas fade-ast út → GAP/STRIP verða dökk
      if (facadeSides) {                                        // Aftan/Framan UNDIR myndinni í STRIP-inu
        const so = smooth(m, 0.62, 0.96);
        facadeSides.style.opacity = so;
        facadeSides.style.pointerEvents = so > 0.6 ? 'auto' : 'none';
        facadeSides.style.bottom = Math.max(2, Math.round((STRIP * m - 38) / 2)) + 'px';
      }
    } else {
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

  scroller.addEventListener('scroll', render, { passive: true });
  window.addEventListener('resize', resizeCanvas);

  /* ---- animated jump for [data-cinedown] (to the facade) and [data-totop] ---- */
  let anim;
  const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  function scrollTo(top) {
    if (anim) cancelAnimationFrame(anim);
    const start = scroller.scrollTop, dist = top - start;
    if (Math.abs(dist) < 2) return;
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) { scroller.scrollTo({ top, behavior: 'instant' }); render(); return; }
    const dur = clamp(Math.abs(dist) * 0.45, 600, 1500);
    let t0 = null;
    const safety = setTimeout(() => { scroller.scrollTo({ top, behavior: 'instant' }); render(); }, dur + 300);
    const step = (ts) => {
      if (t0 == null) t0 = ts;
      const k = Math.min(1, (ts - t0) / dur);
      scroller.scrollTo({ top: start + dist * easeInOut(k), behavior: 'instant' });
      render();
      if (k < 1) anim = requestAnimationFrame(step); else clearTimeout(safety);
    };
    anim = requestAnimationFrame(step);
  }
  // skruna að interactive byggingunni: tölva = HOLD-ið; sími = þar sem borðinn hefur
  // zoom-ast út og íbúðalistinn er kominn undir hann.
  const cinedownTarget = () => isMobile()
    ? cine.offsetTop + cine.offsetHeight - cardH()
    : cine.offsetTop + (cine.offsetHeight - window.innerHeight) * Math.min(D + 0.10, 0.96);
  document.querySelectorAll('[data-cinedown]').forEach((el) => el.addEventListener('click', (e) => { if (e.cancelable) e.preventDefault(); scrollTo(cinedownTarget()); }));
  document.querySelectorAll('[data-totop]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); scrollTo(0); }));

  resizeCanvas();
  render();
})();
