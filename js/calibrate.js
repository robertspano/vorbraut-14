/* ==========================================================================
   Vorbraut 14 — handvirkt kvörðunartól fyrir hover-fleti
   Opnaðu  http://localhost:5173/?edit
   Dragðu kassana á íbúðirnar, breyttu stærð með hornunum. Vistast sjálfkrafa
   (localStorage) og „Afrita kóða" gefur kóðann fyrir js/data.js.
   ========================================================================== */
(function () {
  'use strict';
  if (!/[?&]edit\b/.test(location.search)) return;

  const IW = 1280, IH = 720;
  const round = (n) => Math.round(n);

  function cover() {
    const vw = innerWidth, vh = innerHeight, ir = IW / IH, cr = vw / vh;
    let scale, ox, oy;
    if (cr > ir) { scale = vw / IW; ox = 0; oy = (vh - IH * scale) / 2; }
    else { scale = vh / IH; oy = 0; ox = (vw - IW * scale) / 2; }
    return { scale, ox, oy };
  }

  let zones = {}, sel = null, ui = {}, boxes = {};

  function ready(fn) { (window.VB && window.__cine && document.getElementById('facade')) ? fn() : setTimeout(() => ready(fn), 60); }
  ready(init);

  function init() {
    // polygons -> {x,y,w,h} rects in image space
    const Z = window.VB.FACADE.zones;
    Object.entries(Z).forEach(([id, poly]) => {
      const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
      zones[id] = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    });

    // lock the view onto the held front frame (the interactive facade)
    const scroller = document.getElementById('scroller');
    const cine = document.getElementById('cine');
    const lock = () => {
      const c = window.__cine, mid = (c.D + c.F) / 2;
      scroller.scrollTo({ top: cine.offsetTop + (cine.offsetHeight - innerHeight) * mid, behavior: 'instant' });
      window.__cine.render();
    };
    lock();
    scroller.style.overflow = 'hidden';
    // frames load async — the final frame may not be ready yet, so re-draw
    // once it has loaded (and a few safety passes as frames stream in).
    const finalFrame = new Image();
    finalFrame.onload = lock;
    finalFrame.src = 'assets/cine/f096.jpg';
    [400, 1000, 2000, 3500].forEach((t) => setTimeout(lock, t));

    // hide the live overlay (real zones + text + hero) so only the editor shows
    document.getElementById('facadeSvg').style.opacity = '0';
    document.getElementById('facade').style.opacity = '1';
    const txt = document.querySelector('#facade .select__head'); if (txt) txt.style.display = 'none';
    const hero = document.getElementById('cineHero'); if (hero) hero.style.display = 'none';

    injectCSS();
    buildToolbar();
    buildBoxes();
    renderAll();

    window.addEventListener('resize', () => { lock(); renderAll(); });
    document.addEventListener('keydown', onKey);
  }

  /* ----------------------------- rendering ----------------------------- */
  function renderAll() { Object.keys(zones).forEach(renderBox); }
  function renderBox(id) {
    const { scale, ox, oy } = cover();
    const z = zones[id], b = boxes[id];
    b.style.left = (ox + z.x * scale) + 'px';
    b.style.top = (oy + z.y * scale) + 'px';
    b.style.width = (z.w * scale) + 'px';
    b.style.height = (z.h * scale) + 'px';
    b.classList.toggle('sel', sel === id);
    if (sel === id && ui.coords) ui.coords.textContent = `${id}:  x ${round(z.x)}  y ${round(z.y)}  b ${round(z.w)}  h ${round(z.h)}`;
  }

  function buildBoxes() {
    Object.keys(zones).forEach((id) => {
      const b = document.createElement('div');
      b.className = 'cal-box';
      b.innerHTML = `<span class="cal-lbl">${id}</span>` +
        ['nw', 'ne', 'se', 'sw'].map((h) => `<i class="cal-h cal-${h}" data-h="${h}"></i>`).join('');
      document.body.appendChild(b);
      boxes[id] = b;
      b.addEventListener('mousedown', (e) => startDrag(e, id));
    });
  }

  /* ------------------------- drag & resize ----------------------------- */
  function startDrag(e, id) {
    e.preventDefault();
    sel = id; renderAll();
    const { scale } = cover();
    const handle = e.target.dataset.h;
    const z = zones[id];
    const start = { mx: e.clientX, my: e.clientY, x: z.x, y: z.y, w: z.w, h: z.h };

    function move(ev) {
      const dx = (ev.clientX - start.mx) / scale, dy = (ev.clientY - start.my) / scale;
      if (!handle) { z.x = start.x + dx; z.y = start.y + dy; }
      else {
        if (handle.includes('w')) { z.x = start.x + dx; z.w = start.w - dx; }
        if (handle.includes('e')) { z.w = start.w + dx; }
        if (handle.includes('n')) { z.y = start.y + dy; z.h = start.h - dy; }
        if (handle.includes('s')) { z.h = start.h + dy; }
        if (z.w < 8) z.w = 8; if (z.h < 8) z.h = 8;
      }
      renderBox(id);
    }
    function up() { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); save(); }
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  }

  function onKey(e) {
    if (!sel) return;
    const z = zones[sel], step = e.shiftKey ? 10 : 1;
    let used = true;
    if (e.key === 'ArrowLeft') (e.altKey ? z.w -= step : z.x -= step);
    else if (e.key === 'ArrowRight') (e.altKey ? z.w += step : z.x += step);
    else if (e.key === 'ArrowUp') (e.altKey ? z.h -= step : z.y -= step);
    else if (e.key === 'ArrowDown') (e.altKey ? z.h += step : z.y += step);
    else used = false;
    if (used) { e.preventDefault(); renderBox(sel); save(); }
  }

  /* ------------------------------ save --------------------------------- */
  function asZones() {
    const out = {};
    Object.keys(zones).sort().forEach((id) => {
      const z = zones[id], x = round(z.x), y = round(z.y), w = round(z.w), h = round(z.h);
      out[id] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    });
    return out;
  }
  function save() {
    localStorage.setItem('vb-zones', JSON.stringify(asZones()));
    if (ui.saved) { ui.saved.textContent = 'vistað ✓'; clearTimeout(save._t); save._t = setTimeout(() => ui.saved.textContent = '', 1200); }
  }

  /* ------------------------------ UI ----------------------------------- */
  function buildToolbar() {
    const bar = document.createElement('div');
    bar.className = 'cal-bar';
    bar.innerHTML = `
      <b>Kvörðun</b>
      <span class="cal-hint">Dragðu kassana á íbúðirnar · horn = stærð · örvalyklar nudda (Shift=10px, Alt=stærð)</span>
      <span class="cal-coords" id="calCoords"></span>
      <span class="cal-saved" id="calSaved"></span>
      <button id="calCopy">Afrita kóða</button>
      <button id="calReset" class="cal-ghost">Núllstilla</button>
      <button id="calDone" class="cal-ghost">Loka</button>`;
    document.body.appendChild(bar);
    ui.coords = bar.querySelector('#calCoords');
    ui.saved = bar.querySelector('#calSaved');
    bar.querySelector('#calCopy').addEventListener('click', copyCode);
    bar.querySelector('#calReset').addEventListener('click', () => {
      if (confirm('Núllstilla kvörðun í sjálfgefið?')) { localStorage.removeItem('vb-zones'); location.reload(); }
    });
    bar.querySelector('#calDone').addEventListener('click', () => { location.href = location.pathname; });
  }

  function copyCode() {
    const z = asZones();
    const lines = Object.keys(z).map((id) => `    '${id}': [${z[id].map((p) => '[' + p[0] + ',' + p[1] + ']').join(',')}],`);
    const code = `  zones: {\n${lines.join('\n')}\n  }`;
    navigator.clipboard?.writeText(code);
    showCode(code);
  }
  function showCode(code) {
    let m = document.getElementById('calCodeWrap');
    if (!m) {
      m = document.createElement('div'); m.id = 'calCodeWrap'; m.className = 'cal-code';
      m.innerHTML = `<p>Afritað ✓ — límdu þetta í <code>js/data.js</code> (í stað <code>zones: {…}</code>). Vistast líka sjálfkrafa.</p><textarea readonly></textarea><button id="calCodeClose">Loka</button>`;
      document.body.appendChild(m);
      m.querySelector('#calCodeClose').addEventListener('click', () => m.remove());
    }
    m.querySelector('textarea').value = code;
  }

  function injectCSS() {
    const s = document.createElement('style');
    s.textContent = `
    .cal-box{position:fixed;z-index:200;border:2px solid #00e676;background:rgba(0,230,118,.16);cursor:move;box-sizing:border-box}
    .cal-box.sel{border-color:#18ffff;background:rgba(24,255,255,.2);z-index:201}
    .cal-lbl{position:absolute;top:-20px;left:-2px;font:600 12px/1 Inter,sans-serif;color:#063;background:#00e676;padding:3px 5px;border-radius:4px}
    .cal-box.sel .cal-lbl{background:#18ffff}
    .cal-h{position:absolute;width:14px;height:14px;background:#fff;border:2px solid #00b25a;border-radius:50%;box-sizing:border-box}
    .cal-box.sel .cal-h{border-color:#0097a7}
    .cal-nw{left:-8px;top:-8px;cursor:nwse-resize}.cal-ne{right:-8px;top:-8px;cursor:nesw-resize}
    .cal-se{right:-8px;bottom:-8px;cursor:nwse-resize}.cal-sw{left:-8px;bottom:-8px;cursor:nesw-resize}
    .cal-bar{position:fixed;top:0;left:0;right:0;z-index:300;display:flex;align-items:center;gap:14px;
      padding:9px 16px;background:rgba(18,20,22,.96);color:#fff;font:13px/1.3 Inter,sans-serif;backdrop-filter:blur(8px)}
    .cal-bar b{font-size:14px;letter-spacing:.04em}
    .cal-hint{color:rgba(255,255,255,.6);font-size:12px}
    .cal-coords{margin-left:auto;font-variant-numeric:tabular-nums;color:#18ffff;font-size:12px;min-width:200px;text-align:right}
    .cal-saved{color:#00e676;font-size:12px;min-width:54px}
    .cal-bar button{font:600 12px Inter,sans-serif;color:#063;background:#00e676;border:0;border-radius:6px;padding:7px 12px;cursor:pointer}
    .cal-bar button.cal-ghost{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4)}
    .cal-code{position:fixed;z-index:400;left:50%;bottom:20px;transform:translateX(-50%);width:min(720px,92vw);
      background:#15171a;color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:16px;font:13px Inter,sans-serif}
    .cal-code p{margin:0 0 8px;color:rgba(255,255,255,.8)} .cal-code code{color:#18ffff}
    .cal-code textarea{width:100%;height:160px;background:#0c0d0e;color:#9fe;border:1px solid rgba(255,255,255,.14);
      border-radius:8px;padding:10px;font:12px/1.5 ui-monospace,Menlo,monospace;resize:vertical}
    .cal-code button{margin-top:8px;font:600 12px Inter,sans-serif;color:#063;background:#00e676;border:0;border-radius:6px;padding:7px 14px;cursor:pointer}`;
    document.head.appendChild(s);
  }
})();
