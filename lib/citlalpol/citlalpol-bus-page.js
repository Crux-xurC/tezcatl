// lib/citlalpol/citlalpol-bus-page.js -- the page script of citlalpol_bus (panels/resident/citlalpol_bus.html;
// D-citlalpol-bus). The one reader of Citlalpol's records for its skin:
//   - reads them through the relay (GET /citlalpol/records?cursor=, files only -- never Citlalpol's door,
//     so looking makes no record), every poll_ms of citlalpol.json
//   - tells the panels of the same skin each new one (citlalpol.record {n, r}) and whether citld runs
//     (citlalpol.state {citld, count})
//   - answers a panel opened later with what it keeps (citlalpol.ask {req} -> citlalpol.records
//     {req, records: [{n, r}], citld}, to the asker), so it never sees half
// It passes the records on as they are: what they look like is citlalpol_log's and citlalpol_image's.
(function () {
  'use strict';
  var T = window.Tezcatl;
  var bus = T.bus;
  var params = new URLSearchParams(location.search);
  T.panelFrame.init({ role: 'citlalpol_bus', name: params.get('name') || 'citlalpol_bus' });

  var citldEl = document.getElementById('citld');
  var flowEl = document.getElementById('flow');
  var lastEl = document.getElementById('last');
  var L = T.citlalpolLog;

  var settings = { poll_ms: 2000, keep: 500 };
  var store = null;
  var cursor = null;
  var citld = null;
  var lastAt = 0;

  function siblings() { return T.skinPort.siblings(window) || []; }
  function mine(meta) {
    var id = meta && meta.from && meta.from.id;
    var sib = siblings();
    return !!id && (!sib.length || sib.some(function (s) { return s.id === id; }));
  }

  function show() {
    citldEl.textContent = citld == null ? '…' : citld ? '● citld' : '○ citld not running';
    citldEl.className = citld == null ? '' : citld ? 'up' : 'down';
    var busy = Date.now() - lastAt < 3000;
    flowEl.textContent = (busy ? 'running… ' : '') + store.count() + ' records';
    flowEl.className = busy ? 'busy' : '';
    var l = store.last();
    lastEl.textContent = l ? L.line(String(l.r.at || '').slice(11, 19) + ' ' + (l.r.decision || '?') + ' ' + (l.r.host || '') + (l.r.port ? ':' + l.r.port : '')) : '';
    bus.post('panel.status', { text: flowEl.textContent + (citld === false ? ' · citld not running' : '') });
  }

  var baseP = T.config.load().then(function (c) {
    var u = c && c.connections && c.connections[0] && c.connections[0].url;
    if (!u) return null;
    var x = new URL(u);
    return (x.protocol === 'wss:' ? 'https:' : 'http:') + '//' + x.host;
  }).catch(function () { return null; });

  function poll() {
    return baseP.then(function (b) {
      if (!b) throw new Error('config.json has no relay URL');
      return fetch(b + '/citlalpol/records' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''), { cache: 'no-store' });
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      if (j.cursor) cursor = j.cursor;
      var was = citld;
      citld = !!j.citld;
      var added = store.add(j.records || []);
      if (added.length) lastAt = Date.now();
      added.forEach(function (e) { bus.post('citlalpol.record', e); });
      if (added.length || was !== citld) bus.post('citlalpol.state', { citld: citld, count: store.count() });
      show();
    }).catch(function (e) {
      citldEl.textContent = '! ' + (e && e.message || e);
      citldEl.className = 'down';
    });
  }

  bus.on('citlalpol.ask', function (p, meta) {
    if (!store || !p || !mine(meta)) return;
    bus.post('citlalpol.records', { req: p.req, records: store.recent(), citld: citld }, { to: meta.from.id });
  });

  fetch(T.config.sibling('citlalpol.json'), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; })
    .catch(function () { return {}; })
    .then(function (s) {
      if (s && s.poll_ms > 0) settings.poll_ms = Math.max(500, s.poll_ms);
      if (s && s.keep > 0) settings.keep = s.keep;
      store = T.citlalpolBus.create({ keep: settings.keep });
      show();
      (function loop() { poll().then(function () { setTimeout(loop, settings.poll_ms); }); })();
      setInterval(show, 1000);
    });

  window.citlalpolBus = { count: function () { return store ? store.count() : 0; }, citld: function () { return citld; } };
})();
