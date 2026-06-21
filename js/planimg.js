/* ==========================================================================
   Vorbraut 14 — handvirk stilling á grunnmynd (rammi með 4 hornum).
   Opna með  ?planimg
   • Opnaðu íbúð. Grunnmyndin fær grænan ramma með 4 hornum.
   • Dragðu HORN til að stækka/minnka (hlutföll haldast).
   • Dragðu MYNDINA (innan ramma) til að færa hana.
   • Vistast strax per íbúð. „Afrita kóða" → sendu mér til að vista varanlega.
   ========================================================================== */
(function () {
  'use strict';
  if (!/[?&]planimg\b/.test(location.search)) return;
  const $ = (s) => document.querySelector(s);
  const modal = $('#modal'), box = $('#mPlanBtn'), inner = $('#mPlanInner'), img = $('#mPlan');
  const VB = window.VB;
  if (!modal || !box || !inner || !img || !VB) return;
  VB.PLAN_ADJ = VB.PLAN_ADJ || {};
  document.body.classList.add('planimg');
  const r1 = (n) => Math.round(n * 10) / 10;
  const curApt = () => modal.dataset.apt;
  const iar = () => (img.naturalWidth / img.naturalHeight) || 1;

  ['tl', 'tr', 'bl', 'br'].forEach((c) => { const h = document.createElement('span'); h.className = 'pi-h ' + c; h.dataset.c = c; inner.appendChild(h); });

  const panel = document.createElement('div');
  panel.id = 'piPanel';
  panel.innerHTML =
    '<div class="pi__row"><strong>Grunnmynd · íbúð</strong> <span id="piApt">—</span></div>' +
    '<div class="pi__hint">Dragðu <b>hornin</b> til að stækka/minnka · dragðu <b>myndina</b> til að færa</div>' +
    '<div class="pi__row"><button id="piReset">Núllstilla</button><button id="piCopy">Afrita kóða</button></div>';
  document.body.appendChild(panel);
  new MutationObserver(() => {
    if (!modal.hidden) { panel.style.display = 'block'; $('#piApt').textContent = curApt() || '—'; }
    else panel.style.display = 'none';
  }).observe(modal, { attributes: true, attributeFilter: ['hidden', 'data-apt'] });

  const save = () => { try { localStorage.setItem('vb-planimg', JSON.stringify(VB.PLAN_ADJ)); } catch (e) {} };
  function commit(left, top, w, h) {                  // px (m.v. reit) -> vistað sem %
    const b = box.getBoundingClientRect(); const id = curApt(); if (!id) return;
    VB.PLAN_ADJ[id] = { x: r1(left / b.width * 100), y: r1(top / b.height * 100), w: r1(w / b.width * 100), h: r1(h / b.height * 100) };
    window.__setPlanFrame(id); save();
  }

  let drag = null;
  inner.addEventListener('pointerdown', (e) => {
    const id = curApt(); if (!id) return;
    const b = box.getBoundingClientRect(), f = inner.getBoundingClientRect();
    const handle = e.target.closest('.pi-h');
    drag = { c: handle ? handle.dataset.c : null, sx: e.clientX, sy: e.clientY,
             left: f.left - b.left, top: f.top - b.top, w: f.width, h: f.height };
    try { inner.setPointerCapture(e.pointerId); } catch (x) {}
    e.preventDefault(); e.stopPropagation();
  });
  inner.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy, ar = iar();
    let { left, top, w, h } = drag;
    if (!drag.c) { left += dx; top += dy; }                                  // færa
    else {                                                                    // stækka (hlutföll haldast, fest við andstætt horn)
      const right = drag.left + drag.w, bottom = drag.top + drag.h;
      if (drag.c === 'br') { w = Math.max(40, drag.w + dx); h = w / ar; }
      else if (drag.c === 'tr') { w = Math.max(40, drag.w + dx); h = w / ar; top = bottom - h; }
      else if (drag.c === 'bl') { w = Math.max(40, drag.w - dx); h = w / ar; left = right - w; }
      else if (drag.c === 'tl') { w = Math.max(40, drag.w - dx); h = w / ar; left = right - w; top = bottom - h; }
    }
    commit(left, top, w, h);
  });
  function end() { if (drag) { drag = null; save(); } }
  inner.addEventListener('pointerup', end);
  inner.addEventListener('pointercancel', end);

  $('#piReset').addEventListener('click', () => { const id = curApt(); if (!id) return; delete VB.PLAN_ADJ[id]; window.__setPlanFrame(id); save(); });
  $('#piCopy').addEventListener('click', () => {
    const code = 'const PLAN_ADJ = ' + JSON.stringify(VB.PLAN_ADJ) + ';';
    navigator.clipboard.writeText(code).then(() => toast('Kóði afritaður — sendu mér')).catch(() => toast('Sjá console'));
    console.log(code);
  });
  function toast(m) { const t = document.createElement('div'); t.className = 'pi__toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 1900); }
})();
