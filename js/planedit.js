/* ==========================================================================
   Vorbraut 14 — handvirkur ritill fyrir hæðarkortið (dálkana/íbúðaformin).
   Opna með  ?planedit   (t.d. http://localhost:5174/?planedit)
   • Smelltu á íbúð til að velja hana → hvítir punktar birtast.
   • Dragðu punkt til að breyta forminu (smellur nálægt punkti annarrar
     íbúðar → hann "smellur" saman svo brúnir falli nákvæmlega saman).
   • „Bæta punkti“ → smelltu á línu íbúðar. „Eyða punkti“ → smelltu á punkt.
   • Örvatakkar færa völdu íbúðina til um 0,5.
   • Allt vistast strax (localStorage) og sést á venjulegu síðunni við endurhleðslu.
   • „Afrita kóða“ afritar FLOOR_SHAPES sem hægt er að líma varanlega í data.js.
   ========================================================================== */
(function () {
  'use strict';
  if (!/[?&]planedit\b/.test(location.search)) return;
  const FS = window.VB && window.VB.FLOOR_SHAPES;
  if (!FS) return;
  const round = (n) => Math.round(n * 10) / 10;

  // vinnueintak (afrit af því sem er í gildi núna, þ.m.t. fyrri handvirkar breytingar)
  let data = JSON.parse(JSON.stringify(FS));
  let floor = '1', selId = null, mode = 'move', drag = null, snapEl = null, gxEl = null, gyEl = null;

  const root = document.createElement('div');
  root.id = 'peRoot';
  root.innerHTML =
    '<div class="pe__bar">' +
    '<strong>Hæðarkort — handvirk breyting</strong>' +
    '<span class="pe__floors"></span><span class="pe__modes"></span><span class="pe__sp"></span>' +
    '<span class="pe__readout" id="peReadout"></span>' +
    '<button data-act="copy">Afrita kóða</button>' +
    '<button data-act="reset">Frumstilla hæð</button>' +
    '<button data-act="close">Loka</button>' +
    '</div>' +
    '<div class="pe__hint">Smelltu á íbúð til að velja · dragðu hvítu punktana · „Bæta punkti“ = smelltu á línu · „Eyða punkti“ = smelltu á punkt · örvatakkar fínstilla · punktar smella saman við nágranna</div>' +
    '<div class="pe__stage">' +
    '<div class="pe__plan"><div class="pe__planlbl"></div><img class="pe__planimg" alt="" hidden/><div class="pe__planempty">Veldu íbúð til að sjá grunnmynd</div></div>' +
    '<div class="pe__canvas"><svg class="pe__svg" xmlns="http://www.w3.org/2000/svg"></svg></div>' +
    '</div>' +
    '<div class="pe__legend"></div>';
  document.body.appendChild(root);

  const svg = root.querySelector('.pe__svg');
  svg.setAttribute('viewBox', data.viewBox);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const floorsEl = root.querySelector('.pe__floors');
  ['1', '2', '3', '4'].forEach((f) => floorsEl.insertAdjacentHTML('beforeend', `<button data-floor="${f}">${f}. h.</button>`));
  const modesEl = root.querySelector('.pe__modes');
  [['move', 'Færa'], ['add', 'Bæta punkti'], ['del', 'Eyða punkti']].forEach(([m, l]) =>
    modesEl.insertAdjacentHTML('beforeend', `<button data-mode="${m}">${l}</button>`));

  const aptsOf = (f) => (data.floors[f] ? data.floors[f].apts : {});
  const ptsStr = (arr) => arr.map((p) => p.join(',')).join(' ');
  const clone = (a) => a.map((p) => [p[0], p[1]]);
  const VBN = data.viewBox.split(/\s+/).map(Number);   // [0,0,W,H]
  function gridSVG() {
    let g = '<g class="pe-grid">', W = VBN[2], H = VBN[3];
    for (let x = 0; x <= W; x += 20) g += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
    for (let y = 0; y <= H; y += 20) g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;
    return g + '</g>';
  }

  // íbúð → grunnmyndarskrá (notar sömu gögn og síðan, þ.m.t. víxlun á þakíbúðum)
  const aptPlan = {};
  (window.VB.APARTMENTS || []).forEach((a) => { aptPlan[a.id] = a.plan; });
  function updatePlan() {
    const img = root.querySelector('.pe__planimg');
    const empty = root.querySelector('.pe__planempty');
    const lbl = root.querySelector('.pe__planlbl');
    const file = selId && aptPlan[selId];
    if (file) {
      const src = 'assets/plans/' + file + '?r=7';
      if (img.getAttribute('src') !== src) img.src = src;
      img.hidden = false; empty.hidden = true; lbl.textContent = 'Grunnmynd · íbúð ' + selId;
    } else {
      img.hidden = true; empty.hidden = false; lbl.textContent = '';
    }
  }

  function centroid(pts) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      const cr = x0 * y1 - x1 * y0; a += cr; cx += (x0 + x1) * cr; cy += (y0 + y1) * cr;
    }
    if (Math.abs(a) < 1e-6) { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]; }
    return [round(cx / (3 * a)), round(cy / (3 * a))];
  }
  function toSvg(evt) {
    const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [round(p.x), round(p.y)];
  }
  function snap(xy, exceptId, exceptI) {                 // smella heilt í horn nágranna (tessellation)
    const A = aptsOf(floor); let best = xy, bd = 2.6;
    for (const id in A) A[id].forEach((p, i) => {
      if (id === exceptId && i === exceptI) return;
      const d = Math.hypot(p[0] - xy[0], p[1] - xy[1]);
      if (d < bd) { bd = d; best = [p[0], p[1]]; }
    });
    return best;
  }
  // jafna x/y → bein lína. Hliðarpunktarnir (sami fleti) hafa forgang (svo brúnin verði bein),
  // annars jafnað við hvaða punkt sem er á hæðinni (svo brúnir falli saman milli íbúða).
  function pick(cands, target, th) { let best = null, bd = th; for (const v of cands) { const d = Math.abs(v - target); if (d < bd) { bd = d; best = v; } } return best; }
  function axisSnap(xy, exceptId, exceptI) {
    const A = aptsOf(floor), arr = A[exceptId], n = arr.length;
    const prev = arr[(exceptI - 1 + n) % n], next = arr[(exceptI + 1) % n];
    const allX = [], allY = [];
    for (const id in A) A[id].forEach((p, i) => { if (id === exceptId && (i === exceptI || i === (exceptI - 1 + n) % n || i === (exceptI + 1) % n)) return; allX.push(p[0]); allY.push(p[1]); });
    let sx = pick([prev[0], next[0]], xy[0], 2.2); if (sx == null) sx = pick(allX, xy[0], 1.3);
    let sy = pick([prev[1], next[1]], xy[1], 2.2); if (sy == null) sy = pick(allY, xy[1], 1.3);
    return { x: sx, y: sy };
  }
  function distToSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }
  function save() { try { data._v = window.VB.FS_VERSION || ''; localStorage.setItem('vb-floorshapes', JSON.stringify(data)); } catch (e) {} }

  function render() {
    floorsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.floor === floor));
    modesEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    const A = aptsOf(floor), ids = Object.keys(A).sort();
    let html = gridSVG();
    const fp = data.floors[floor] && data.floors[floor].footprint;
    if (fp) html += `<polygon class="pe-foot" points="${ptsStr(fp)}"/>`;
    ids.forEach((id) => { html += `<polygon class="pe-apt${id === selId ? ' sel' : ''}" data-id="${id}" points="${ptsStr(A[id])}"/>`; });
    ids.forEach((id) => { const c = centroid(A[id]); html += `<text class="pe-lbl" data-id="${id}" x="${c[0]}" y="${c[1]}" dy=".34em">${id}</text>`; });
    if (selId && A[selId]) A[selId].forEach((p, i) => { html += `<circle class="pe-h" data-i="${i}" cx="${p[0]}" cy="${p[1]}" r="2.8"/>`; });
    svg.innerHTML = html;
    snapEl = null; gxEl = null; gyEl = null;
    root.querySelector('.pe__legend').innerHTML = ids.map((id) => `<button class="${id === selId ? 'on' : ''}" data-legid="${id}">${id}</button>`).join('');
    updatePlan();
  }

  function insertPoint(xy) {
    const arr = aptsOf(floor)[selId]; if (!arr) return;
    let bi = 0, bd = 1e9;
    for (let i = 0; i < arr.length; i++) { const d = distToSeg(xy, arr[i], arr[(i + 1) % arr.length]); if (d < bd) { bd = d; bi = i; } }
    arr.splice(bi + 1, 0, snap(xy, selId, -1)); save(); render();
  }

  /* ---- mjúk dráttur: pointer-capture + rAF + beinar uppfærslur (ekkert full-render) ---- */
  const readoutEl = root.querySelector('#peReadout');
  const SVGNS2 = 'http://www.w3.org/2000/svg';
  function readout(p) { readoutEl.textContent = p ? `x ${p[0].toFixed(1)}  ·  y ${p[1].toFixed(1)}` : ''; }
  function showSnap(p) {
    if (!p) { if (snapEl) snapEl.style.display = 'none'; return; }
    if (!snapEl || !snapEl.isConnected) { snapEl = document.createElementNS(SVGNS2, 'circle'); snapEl.setAttribute('class', 'pe-snap'); snapEl.setAttribute('r', '4.2'); }
    snapEl.setAttribute('cx', p[0]); snapEl.setAttribute('cy', p[1]); snapEl.style.display = '';
    svg.appendChild(snapEl);   // alltaf efst
  }
  function mkGuide() { const l = document.createElementNS(SVGNS2, 'line'); l.setAttribute('class', 'pe-guide'); return l; }
  function showGuides(gx, gy) {
    if (gx == null) { if (gxEl) gxEl.style.display = 'none'; }
    else { if (!gxEl || !gxEl.isConnected) gxEl = mkGuide(); gxEl.setAttribute('x1', gx); gxEl.setAttribute('x2', gx); gxEl.setAttribute('y1', 0); gxEl.setAttribute('y2', VBN[3]); gxEl.style.display = ''; svg.appendChild(gxEl); }
    if (gy == null) { if (gyEl) gyEl.style.display = 'none'; }
    else { if (!gyEl || !gyEl.isConnected) gyEl = mkGuide(); gyEl.setAttribute('y1', gy); gyEl.setAttribute('y2', gy); gyEl.setAttribute('x1', 0); gyEl.setAttribute('x2', VBN[2]); gyEl.style.display = ''; svg.appendChild(gyEl); }
  }
  function applyDrag(e) {
    if (!drag) return;
    const arr = aptsOf(floor)[selId]; if (!arr) return;
    const m = toSvg(e);
    let snapped = null, gx = null, gy = null;
    if (drag.type === 'vertex') {
      let p = e.shiftKey ? m : snap(m, selId, drag.i);     // 1) heilt í horn nágranna
      const corner = !e.shiftKey && (p[0] !== m[0] || p[1] !== m[1]);
      if (corner) { snapped = p; }
      else if (!e.shiftKey) {                              // 2) annars: jafna x/y → bein lína
        const a = axisSnap(m, selId, drag.i);
        if (a.x != null) { p = [a.x, p[1]]; gx = a.x; }
        if (a.y != null) { p = [p[0], a.y]; gy = a.y; }
      }
      arr[drag.i] = [round(p[0]), round(p[1])];
    } else {
      const dx = m[0] - drag.start[0], dy = m[1] - drag.start[1];
      for (let i = 0; i < arr.length; i++) arr[i] = [round(drag.orig[i][0] + dx), round(drag.orig[i][1] + dy)];
    }
    const poly = svg.querySelector(`.pe-apt[data-id="${selId}"]`);
    if (poly) poly.setAttribute('points', ptsStr(arr));
    svg.querySelectorAll('.pe-h').forEach((h) => { const i = +h.dataset.i; if (arr[i]) { h.setAttribute('cx', arr[i][0]); h.setAttribute('cy', arr[i][1]); } });
    const lbl = svg.querySelector(`.pe-lbl[data-id="${selId}"]`);
    if (lbl) { const c = centroid(arr); lbl.setAttribute('x', c[0]); lbl.setAttribute('y', c[1]); }
    showSnap(snapped);
    showGuides(gx, gy);
    readout(drag.type === 'vertex' ? arr[drag.i] : null);
  }
  svg.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('.pe-h'), ap = e.target.closest('.pe-apt');
    if (mode === 'del') { if (h && selId) { const arr = aptsOf(floor)[selId]; if (arr.length > 3) { arr.splice(+h.dataset.i, 1); save(); render(); } } return; }
    if (mode === 'add') { if (ap && ap.dataset.id === selId) insertPoint(toSvg(e)); else if (ap) { selId = ap.dataset.id; render(); } return; }
    if (h) { drag = { type: 'vertex', i: +h.dataset.i }; root.classList.add('dragging'); try { svg.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); return; }
    if (ap) {
      if (ap.dataset.id !== selId) { selId = ap.dataset.id; render(); return; }
      drag = { type: 'body', start: toSvg(e), orig: clone(aptsOf(floor)[selId]) };
      root.classList.add('dragging'); try { svg.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault();
    }
  });
  svg.addEventListener('pointermove', (e) => { if (drag) applyDrag(e); });
  function endDrag() { if (!drag) return; drag = null; root.classList.remove('dragging'); showSnap(null); showGuides(null, null); readout(null); render(); save(); }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  floorsEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { floor = b.dataset.floor; selId = null; render(); } });
  modesEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { mode = b.dataset.mode; render(); } });
  root.querySelector('.pe__legend').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { selId = b.dataset.legid; render(); } });
  root.querySelector('.pe__bar').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    if (b.dataset.act === 'close') { root.remove(); }
    else if (b.dataset.act === 'reset') { data.floors[floor] = JSON.parse(JSON.stringify(FS.floors[floor])); selId = null; save(); render(); }
    else if (b.dataset.act === 'copy') { copyCode(); }
  });
  window.addEventListener('keydown', (e) => {
    if (!selId || !/Arrow/.test(e.key)) return;
    const d = { ArrowLeft: [-0.5, 0], ArrowRight: [0.5, 0], ArrowUp: [0, -0.5], ArrowDown: [0, 0.5] }[e.key];
    if (!d) return; e.preventDefault();
    const arr = aptsOf(floor)[selId]; for (let i = 0; i < arr.length; i++) arr[i] = [round(arr[i][0] + d[0]), round(arr[i][1] + d[1])];
    save(); render();
  });

  function copyCode() {
    const P = (a) => '[' + a.map((p) => '[' + p[0] + ',' + p[1] + ']').join(',') + ']';
    const L = ['const FLOOR_SHAPES = {', `  viewBox: '${data.viewBox}', northDeg: ${data.northDeg},`, '  floors: {'];
    ['1', '2', '3', '4'].forEach((f) => {
      const fd = data.floors[f]; L.push(`    ${f}: {`);
      if (fd.footprint) L.push(`      footprint: ${P(fd.footprint)},`);
      L.push('      apts: {');
      Object.keys(fd.apts).sort().forEach((id) => L.push(`        '${id}': ${P(fd.apts[id])},`));
      L.push('      },', '    },');
    });
    L.push('  },', '};');
    const code = L.join('\n');
    navigator.clipboard.writeText(code).then(() => toast('Kóði afritaður — sendu mér hann til að vista varanlega')).catch(() => toast('Afritun mistókst — sjá console')) ;
    console.log(code);
  }
  function toast(msg) { const t = document.createElement('div'); t.className = 'pe__toast'; t.textContent = msg; root.appendChild(t); setTimeout(() => t.remove(), 2200); }

  render();
})();
