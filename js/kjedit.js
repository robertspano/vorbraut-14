/* ==========================================================================
   Vorbraut 14 — handvirkur ritill fyrir bílakjallarann.
   Opna með  ?kjedit   (t.d. http://localhost:5173/?kjedit)

   Hér eru merktir tveir hlutir ofan á aðaluppdráttinn:
     • BÍLASTÆÐI  — reitirnir tíu (B01–B10), sameiginlegir öllum íbúðum.
     • GEYMSLUR   — einn reitur á hverja íbúð (0101–0402).

   • Smelltu á reit (eða veldu í listanum niðri) → hvít horn birtast.
   • Dragðu reitinn til, eða dragðu horn til að breyta stærð.
   • SKRUNA = þysja inn/út (á músarbendli). BILSLÁ + draga = færa myndina.
   • Örvatakkar færa um 1 px, Shift+ör um 10.
   • Allt vistast strax í vafranum; „Afrita kóða“ gefur textann sem á að fara
     í js/data.js — sendu mér hann til að vista varanlega.
   ========================================================================== */
(function () {
  'use strict';
  if (!/[?&]kjedit\b/.test(location.search)) return;
  var VB = window.VB;
  if (!VB || !VB.KJALLARI || !VB.KJALLARI.staediReitir) return;

  var K = VB.KJALLARI;
  var IW = K.w, IH = K.h, NS = 'http://www.w3.org/2000/svg';
  var GEYMSLA_LYKILL = 'vb-kjallari';
  var round = function (n) { return Math.round(n); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* --- vinnuafrit ------------------------------------------------------- */
  var staedi = {}, geymslur = {};
  Object.keys(K.staediReitir).forEach(function (n) { staedi[n] = K.staediReitir[n].slice(); });
  Object.keys(K.ibudir).forEach(function (id) {
    var g = K.ibudir[id].geymsla;
    if (g) geymslur[id] = g.slice();
  });

  var hlutir = [];    // { key, teg, nafn }
  Object.keys(staedi).sort().forEach(function (n) { hlutir.push({ key: 's:' + n, teg: 's', nafn: n }); });
  Object.keys(geymslur).sort().forEach(function (n) { hlutir.push({ key: 'g:' + n, teg: 'g', nafn: n }); });

  var reitur = function (key) {
    var d = key.split(':');
    return d[0] === 's' ? staedi[d[1]] : geymslur[d[1]];
  };
  var setjaReit = function (key, r) {
    var d = key.split(':');
    if (d[0] === 's') staedi[d[1]] = r; else geymslur[d[1]] = r;
  };

  var valid = hlutir.length ? hlutir[0].key : null;
  var drag = null, spaceDown = false;
  var view = { x: 0, y: 0, w: IW, h: IH };

  /* Ritillinn er hlaðinn með dynamískri <script> og getur keyrt á undan
     app.js. Bíðum eftir að <body> sé til — meira þarf hann ekki, hann
     teiknar sinn eigin flöt ofan á síðuna. */
  (function bida(n) {
    if (document.body) { init(); return; }
    if ((n || 0) < 60) setTimeout(function () { bida((n || 0) + 1); }, 50);
  })();

  function init() {
    document.body.classList.add('kjedit');

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'kje__svg');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    stillaView();

    var bg = document.createElementNS(NS, 'image');
    bg.setAttribute('href', K.mynd);
    bg.setAttribute('x', 0); bg.setAttribute('y', 0);
    bg.setAttribute('width', IW); bg.setAttribute('height', IH);
    svg.appendChild(bg);

    var lag = document.createElementNS(NS, 'g');
    svg.appendChild(lag);
    document.body.appendChild(svg);

    var panel = document.createElement('div');
    panel.id = 'kjePanel';
    panel.innerHTML =
      '<div class="mk__row"><strong>Bílakjallari — reitaritill</strong>' +
      '<span class="mk__zoom"><button data-z="out">–</button><span id="kjeZ">100%</span>' +
      '<button data-z="in">+</button><button data-z="reset">⟲</button></span>' +
      '<span class="mk__sp"></span>' +
      '<button data-act="copy">Afrita kóða</button>' +
      '<button data-act="reset">Núllstilla reit</button>' +
      '<button data-act="resetall">Núllstilla allt</button>' +
      '<button data-act="top" title="Færa borðið upp/niður">⇅</button>' +
      '<button id="kjeFold" data-act="fold" title="Fella saman">▾</button>' +
      '<button data-act="close">Loka</button></div>' +
      '<div class="mk__hint">Dragðu reitinn til · dragðu <b>hornin</b> til að breyta stærð · ' +
      '<b>skruna = þysja</b> · <b>bilslá + draga = færa myndina</b> · örvatakkar = 1 px, Shift+ör = 10 px</div>' +
      '<div class="kje__flokkur"><span class="kje__heiti">Bílastæði</span>' +
      '<span class="mk__legend" data-teg="s"></span></div>' +
      '<div class="kje__flokkur"><span class="kje__heiti">Geymslur</span>' +
      '<span class="mk__legend" data-teg="g"></span></div>';
    document.body.appendChild(panel);

    var zlbl = panel.querySelector('#kjeZ');
    var listar = panel.querySelectorAll('.mk__legend');

    /* --- hnitaumreikningur ---------------------------------------------- */
    function tilSvg(e) {
      var pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      var p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return [p.x, p.y];
    }
    // notendahnit -> skjápixlar. preserveAspectRatio="meet" => sami kvarði á báða ása
    function kvardi() {
      return Math.min(svg.clientWidth / view.w, svg.clientHeight / view.h) || 1;
    }
    function handfangR() { return clamp(8 / kvardi(), 1.5, 26); }

    function stillaView() {
      svg.setAttribute('viewBox', view.x + ' ' + view.y + ' ' + view.w + ' ' + view.h);
    }
    function setjaZoom(nw, cx, cy) {
      nw = clamp(nw, 150, IW);
      var nh = nw * IH / IW;
      var px = cx == null ? view.x + view.w / 2 : cx;
      var py = cy == null ? view.y + view.h / 2 : cy;
      var nx = clamp(px - (px - view.x) * (nw / view.w), 0, IW - nw);
      var ny = clamp(py - (py - view.y) * (nh / view.h), 0, IH - nh);
      view = { x: nx, y: ny, w: nw, h: nh };
      stillaView();
      if (zlbl) zlbl.textContent = Math.round(IW / nw * 100) + '%';
      teikna();
    }

    var vista = function () {
      try {
        localStorage.setItem(GEYMSLA_LYKILL,
          JSON.stringify({ staediReitir: staedi, geymslur: geymslur }));
      } catch (e) {}
    };

    /* --- teikning -------------------------------------------------------- */
    var HORN = [[0, 1], [2, 1], [2, 3], [0, 3]];   // [xIdx, yIdx] fyrir hvert horn

    function teikna() {
      var r = handfangR(), html = '';
      hlutir.forEach(function (h) {
        var b = reitur(h.key);
        if (!b) return;
        var sel = h.key === valid ? ' sel' : '';
        html += '<rect class="kje-r kje-r--' + h.teg + sel + '" data-key="' + h.key + '"' +
          ' x="' + Math.min(b[0], b[2]) + '" y="' + Math.min(b[1], b[3]) +
          '" width="' + Math.abs(b[2] - b[0]) + '" height="' + Math.abs(b[3] - b[1]) + '" rx="3"/>';
      });
      hlutir.forEach(function (h) {
        var b = reitur(h.key);
        if (!b) return;
        html += '<text class="kje-lbl" x="' + (b[0] + b[2]) / 2 + '" y="' + (b[1] + b[3]) / 2 +
          '" dy=".34em" style="font-size:' + (14 * view.w / IW) + 'px">' + h.nafn + '</text>';
      });
      var v = reitur(valid);
      if (v) {
        HORN.forEach(function (h, i) {
          html += '<circle class="kje-h" data-h="' + i + '" cx="' + v[h[0]] + '" cy="' + v[h[1]] +
            '" r="' + r + '"/>';
        });
      }
      lag.innerHTML = html;
      listar.forEach(function (el) {
        var teg = el.dataset.teg;
        el.innerHTML = hlutir.filter(function (h) { return h.teg === teg; })
          .map(function (h) {
            return '<button class="' + (h.key === valid ? 'on' : '') + '" data-leg="' +
              h.key + '">' + h.nafn + '</button>';
          }).join('');
      });
    }

    /* --- dráttur --------------------------------------------------------- */
    function beitaDragi(e) {
      if (drag.type === 'pan') {
        var k = 1 / kvardi();
        view.x = clamp(drag.ox - (e.clientX - drag.sx) * k, 0, IW - view.w);
        view.y = clamp(drag.oy - (e.clientY - drag.sy) * k, 0, IH - view.h);
        stillaView();
        return;
      }
      var b = reitur(valid);
      if (!b) return;
      var m = tilSvg(e);
      if (drag.type === 'horn') {
        var h = HORN[drag.i];
        var ny = drag.orig.slice();
        ny[h[0]] = round(clamp(m[0], 0, IW));
        ny[h[1]] = round(clamp(m[1], 0, IH));
        // ekki leyfa reitnum að snúast við eða hverfa
        if (Math.abs(ny[2] - ny[0]) < 8 || Math.abs(ny[3] - ny[1]) < 8) return;
        setjaReit(valid, [Math.min(ny[0], ny[2]), Math.min(ny[1], ny[3]),
                          Math.max(ny[0], ny[2]), Math.max(ny[1], ny[3])]);
      } else {
        var dx = m[0] - drag.start[0], dy = m[1] - drag.start[1];
        var w = drag.orig[2] - drag.orig[0], hh = drag.orig[3] - drag.orig[1];
        var nx = clamp(round(drag.orig[0] + dx), 0, IW - w);
        var nyy = clamp(round(drag.orig[1] + dy), 0, IH - hh);
        setjaReit(valid, [nx, nyy, nx + w, nyy + hh]);
      }
      teikna();
    }

    svg.addEventListener('pointerdown', function (e) {
      if (spaceDown || e.button === 1) {
        drag = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
        try { svg.setPointerCapture(e.pointerId); } catch (x) {}
        e.preventDefault();
        return;
      }
      var h = e.target.closest('.kje-h'), r = e.target.closest('.kje-r');
      if (h && reitur(valid)) {
        drag = { type: 'horn', i: +h.dataset.h, orig: reitur(valid).slice() };
        try { svg.setPointerCapture(e.pointerId); } catch (x) {}
        e.preventDefault();
        return;
      }
      if (r) {
        if (r.dataset.key !== valid) { valid = r.dataset.key; teikna(); return; }
        drag = { type: 'body', start: tilSvg(e), orig: reitur(valid).slice() };
        try { svg.setPointerCapture(e.pointerId); } catch (x) {}
        e.preventDefault();
      }
    });
    svg.addEventListener('pointermove', function (e) { if (drag) beitaDragi(e); });
    var endir = function () {
      if (!drag) return;
      var breytt = drag.type !== 'pan';
      drag = null;
      if (breytt) { teikna(); vista(); }
    };
    svg.addEventListener('pointerup', endir);
    svg.addEventListener('pointercancel', endir);
    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var m = tilSvg(e);
      setjaZoom(view.w * (e.deltaY < 0 ? 0.82 : 1 / 0.82), m[0], m[1]);
    }, { passive: false });

    /* --- borðið ---------------------------------------------------------- */
    listar.forEach(function (el) {
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (b) { valid = b.dataset.leg; teikna(); }
      });
    });
    panel.querySelector('.mk__zoom').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.z === 'in') setjaZoom(view.w * 0.7);
      else if (b.dataset.z === 'out') setjaZoom(view.w / 0.7);
      else { view = { x: 0, y: 0, w: IW, h: IH }; stillaView(); zlbl.textContent = '100%'; teikna(); }
    });
    panel.querySelector('.mk__row').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]');
      if (!b) return;
      var a = b.dataset.act;
      if (a === 'close') {
        panel.remove(); svg.remove();
        document.body.classList.remove('kjedit', 'kjedit--felld');
      } else if (a === 'reset') {
        // KJALLARI.grunnur heldur skráargildunum — KJALLARI sjálft er þegar
        // búið að taka við vistuðum breytingum, svo það dygði ekki hér.
        var d = valid.split(':');
        var gr = K.grunnur || { staediReitir: {}, geymslur: {} };
        var upp = d[0] === 's' ? gr.staediReitir[d[1]] : gr.geymslur[d[1]];
        if (upp) { setjaReit(valid, upp.slice()); teikna(); vista(); }
        else skilabod('Enginn grunnreitur skráður');
      } else if (a === 'resetall') {
        if (!confirm('Henda ÖLLUM handvirkum breytingum á bílakjallaranum?')) return;
        try { localStorage.removeItem(GEYMSLA_LYKILL); } catch (x) {}
        location.reload();
      } else if (a === 'copy') {
        afritaKoda();
      } else if (a === 'fold') {
        var min = panel.classList.toggle('mk--min');
        document.body.classList.toggle('kjedit--felld', min);   // flöturinn stækkar
        b.textContent = min ? '▴' : '▾';
        teikna();                                               // handföng fylgja nýjum kvarða
      } else if (a === 'top') {
        panel.classList.toggle('mk--top');
      }
    });

    window.addEventListener('keydown', function (e) {
      if (e.key === ' ' && !drag) { spaceDown = true; svg.style.cursor = 'grab'; return; }
      if (!valid || !/^Arrow/.test(e.key)) return;
      var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!d) return;
      e.preventDefault();
      var s = e.shiftKey ? 10 : 1;
      var b = reitur(valid);
      setjaReit(valid, [b[0] + d[0] * s, b[1] + d[1] * s, b[2] + d[0] * s, b[3] + d[1] * s]);
      teikna(); vista();
    });
    window.addEventListener('keyup', function (e) {
      if (e.key === ' ') { spaceDown = false; svg.style.cursor = ''; }
    });

    /* --- kóði út --------------------------------------------------------- */
    function afritaKoda() {
      var R = function (r) { return '[' + r[0] + ', ' + r[1] + ', ' + r[2] + ', ' + r[3] + ']'; };
      var L = ['  staediReitir: {'];
      Object.keys(staedi).sort().forEach(function (n) {
        L.push("    '" + n + "': " + R(staedi[n]) + ',');
      });
      L.push('  },');
      L.push('  ibudir: {');
      Object.keys(K.ibudir).sort().forEach(function (id) {
        var st = (K.ibudir[id].staedi || []).map(function (x) { return "'" + x + "'"; }).join(', ');
        L.push("    '" + id + "': { staedi: [" + st + "], geymsla: " + R(geymslur[id]) + ' },');
      });
      L.push('  },');
      var kodi = L.join('\n');
      console.log(kodi);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(kodi)
          .then(function () { skilabod('Kóði afritaður — sendu mér til að vista varanlega'); })
          .catch(function () { skilabod('Afritun hafnað — kóðinn er í console'); });
      } else {
        skilabod('Kóðinn er í console');
      }
    }
    function skilabod(m) {
      var t = document.createElement('div');
      t.className = 'mk__toast';
      t.textContent = m;
      panel.appendChild(t);
      setTimeout(function () { t.remove(); }, 2400);
    }

    teikna();
  }
})();
