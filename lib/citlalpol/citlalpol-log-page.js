// lib/citlalpol/citlalpol-log-page.js -- the page script of citlalpol_log (panels/resident/citlalpol_log.html;
// D-citlalpol-bus). Citlalpol's records as a table, from the citlalpol_bus of the same skin only:
// on opening it asks that bus for what it keeps (citlalpol.ask), then takes each new record
// (citlalpol.record). Rows are only added at the bottom and never change -- the exception to
// D-matrix-shell's "no automatic refresh": colours and selection are kept by row id, so nothing moves
// under the cursor. p pauses (what comes meanwhile waits, counted, and is added on going on).
// It reads only.
(function () {
  'use strict';
  var T = window.Tezcatl;
  var bus = T.bus;
  var B = T.citlalpolBus, L = T.citlalpolLog;
  var params = new URLSearchParams(location.search);
  T.panelFrame.init({ role: 'citlalpol_log', name: params.get('name') || 'citlalpol_log' });

  var gridEl = document.getElementById('grid-wrap');
  var stateEl = document.getElementById('state');
  var detailEl = document.getElementById('detail');
  if (T.panelFrame.setFocusTarget) T.panelFrame.setFocusTarget(gridEl);

  var grid = T.matrixGrid.create({ el: gridEl, bus: bus });
  grid.setColumns(L.COLUMNS.map(function (c) { return { key: c[0], label: c[1] }; }));
  grid.render();

  var byId = {};
  var seen = 0;          // the largest n added
  var paused = false;
  var waiting = [];
  var answered = false;
  var citld = null;
  var shownId = null;

  function siblings() { return T.skinPort.siblings(window) || []; }

  function say() {
    var parts = [];
    if (!answered) parts.push(siblings().length ? 'no citlalpol_bus in this skin (skin add citlalpol_bus)' : 'alone: open it in a skin with citlalpol_bus');
    else {
      parts.push(Object.keys(byId).length + ' records');
      if (citld === false) parts.push('citld not running');
      if (paused) parts.push('paused' + (waiting.length ? ' · ' + waiting.length + ' waiting' : ''));
    }
    stateEl.textContent = parts.join(' · ');
    stateEl.className = !answered ? 'none' : paused ? 'paused' : '';
  }

  function add(entries) {
    var fresh = (entries || []).filter(function (e) { return e && e.n > seen; });
    if (!fresh.length) return;
    if (paused) { waiting = waiting.concat(fresh); say(); return; }
    var atEnd = atBottom();
    fresh.forEach(function (e) {
      seen = Math.max(seen, e.n);
      var row = L.row(e);
      byId[row.id] = e;
      grid.patchRow(row.id, row.cells);
    });
    grid.render();
    if (atEnd) gridEl.scrollTop = gridEl.scrollHeight;
    say();
  }

  function atBottom() { return gridEl.scrollTop + gridEl.clientHeight >= gridEl.scrollHeight - 4; }

  bus.on('citlalpol.record', function (p, meta) {
    if (!B.fromMyBus(meta, siblings())) return;
    answered = true;
    add([p]);
  });
  bus.on('citlalpol.state', function (p, meta) {
    if (!B.fromMyBus(meta, siblings())) return;
    citld = !!(p && p.citld);
    say();
  });
  bus.onMine('citlalpol.records', function (p, meta) {
    if (!B.fromMyBus(meta, siblings()) || !p) return;
    answered = true;
    citld = p.citld == null ? citld : !!p.citld;
    add(p.records);
    say();
  });

  // ask until a bus of this skin answers (it may be added after this panel)
  var asks = 0;
  (function ask() {
    if (answered) return;
    bus.post('citlalpol.ask', { req: 'l' + (++asks) });
    say();
    setTimeout(ask, 2000);
  })();

  function here() {
    var g = grid.getState();
    if (g.cursor.rowIndex == null) return null;
    var k = g.order[g.cursor.rowIndex];
    return k == null ? null : { id: k, e: byId[k] };
  }
  function toggleDetail() {
    var h = here();
    if (!h || !h.e) return;
    if (shownId === h.id) { detailEl.hidden = true; shownId = null; return; }
    shownId = h.id;
    detailEl.textContent = L.detail(h.e);
    detailEl.hidden = false;
  }

  gridEl.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (grid.getState().filterPrompt) { var n0 = T.keymap.normalize(e); if (n0 && grid.handleKey(n0)) { e.preventDefault(); grid.render(); } return; }
    if (e.key === 'p') {
      e.preventDefault();
      paused = !paused;
      if (!paused) { var w = waiting; waiting = []; add(w); }
      say();
      return;
    }
    if (e.key === 'Enter') { e.preventDefault(); toggleDetail(); return; }
    var n = T.keymap.normalize(e);
    if (n && grid.handleKey(n)) { e.preventDefault(); grid.render(); if (shownId && (!here() || here().id !== shownId)) toggleDetail(); }
  });

  say();
  window.citlalpolLog = {
    rows: function () { return Object.keys(byId).length; },
    paused: function () { return paused; },
    cells: function () { return Object.keys(byId).map(function (k) { return L.row(byId[k]).cells; }); },
  };
})();
