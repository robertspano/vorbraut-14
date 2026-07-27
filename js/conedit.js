/* ==========================================================================
   ?conedit — færa, bæta við og eyða útsýnis-keilum á hæðarkortinu
   --------------------------------------------------------------------------
   • Dragðu keilurnar hvert sem er í kringum hæðina (ramminn stækkar sjálfkrafa).
   • Örvatakkar fínstilla (Shift = 5 í einu).
   • „+ Bæta við" setur nýja keilu, „Eyða" fjarlægir þá völdu.
   • „Hlið" ræður hvaða mynd af húsinu birtist þegar hoverað er á keiluna.
   • Allt vistast strax (localStorage) og sést á venjulegu síðunni.
   • „Afrita kóða" gefur kóða til að líma í js/data.js (varanleg vistun).
   Hleðst AÐEINS með ?conedit í slóðinni — gestir sækja þetta aldrei.
   ========================================================================== */
(function () {
  'use strict';
  const CONES = (window.VB && window.VB.VIEW_CONES) || [];
  const svg = document.getElementById('selDiagram');
  if (!svg) return;

  document.body.classList.add('conedit');   // CSS: hover málar ekki brúnt í ritlinum
  const save = () => { try { localStorage.setItem('vb-cones', JSON.stringify(CONES)); } catch (e) {} };
  const redraw = () => { if (window.VB.renderSelector) window.VB.renderSelector(); };
  let idx = 0;

  /* ------------------------------ spjald ------------------------------ */
  const box = document.createElement('div');
  box.id = 'conePanel';
  box.innerHTML =
    '<b>Útsýnis-keilur</b>' +
    '<label>Keila <select id="cnPick"></select></label>' +
    '<label>Sýnir <select id="cnSide">' +
      ((window.VB.VIEWS || [{ id: 'aftan', label: 'Bakhlið' }])
        .map((v) => `<option value="${v.id}">${v.label}</option>`).join('')) +
      '</select></label>' +
    '<label>Snúningur <input type="range" id="cnDeg" min="0" max="359" step="1"><i id="cnDegV"></i></label>' +
    '<label>Stærð <input type="range" id="cnS" min="30" max="200" step="5"><i id="cnSV"></i></label>' +
    '<div class="cn-xy">Staða: <i id="cnXY"></i></div>' +
    '<div class="cn-row"><button data-act="add">+ Bæta við</button>' +
      '<button data-act="del">Eyða</button></div>' +
    '<div class="cn-row"><button data-act="copy">Afrita kóða</button>' +
      '<button data-act="reset">Núllstilla</button></div>' +
    '<small>Dragðu keilurnar á kortinu. Örvatakkar fínstilla (Shift = 5).</small>';
  document.body.appendChild(box);

  const css = document.createElement('style');
  css.textContent =
    '#conePanel{position:fixed;right:18px;bottom:18px;z-index:9998;background:#fff;' +
    'border:1px solid rgba(0,0,0,.18);border-radius:10px;padding:.75rem .85rem;' +
    'font:13px/1.35 Inter,system-ui,sans-serif;color:#262522;box-shadow:0 12px 30px rgba(0,0,0,.18);width:224px}' +
    '#conePanel b{display:block;margin-bottom:.55rem}' +
    '#conePanel label{display:flex;align-items:center;gap:.4rem;margin:.4rem 0;font-size:.78rem}' +
    '#conePanel input[type=range]{flex:1;accent-color:#aa8765;min-width:0}' +
    '#conePanel i{font-style:normal;min-width:34px;text-align:right;font-variant-numeric:tabular-nums}' +
    '#conePanel select{flex:1;padding:.15rem;min-width:0}' +
    '#conePanel .cn-xy{font-size:.72rem;color:#7C7064;margin-top:.45rem}' +
    '#conePanel .cn-xy i{font-style:normal;color:#262522}' +
    '#conePanel .cn-row{display:flex;gap:.4rem;margin-top:.5rem}' +
    '#conePanel button{flex:1;padding:.35rem;border:1px solid rgba(0,0,0,.18);border-radius:7px;' +
    'background:#fff;cursor:pointer;font-size:.75rem}' +
    '#conePanel button:hover{background:#f4f2ec}' +
    '#conePanel small{display:block;margin-top:.5rem;color:#7C7064;font-size:.7rem}' +
    '.cn-toast{position:fixed;left:50%;bottom:80px;transform:translateX(-50%);z-index:9999;' +
    'background:#262522;color:#fff;padding:.5rem .9rem;border-radius:8px;font-size:.8rem}' +
    '.dg-cone{cursor:grab}.dg-cone.cn-drag{cursor:grabbing}' +
    '.dg-cone.cn-sel path{stroke:#0D710A;stroke-width:3}';
  document.head.appendChild(css);

  const $ = (s) => document.querySelector(s);
  const pick = $('#cnPick'), side = $('#cnSide'), rDeg = $('#cnDeg'), rS = $('#cnS'),
        vDeg = $('#cnDegV'), vS = $('#cnSV'), vXY = $('#cnXY');

  function fillPick() {
    pick.innerHTML = '';
    CONES.forEach((c, i) => pick.appendChild(new Option((i + 1) + '. ' + c.side, i)));
    if (idx >= CONES.length) idx = Math.max(0, CONES.length - 1);
    pick.value = idx;
  }
  function markSel() {
    [...svg.querySelectorAll('.dg-cone')].forEach((g, i) => g.classList.toggle('cn-sel', i === idx));
  }
  function syncPanel() {
    if (!CONES.length) { vXY.textContent = '—'; markSel(); return; }
    const c = CONES[idx];
    side.value = c.side;
    rDeg.value = c.deg; vDeg.textContent = Math.round(c.deg) + '°';
    rS.value = Math.round(c.s * 100); vS.textContent = Math.round(c.s * 100) + '%';
    vXY.textContent = Math.round(c.x) + ', ' + Math.round(c.y);
    markSel();
  }
  // í ritlinum skiptir hover ekki um mynd (svo dragið trufli ekki) — en þegar keila
  // er VALIN birtist myndin hennar, svo þú sjáir hvað þú ert að stilla.
  function previewView(side) {
    const b = document.querySelector('.facade__sidebtn[data-side="' + side + '"]');
    if (b) b.click();
  }
  function refresh() { fillPick(); save(); redraw(); syncPanel(); }

  pick.onchange = () => { idx = +pick.value; syncPanel(); previewView(CONES[idx].side); };
  side.onchange = () => { if (CONES.length) { CONES[idx].side = side.value; refresh(); previewView(side.value); } };
  rDeg.oninput = () => { CONES[idx].deg = +rDeg.value; vDeg.textContent = rDeg.value + '°'; save(); redraw(); markSel(); };
  rS.oninput  = () => { CONES[idx].s = +rS.value / 100; vS.textContent = rS.value + '%'; save(); redraw(); markSel(); };

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'cn-toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  box.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'add') {
      const base = CONES[idx] || { x: 0, y: 0, deg: 90, s: 0.8, side: 'aftan' };
      CONES.push({ side: base.side, x: +(base.x + 26).toFixed(1), y: +(base.y + 26).toFixed(1), deg: base.deg, s: base.s });
      idx = CONES.length - 1;
      refresh(); toast('Keilu bætt við — dragðu hana á sinn stað');
    } else if (act === 'del') {
      if (!CONES.length) return;
      CONES.splice(idx, 1);
      refresh(); toast('Keilu eytt');
    } else if (act === 'reset') {
      localStorage.removeItem('vb-cones');
      toast('Núllstillt — endurhlaðið síðuna');
    } else if (act === 'copy') {
      const code = 'const VIEW_CONES = [\n' + CONES.map((c) =>
        `  { side: '${c.side}', x: ${(+c.x).toFixed(1)}, y: ${(+c.y).toFixed(1)}, ` +
        `deg: ${Math.round(c.deg)}, s: ${(+c.s).toFixed(2)} },`).join('\n') + '\n];';
      navigator.clipboard.writeText(code)
        .then(() => toast('Kóði afritaður — sendu mér hann til að vista varanlega'))
        .catch(() => { console.log(code); toast('Sjá console'); });
    }
  });

  /* ------------------------- dragið á kortinu ------------------------- */
  let drag = null;
  const toSvg = (evt) => {
    const p = svg.createSVGPoint();
    p.x = evt.clientX; p.y = evt.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  };

  svg.addEventListener('pointerdown', (e) => {
    const g = e.target.closest('.dg-cone'); if (!g) return;
    e.preventDefault(); e.stopPropagation();
    const i = [...svg.querySelectorAll('.dg-cone')].indexOf(g);
    idx = i; pick.value = i; syncPanel(); previewView(CONES[i].side);
    const pt = toSvg(e);
    drag = { i, dx: CONES[i].x - pt.x, dy: CONES[i].y - pt.y };
    g.classList.add('cn-drag');
    svg.setPointerCapture(e.pointerId);
  });

  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const pt = toSvg(e);
    CONES[drag.i].x = +(pt.x + drag.dx).toFixed(1);
    CONES[drag.i].y = +(pt.y + drag.dy).toFixed(1);
    redraw(); syncPanel();
  });
  const endDrag = () => { if (drag) { drag = null; save(); } };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  // örvatakkar — fínstilling
  window.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d || !CONES.length || /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    e.preventDefault();
    const step = e.shiftKey ? 5 : 1;
    CONES[idx].x = +(CONES[idx].x + d[0] * step).toFixed(1);
    CONES[idx].y = +(CONES[idx].y + d[1] * step).toFixed(1);
    save(); redraw(); syncPanel();
  });

  fillPick(); syncPanel();
  toast('Keilu-ritill virkur — dragðu keilurnar');
})();
