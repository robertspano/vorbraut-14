/* ==========================================================================
   Vorbraut 14 — handvirkur útlínu-ritill fyrir framhlið ("perfect mask").
   Opna með  ?mask   (t.d. http://localhost:5174/?mask)
   • Veldu íbúð (listinn niðri) → hvítir punktar birtast.
   • Dragðu punktana þannig þeir fylgi brún hússins (þaki, klæðningu, gleri).
   • „Bæta punkti“ = smelltu á línu íbúðar. „Eyða punkti“ = smelltu á punkt.
   • SKRUNA = þysja inn/út (á músarbendli). BILSLÁ + draga = færa myndina.
   • Punktar smella saman við nágranna. Shift = enginn snap. Örvatakkar fínstilla.
   • Allt vistast strax; „Afrita kóða“ gefur FACADE.zones — sendu mér til að vista.
   ========================================================================== */
(function () {
  'use strict';
  if (!/[?&]mask\b/.test(location.search)) return;
  const VB = window.VB; if (!VB || !VB.FACADE || !VB.FACADE.zones) return;
  const IW = 1280, IH = 720, NS = 'http://www.w3.org/2000/svg';
  const round = (n) => Math.round(n);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let zones = JSON.parse(JSON.stringify(VB.FACADE.zones));
  const ids = Object.keys(zones).sort();
  let selId = ids[0], mode = 'move', drag = null, spaceDown = false;
  let view = { x: 0, y: 0, w: IW, h: IH };

  const ready = (fn) => ((window.__cine && document.getElementById('facade') && document.getElementById('facadeSvg')) ? fn() : setTimeout(() => ready(fn), 60));
  ready(init);

  function init() {
    document.body.classList.add('maskedit');
    document.getElementById('facade').classList.remove('is-front');
    const scroller = document.getElementById('scroller'), cine = document.getElementById('cine');
    const lock = () => { const c = window.__cine; scroller.scrollTop = cine.offsetTop + (cine.offsetHeight - innerHeight) * Math.min(c.D + 0.06, 0.92); window.__cine.render(); };
    lock(); setTimeout(lock, 120);
    scroller.style.overflow = 'hidden';
    const live = document.getElementById('facadeSvg'); if (live) live.style.pointerEvents = 'none';

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'mask__svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    applyView();
    // bakgrunnur: sama fram-rammi og síðan sýnir (svo myndin þysji með punktunum)
    const bg = document.createElementNS(NS, 'image');
    bg.setAttribute('href', 'assets/cine/f096.jpg'); bg.setAttribute('x', 0); bg.setAttribute('y', 0);
    bg.setAttribute('width', IW); bg.setAttribute('height', IH); bg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.appendChild(bg);
    const layer = document.createElementNS(NS, 'g'); layer.setAttribute('id', 'mkLayer'); svg.appendChild(layer);
    document.body.appendChild(svg);

    const panel = document.createElement('div'); panel.id = 'maskPanel';
    panel.innerHTML =
      '<div class="mk__row"><strong>Framhlið — útlínu-ritill</strong>' +
      '<span class="mk__modes"></span>' +
      '<span class="mk__zoom"><button data-z="out">–</button><span id="mkZlbl">100%</span><button data-z="in">+</button><button data-z="reset">⟲</button></span>' +
      '<span class="mk__sp"></span>' +
      '<button data-act="copy">Afrita kóða</button><button data-act="reset">Núllstilla íbúð</button><button data-act="close">Loka</button></div>' +
      '<div class="mk__hint">Veldu íbúð · dragðu punkta eftir brún · „Bæta punkti“ = smelltu á línu · „Eyða“ = smelltu á punkt · <b>skruna = þysja</b> · <b>bilslá+draga = færa</b> · Shift = enginn snap</div>' +
      '<div class="mk__legend"></div>';
    document.body.appendChild(panel);

    const modesEl = panel.querySelector('.mk__modes'), legendEl = panel.querySelector('.mk__legend'), zlbl = panel.querySelector('#mkZlbl');
    [['move', 'Færa'], ['add', 'Bæta punkti'], ['del', 'Eyða punkti']].forEach(([m, l]) => modesEl.insertAdjacentHTML('beforeend', `<button data-mode="${m}">${l}</button>`));

    const ptsStr = (a) => a.map((p) => p.join(',')).join(' ');
    const clone = (a) => a.map((p) => [p[0], p[1]]);
    const toSvg = (e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(svg.getScreenCTM().inverse()); return [round(p.x), round(p.y)]; };
    const centroid = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]; };
    const zfac = () => view.w / IW;                                   // 1 = full, <1 = þysjað inn
    const scl = () => Math.max(svg.clientWidth / view.w, svg.clientHeight / view.h) || 1;  // user→skjá kvarði
    const hr = () => clamp(7 / scl(), 0.8, 12);                        // ~7px handfang óháð þysjun
    function snap(xy, exId, exI) { const th = 9 / scl(); let best = xy, bd = th; for (const id in zones) zones[id].forEach((p, i) => { if (id === exId && i === exI) return; const d = Math.hypot(p[0] - xy[0], p[1] - xy[1]); if (d < bd) { bd = d; best = [p[0], p[1]]; } }); return best; }
    function distToSeg(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0; t = clamp(t, 0, 1); return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)); }
    const save = () => { try { localStorage.setItem('vb-facadezones', JSON.stringify(zones)); } catch (e) {} };

    function applyView() { svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`); }
    function setZoom(nw, cx, cy) {                                    // cx,cy = miðja þysjunar í user-coords
      nw = clamp(nw, 200, IW); const nh = nw * IH / IW;
      const px = cx == null ? view.x + view.w / 2 : cx, py = cy == null ? view.y + view.h / 2 : cy;
      let nx = px - (px - view.x) * (nw / view.w), ny = py - (py - view.y) * (nh / view.h);
      nx = clamp(nx, 0, IW - nw); ny = clamp(ny, 0, IH - nh);
      view = { x: nx, y: ny, w: nw, h: nh }; applyView(); if (zlbl) zlbl.textContent = Math.round(IW / nw * 100) + '%'; render();
    }

    function render() {
      modesEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
      const r = hr();
      let html = '';
      ids.forEach((id) => { html += `<polygon class="mk-z${id === selId ? ' sel' : ''}" data-id="${id}" points="${ptsStr(zones[id])}"/>`; });
      ids.forEach((id) => { const c = centroid(zones[id]); html += `<text class="mk-lbl" data-id="${id}" x="${c[0]}" y="${c[1]}" dy=".34em" style="font-size:${13 * zfac()}px">${id}</text>`; });
      if (selId && zones[selId]) zones[selId].forEach((p, i) => { html += `<circle class="mk-h" data-i="${i}" cx="${p[0]}" cy="${p[1]}" r="${r}"/>`; });
      layer.innerHTML = html;
      legendEl.innerHTML = ids.map((id) => `<button class="${id === selId ? 'on' : ''}" data-leg="${id}">${id}</button>`).join('');
    }

    function insertPoint(xy) {
      const arr = zones[selId]; if (!arr) return; let bi = 0, bd = 1e9;
      for (let i = 0; i < arr.length; i++) { const d = distToSeg(xy, arr[i], arr[(i + 1) % arr.length]); if (d < bd) { bd = d; bi = i; } }
      arr.splice(bi + 1, 0, snap(xy, selId, -1)); save(); render();
    }

    function applyDrag(e) {
      if (drag.type === 'pan') {
        const k = 1 / scl();
        view.x = clamp(drag.ox - (e.clientX - drag.sx) * k, 0, IW - view.w);
        view.y = clamp(drag.oy - (e.clientY - drag.sy) * k, 0, IH - view.h);
        applyView(); return;
      }
      const arr = zones[selId]; if (!arr) return; const m = toSvg(e);
      if (drag.type === 'vertex') { const p = e.shiftKey ? m : snap(m, selId, drag.i); arr[drag.i] = [round(p[0]), round(p[1])]; }
      else { const dx = m[0] - drag.start[0], dy = m[1] - drag.start[1]; for (let i = 0; i < arr.length; i++) arr[i] = [round(drag.orig[i][0] + dx), round(drag.orig[i][1] + dy)]; }
      const poly = layer.querySelector(`.mk-z[data-id="${selId}"]`); if (poly) poly.setAttribute('points', ptsStr(arr));
      layer.querySelectorAll('.mk-h').forEach((h) => { const i = +h.dataset.i; if (arr[i]) { h.setAttribute('cx', arr[i][0]); h.setAttribute('cy', arr[i][1]); } });
    }
    svg.addEventListener('pointerdown', (e) => {
      if (spaceDown || e.button === 1) { drag = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y }; try { svg.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); return; }
      const h = e.target.closest('.mk-h'), z = e.target.closest('.mk-z');
      if (mode === 'del') { if (h && selId) { const arr = zones[selId]; if (arr.length > 3) { arr.splice(+h.dataset.i, 1); save(); render(); } } return; }
      if (mode === 'add') { if (z && z.dataset.id === selId) insertPoint(toSvg(e)); else if (z) { selId = z.dataset.id; render(); } return; }
      if (h) { drag = { type: 'vertex', i: +h.dataset.i }; try { svg.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); return; }
      if (z) { if (z.dataset.id !== selId) { selId = z.dataset.id; render(); return; } drag = { type: 'body', start: toSvg(e), orig: clone(zones[selId]) }; try { svg.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); }
    });
    svg.addEventListener('pointermove', (e) => { if (drag) applyDrag(e); });
    const end = () => { if (!drag) return; const wasEdit = drag.type !== 'pan'; drag = null; if (wasEdit) { render(); save(); } };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    svg.addEventListener('wheel', (e) => { e.preventDefault(); const m = toSvg(e); setZoom(view.w * (e.deltaY < 0 ? 0.82 : 1 / 0.82), m[0], m[1]); }, { passive: false });

    modesEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { mode = b.dataset.mode; render(); } });
    legendEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { selId = b.dataset.leg; render(); } });
    panel.querySelector('.mk__zoom').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.z === 'in') setZoom(view.w * 0.7); else if (b.dataset.z === 'out') setZoom(view.w / 0.7);
      else { view = { x: 0, y: 0, w: IW, h: IH }; applyView(); zlbl.textContent = '100%'; render(); }
    });
    panel.querySelector('.mk__row').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]'); if (!b) return;
      if (b.dataset.act === 'close') { panel.remove(); svg.remove(); document.body.classList.remove('maskedit'); scroller.style.overflow = ''; if (live) live.style.pointerEvents = ''; }
      else if (b.dataset.act === 'reset') { zones[selId] = clone(VB.FACADE.zones[selId]); save(); render(); }
      else if (b.dataset.act === 'copy') { copyCode(); }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ' && !drag) { spaceDown = true; svg.style.cursor = 'grab'; return; }
      if (!selId || !/^Arrow/.test(e.key)) return;
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d) return; e.preventDefault();
      zones[selId] = zones[selId].map((p) => [round(p[0] + d[0]), round(p[1] + d[1])]); save(); render();
    });
    window.addEventListener('keyup', (e) => { if (e.key === ' ') { spaceDown = false; svg.style.cursor = ''; } });

    function copyCode() {
      const P = (a) => '[' + a.map((p) => '[' + p[0] + ',' + p[1] + ']').join(',') + ']';
      const L = ['  zones: {']; ids.forEach((id) => L.push(`    '${id}': ${P(zones[id])},`)); L.push('  },');
      const code = L.join('\n');
      navigator.clipboard.writeText(code).then(() => toast('Kóði afritaður — sendu mér til að vista varanlega')).catch(() => toast('Sjá console'));
      console.log(code);
    }
    function toast(m) { const t = document.createElement('div'); t.className = 'mk__toast'; t.textContent = m; panel.appendChild(t); setTimeout(() => t.remove(), 2200); }

    render();
  }
})();
