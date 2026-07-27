/* ==========================================================================
   Vorbraut 14 — ÚTTEKTIN
   Teiknar úttekt hússins ofan á opnumyndina og byggir 14-reita talninguna
   og talnastrípuna úr window.VB.APARTMENTS / FACADE.zones.

   REGLUR:
   - Snertir ALDREI [data-i18n] hnút (page.js keyrir textContent á þá tvisvar).
     Allir hnútar hér eru systkini, eða merkimiðar sem eru hreinir textahnútar.
   - Engin ný netbeiðni: FACADE.zones eru þegar kvarðaðar á foto-bak.webp og
     staðan kemur úr window.VB.getStatuses() sem vbsupa.js hleður hvort eð er.
   - Ef CMS skiptir um opnumynd hverfur teikningin (data-svy-img vörnin) —
     hún má aldrei sitja ofan á rangri mynd.
   ========================================================================== */
(function () {
  'use strict';
  var chap = document.querySelector('.chap'); if (!chap) return;
  var VB = window.VB || {};
  var APT = VB.APARTMENTS || [];
  var ZON = (VB.FACADE && VB.FACADE.zones) || {};
  var host = document.querySelector('.svy');
  var NS = 'http://www.w3.org/2000/svg';

  /* ------------------------------------------------- hjálp: röð og hæðir */
  function byFloor() {
    var f = {};
    APT.forEach(function (a) { (f[a.floor] = f[a.floor] || []).push(a); });
    Object.keys(f).forEach(function (k) {
      f[k].sort(function (a, b) { return minx(a.id) - minx(b.id); });
    });
    return f;
  }
  function minx(id) {
    var z = ZON[id]; if (!z) return 0;
    return z.reduce(function (m, p) { return Math.min(m, p[0]); }, 1e9);
  }
  function bbox(ids) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    ids.forEach(function (id) {
      (ZON[id] || []).forEach(function (p) {
        if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
        if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
      });
    });
    return { x0: x0, y0: y0, x1: x1, y1: y1 };
  }
  function fmt(n) { return String(n).replace('.', ','); }
  function range(list, key) {
    var v = list.map(function (a) { return a[key]; }).filter(function (x) { return x != null; });
    if (!v.length) return '';
    var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
    return lo === hi ? fmt(lo) : fmt(lo) + '–' + fmt(hi);
  }

  /* ================================================== 1 · TEIKNINGIN ==== */
  function drawSurvey() {
    if (!host) return;
    var mode = host.getAttribute('data-svy') || '';
    if (!mode || !Object.keys(ZON).length) return;
    var img = host.querySelector('.svy__shot');
    var need = host.getAttribute('data-svy-img') || '';
    // VÖRN: teikningin er kvörðuð á EINA mynd. Ef CMS hefur skipt henni út —
    // eða myndin er ekki sú sem búist var við — er ekkert teiknað.
    if (need && (!img || ((img.currentSrc || img.getAttribute('src') || '').indexOf(need) < 0))) {
      var old = host.querySelector('.svy__net'); if (old) old.remove();
      return;
    }
    var reg = host.querySelector('.svy__reg'); if (!reg) return;
    var svg = host.querySelector('.svy__net');
    if (svg) svg.remove();
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'svy__net');
    svg.setAttribute('viewBox', '0 0 1280 720');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('aria-hidden', 'true');

    var d = 0;
    function add(el, delay) {
      el.setAttribute('pathLength', '1');
      el.style.setProperty('--d', (delay != null ? delay : d) + 's');
      svg.appendChild(el); d += 0.045;
    }
    function poly(pts, cls) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M' + pts.map(function (q) { return q[0] + ',' + q[1]; }).join('L') + 'Z');
      p.setAttribute('class', 'ink ' + (cls || ''));
      return p;
    }
    function line(x1, y1, x2, y2, cls) {
      var l = document.createElementNS(NS, 'path');
      l.setAttribute('d', 'M' + x1 + ',' + y1 + 'L' + x2 + ',' + y2);
      l.setAttribute('class', 'ink ' + (cls || ''));
      return l;
    }
    function label(x, y, txt, cls, anchor) {
      var t = document.createElementNS(NS, 'text');
      t.setAttribute('x', x); t.setAttribute('y', y);
      if (anchor) t.setAttribute('text-anchor', anchor);
      if (cls) t.setAttribute('class', cls);
      t.textContent = txt;
      svg.appendChild(t); return t;
    }

    var floors = byFloor();
    var lit = (host.getAttribute('data-svy-lit') || '').split(/\s+/).filter(Boolean);

    if (mode === 'all') {
      /* ---- 02 ARKITEKTÚR: allar 14 útlínurnar + íbúðanúmer -------------- */
      [1, 2, 3, 4].forEach(function (fl) {
        (floors[fl] || []).forEach(function (a) {
          if (!ZON[a.id]) return;
          add(poly(ZON[a.id], 'z is-on'));
          var b = bbox([a.id]);
          label((b.x0 + b.x1) / 2, b.y0 + 26, a.id, 'sm', 'middle');
        });
      });
    } else if (mode === 'floors') {
      /* ---- 03 HÚSIÐ: fjórar hæðir sem fjögur bönd, mælt úr útlínunum ---- */
      [4, 3, 2, 1].forEach(function (fl) {
        var list = floors[fl] || []; if (!list.length) return;
        var b = bbox(list.map(function (a) { return a.id; }));
        add(line(b.x0, b.y0, b.x1, b.y0, 'rulez'));
        if (fl === 1) add(line(b.x0, b.y1, b.x1, b.y1, 'rulez'));
        label(b.x1 + 14, (b.y0 + b.y1) / 2 + 5,
          fl + '. HÆÐ · ' + list.length + ' ÍB. · ' + range(list, 'area') + ' m²', 'lg');
      });
    } else if (mode === 'pick') {
      /* ---- 04 ÚTSÝNI: valdar íbúðir lýstar, hinar daufar ---------------- */
      Object.keys(ZON).forEach(function (id) {
        var on = lit.indexOf(id) >= 0;
        add(poly(ZON[id], 'z ' + (on ? 'is-on' : 'is-off')));
      });
      if (lit.length) {
        var b = bbox(lit);
        var list = APT.filter(function (a) { return lit.indexOf(a.id) >= 0; });
        label((b.x0 + b.x1) / 2, b.y0 - 16,
          lit.length + ' ÞAKÍBÚÐIR · ' + range(list, 'area') + ' m²', 'lg', 'middle');
      }
    } else if (mode === 'ground') {
      /* ---- 06 AÐGENGI: jarðlínan brotnar NIÐUR í kjallaraopið ----------- */
      /* Hnit mæld á foto-kjallari.webp (960×540 -> viewBox 1280×720):
         jarðlína vinstra megin y=470, rampurinn fellur að opinu við x=560..760. */
      add(line(120, 470, 470, 470, 'rulez'));
      add(line(470, 470, 610, 560, 'rulez'));
      add(line(610, 560, 900, 560, 'rulez'));
      label(120, 452, '±0,00');
      label(900, 542, 'KJALLARI · −1', null, 'end');
    }

    reg.appendChild(svg);
    requestAnimationFrame(function () { host.classList.add('is-drawn'); });
  }

  /* ==================================================== 2 · TALNINGIN === */
  function drawTally(status) {
    var grid = document.querySelector('.svy__grid');
    var count = document.querySelector('.svy__count');
    if (!grid || !APT.length) return;
    var floors = byFloor();
    var sub = (chap.getAttribute('data-svy-sub') || 'all');
    var subset = sub === 'all' ? null : sub.split(/\s+/);
    grid.textContent = '';
    var avail = 0;
    [4, 3, 2, 1].forEach(function (fl) {
      (floors[fl] || []).forEach(function (a) {
        var st = (status && status[a.id]) || a.status || 'available';
        if (st === 'available') avail++;
        var b = document.createElement('b');
        b.setAttribute('data-s', st);
        b.setAttribute('title', a.id + ' · ' + fmt(a.area) + ' m²');
        if (fl === 4) b.className = 'pent';
        if (subset && subset.indexOf(String(fl)) < 0) b.classList.add('is-dim');
        grid.appendChild(b);
      });
    });
    if (count) {
      count.textContent = '';
      var strong = document.createElement('b');
      strong.textContent = avail;
      count.appendChild(strong);
      count.appendChild(document.createTextNode(
        ' ' + (document.documentElement.lang === 'en'
          ? 'of 14 homes available' : 'af 14 íbúðum lausar')));
    }
  }

  /* ====================================================== 3 · STRÍPAN === */
  function drawStrip() {
    var strip = document.querySelector('.svy__strip'); if (!strip || !APT.length) return;
    var total = APT.reduce(function (s, a) { return s + a.area; }, 0);
    var cells = strip.querySelectorAll('b[data-vb]');
    var vals = {
      'apts': APT.length + '',
      'area-total': total.toFixed(1).replace('.', ',') + ' m²',
      'area-range': range(APT, 'area') + ' m²',
      'floors': '4 + ' + (document.documentElement.lang === 'en' ? 'basement' : 'kjallari'),
      'land': 'L232219',
      'beds': APT.reduce(function (s, a) { return s + (a.beds || 0); }, 0) + '',
    };
    [].forEach.call(cells, function (b) {
      var k = b.getAttribute('data-vb');
      if (vals[k] != null) b.textContent = vals[k];
    });
  }

  /* ============================================================ KEYRSLA = */
  function run(status) { drawSurvey(); drawTally(status); drawStrip(); }
  run(null);

  // lifandi staða — vbsupa.js er þegar hlaðið á þessum síðum, engin ný beiðni-lógík
  if (VB.getStatuses) VB.getStatuses().then(function (s) {
    if (s && Object.keys(s).length) drawTally(s);
  }).catch(function () {});

  // CMS getur skipt um opnumynd EFTIR á — þá er teikningin endurmetin
  document.addEventListener('vb:images', function () { drawSurvey(); });
})();
