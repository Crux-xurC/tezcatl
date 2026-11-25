// lib/citlalpol/citlalpol-image-page.js -- the page script of citlalpol_image (panels/resident/citlalpol_image.html;
// D-citlalpol-bus). Each record from the citlalpol_bus of the same skin travels as a glyph (citlalpol.json):
// from tezcatl's side (the satellite) to Citlalpol (Venus), then on to the Internet (pass), to Zoozve and back (a
// pass to a local server behind a zoozve gate), back (Citlalpol answered: the wall's DNS) or no further (refused, a
// red ✕). Records that come together travel as one glyph per kind with a
// circled count. At most MAX travel at once; more are counted on the line below. It draws only what the bus
// says; text is set as text.
(function () {
  'use strict';
  var T = window.Tezcatl;
  var bus = T.bus;
  var B = T.citlalpolBus, I = T.citlalpolImage;
  var params = new URLSearchParams(location.search);
  T.panelFrame.init({ role: 'citlalpol_image', name: params.get('name') || 'citlalpol_image' });

  var SVG = 'http://www.w3.org/2000/svg';
  var layer = document.getElementById('packets');
  var legIn = document.getElementById('leg-in'), legOut = document.getElementById('leg-out');
  var stateEl = document.getElementById('state');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scene = document.getElementById('scene'), orbit = document.getElementById('zoozve-orbit');
  var LOOP_S = 12, LOOP_AT = { x: 35, y: 155 };   // Zoozve's loop: its period and its translation (the page's SVG)
  if (still && scene.pauseAnimations) scene.pauseAnimations();
  var LEG_MS = 1200, MAX = 6;

  var rules = [], earths = ['🌍', '🌎', '🌏'], earthN = 0;
  var answered = false, citld = null, total = 0, last = null, flying = 0, dropped = 0;
  var launched = [];   // for the E2E checks: what traveled
  var batch = [], batchTimer = null;

  function siblings() { return T.skinPort.siblings(window) || []; }
  function say() {
    if (!answered) {
      stateEl.textContent = siblings().length ? 'no citlalpol_bus in this skin (skin add citlalpol_bus)' : 'alone: open it in a skin with citlalpol_bus';
      stateEl.className = 'none';
      return;
    }
    stateEl.className = '';
    stateEl.textContent = (citld === false ? '○ citld not running · ' : '') + total + ' records' +
      (last ? ' · last: ' + (last.decision || '?') : '') + (dropped ? ' · ' + dropped + ' not drawn (too many at once)' : '');
  }

  function el(tag, cls, text) {
    var e = document.createElementNS(SVG, tag);
    if (cls) e.setAttribute('class', cls);
    if (text != null) e.textContent = text;
    return e;
  }

  // move a glyph (and its count) along a path, forward or back; -> Promise
  function travel(g, path, back) {
    var len = path.getTotalLength();
    return new Promise(function (resolve) {
      if (still) { var p = path.getPointAtLength(back ? 0 : len); place(g, p); setTimeout(resolve, 400); return; }
      var t0 = null;
      function step(ts) {
        if (t0 == null) t0 = ts;
        var k = Math.min(1, (ts - t0) / LEG_MS);
        var p = path.getPointAtLength(len * (back ? 1 - k : k));
        place(g, p);
        if (k < 1) requestAnimationFrame(step); else resolve();
      }
      requestAnimationFrame(step);
    });
  }
  // where Zoozve is now: its motion is SMIL on the scene's clock, backwards along the loop
  function zoozveAt() {
    var t = scene.getCurrentTime ? scene.getCurrentTime() : 0;
    var p = orbit.getPointAtLength(orbit.getTotalLength() * (1 - (t % LOOP_S) / LOOP_S));
    return { x: p.x + LOOP_AT.x, y: p.y + LOOP_AT.y };
  }
  // from a point to Zoozve (followed as it moves), or back from it; -> Promise
  function hop(g, from, back) {
    return new Promise(function (resolve) {
      if (still) { place(g, back ? from : zoozveAt()); setTimeout(resolve, 400); return; }
      var t0 = null;
      function step(ts) {
        if (t0 == null) t0 = ts;
        var k = Math.min(1, (ts - t0) / (LEG_MS * 0.6)), z = zoozveAt(), a = back ? z : from, b = back ? from : z;
        place(g, { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
        if (k < 1) requestAnimationFrame(step); else resolve();
      }
      requestAnimationFrame(step);
    });
  }
  function place(g, p) { g.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ')'); }
  function pause(ms) { return new Promise(function (r) { setTimeout(r, still ? Math.min(ms, 300) : ms); }); }

  function fly(pk) {
    if (flying >= MAX) { dropped += pk.count; say(); return; }
    flying += 1;
    launched.push({ glyph: pk.glyph, route: pk.route, count: pk.count });
    var g = el('g');
    g.appendChild(el('text', 'packet', pk.glyph));
    var c = I.circled(pk.count);
    if (c) { var t = el('text', 'count', c); t.setAttribute('x', 11); t.setAttribute('y', 9); g.appendChild(t); }
    layer.appendChild(g);
    travel(g, legIn, false).then(function () {
      if (pk.route === 'out') return travel(g, legOut, false).then(function () {
        g.firstChild.textContent = earths[earthN++ % earths.length];
        return pause(500);
      });
      if (pk.route === 'local') {
        var venus = legIn.getPointAtLength(legIn.getTotalLength());
        return hop(g, venus, false).then(function () { return pause(250); })
          .then(function () { return hop(g, venus, true); })
          .then(function () { return travel(g, legIn, true); });
      }
      if (pk.route === 'back') return pause(250).then(function () { return travel(g, legIn, true); });
      var x = el('text', 'stop', '✕'); g.appendChild(x);
      return pause(900);
    }).then(function () {
      g.remove();
      flying -= 1;
    });
  }

  function take(records) {
    if (!records.length) return;
    total += records.length;
    last = records[records.length - 1];
    batch = batch.concat(records);
    if (!batchTimer) batchTimer = setTimeout(function () {
      var b = batch; batch = []; batchTimer = null;
      I.packets(b, rules).forEach(fly);
    }, 300);
    say();
  }

  bus.on('citlalpol.record', function (p, meta) {
    if (!B.fromMyBus(meta, siblings()) || !p) return;
    answered = true;
    take([p.r || {}]);
  });
  bus.on('citlalpol.state', function (p, meta) {
    if (!B.fromMyBus(meta, siblings())) return;
    citld = !!(p && p.citld);
    say();
  });
  // on opening: only how many there were and the last; the history is citlalpol_log's
  bus.onMine('citlalpol.records', function (p, meta) {
    if (!B.fromMyBus(meta, siblings()) || !p) return;
    answered = true;
    citld = p.citld == null ? citld : !!p.citld;
    var rs = (p.records || []);
    total = rs.length ? rs[rs.length - 1].n : 0;
    last = rs.length ? rs[rs.length - 1].r : null;
    say();
  });

  fetch(T.config.sibling('citlalpol.json'), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; })
    .catch(function () { return {}; })
    .then(function (s) {
      if (s && Array.isArray(s.glyphs)) rules = s.glyphs;
      if (s && Array.isArray(s.earths) && s.earths.length) earths = s.earths;
      var asks = 0;
      (function ask() {
        if (answered) return;
        bus.post('citlalpol.ask', { req: 'i' + (++asks) });
        say();
        setTimeout(ask, 2000);
      })();
    });

  window.citlalpolImage = { launched: function () { return launched.slice(); }, flying: function () { return flying; } };
})();
