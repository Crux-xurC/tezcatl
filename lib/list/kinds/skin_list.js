// lib/list/kinds/skin_list.js -- the list kind "skin_list": the skins kept by
// `skin save` (~work/store/frame-skins.json, lib/core/store.js; D-frame), and
// the ones in files that `skin read` also finds (lib/skin/frame-store.js):
// local/skins/ (a person's own) and skins/ (the ones shipped), each named in
// its directory's index.json -- the pages are served as files, a directory
// cannot be listed. A name is shown once, from where `skin read` would take it
// (saved, then local/skins, then skins); a row from a file says which.
// One file per kind; the table of kinds and what they share is lib/list/list-kinds.js.
// panels/tool/list.html loads only the kind it shows.
//
// A row is a skin: its name, then its lines (how many, how many are empty),
// its axis, its ratios and the panels of each line. A panel kept under a name
// that has since changed (lib/skin/frame-layout.js RENAMED: code_vi ->
// code_editor) is marked: `skin read` takes it under the new name, and a
// `skin save` afterwards writes the new one.
//   Enter  the skin in a new frame window (frame.html?skin=<name>), this list stays
//   M-r    the skin read into the frame focused last (skin.read = `skin read <name>`)
//   Del    twice: a saved skin moved to ~work/old/skins/<name>-<time>.json (D-old-place) and out of
//          the saved ones; a skin of a file is not moved (skins/ is shipped; local/skins/ is yours, by hand)
(function (root) {
  'use strict';
  var Tezcatl = (root.Tezcatl = root.Tezcatl || {});
  var kinds = typeof module === 'object' && module.exports ? require('../list-kinds.js') : Tezcatl.listKinds;
  function oldPlace() {
    if (typeof module === 'object' && module.exports) return require('../../core/old-place.js');
    return Tezcatl.oldPlace || null;
  }
  function layout() {
    if (typeof module === 'object' && module.exports) return require('../../skin/frame-layout.js');
    return Tezcatl.frameLayout || null;
  }

  kinds.skin_list = (function () {
    var KEY = 'tezcatl:frame:skins';

    // a saved skin (what `skin save` keeps) -> {lines, empty, axis, ratio, panels: [[name]], renamed: [old]}
    function summary(json) {
      var j = json && typeof json === 'object' ? json : {};
      var cols = Array.isArray(j.columns) ? j.columns : [];
      var renamedTable = (layout() && layout().RENAMED) || {};
      var renamed = [];
      var panels = cols.map(function (col) {
        return (Array.isArray(col) ? col : []).filter(function (p) { return Array.isArray(p) && typeof p[0] === 'string'; })
          .map(function (p) {
            if (renamedTable[p[0]] && renamed.indexOf(p[0]) < 0) renamed.push(p[0]);
            return p[0];
          });
      });
      return {
        lines: cols.length,
        empty: panels.filter(function (ps) { return !ps.length; }).length,
        axis: j.axis === 'v' ? 'v' : 'h',
        ratio: Array.isArray(j.ratio) ? j.ratio.slice() : [],
        panels: panels,
        renamed: renamed,
      };
    }

    // from: undefined (saved by skin save) or the directory of its file ('skins', 'local/skins')
    function toItem(name, json, from) {
      var s = summary(json);
      var renamedTable = (layout() && layout().RENAMED) || {};
      var lines = s.lines + ' line' + (s.lines === 1 ? '' : 's') + (s.empty ? ' (' + s.empty + ' empty)' : '');
      var sub = (from ? '[' + from + '/] ' : '') + lines + ' · axis ' + s.axis + ' · ' + (s.ratio.length ? s.ratio.join(':') : '-') + ' · ' +
        s.panels.map(function (ps) { return ps.length ? ps.join(', ') : '(empty)'; }).join(' | ');
      if (s.renamed.length) {
        sub += '  ⚠ old name: ' + s.renamed.map(function (o) { return o + ' → ' + renamedTable[o]; }).join(', ') + ' (skin save after reading writes the new one)';
      }
      var raw = { name: name, summary: s };
      if (from) raw.from = from;
      return { id: name, label: name, sub: sub, raw: raw };
    }

    // the saved skins (a map name -> skin) and the skins of files ([{name, json, from}],
    // in the order skin read looks) -> rows, by name; a name once, the first found
    function toItems(map, files) {
      var m = map && typeof map === 'object' && !Array.isArray(map) ? map : {};
      var rows = {};
      Object.keys(m).forEach(function (n) { rows[n] = toItem(n, m[n]); });
      (Array.isArray(files) ? files : []).forEach(function (f) {
        if (f && typeof f.name === 'string' && !rows[f.name]) rows[f.name] = toItem(f.name, f.json, f.from);
      });
      return Object.keys(rows).sort().map(function (n) { return rows[n]; });
    }

    function store() { return root.Tezcatl && root.Tezcatl.store; }

    // [dir of the page root, shown as] in the order skin read looks (frame-store.js SKIN_DIRS)
    var DIRS = [['local/skins/', 'local/skins'], ['skins/', 'skins']];
    var NAME = /^[\w.-]+$/;   // what skin read reads from a file
    function getJson(url) {
      return fetch(url, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    // -> Promise<[{name, json, from}]>: each directory's index.json, then its files; a
    // directory without an index (local/skins/ usually) or a name without its file: nothing
    // sibling: a path from the pages' root -> its URL (lib/core/config.js; given in tests)
    function filesListed(sibling) {
      var cfg = root.Tezcatl && root.Tezcatl.config;
      sibling = sibling || (cfg && cfg.sibling);
      if (!sibling || typeof fetch !== 'function') return Promise.resolve([]);
      return Promise.all(DIRS.map(function (d) {
        return getJson(sibling(d[0] + 'index.json')).then(function (names) {
          names = Array.isArray(names) ? names.filter(function (n) { return typeof n === 'string' && NAME.test(n); }) : [];
          return Promise.all(names.map(function (n) {
            return getJson(sibling(d[0] + n + '.json')).then(function (j) { return j ? { name: n, json: j, from: d[1] } : null; });
          }));
        });
      })).then(function (lists) {
        return [].concat.apply([], lists).filter(Boolean);
      });
    }

    function fill() {
      var saved = store() ? store().load(KEY).then(null, function () { return {}; }) : Promise.resolve({});
      return Promise.all([saved, filesListed()]).then(function (got) { return toItems(got[0], got[1]); });
    }

    // Del: asked twice; then the saved skin written to ~work/old/skins/ (a new file: "absent"),
    // and only when that is written, taken out of the saved ones -- never lost between the two
    var confirm = null;
    function remove(item, cfg, api) {
      var log = api.log || function () {};
      if (!item || !item.raw) return { ok: false };
      var name = item.raw.name;
      if (item.raw.from) {
        log('! "' + name + '" is a file of ' + item.raw.from + '/ ── ' + (item.raw.from === 'skins'
          ? 'the shipped skins stay'
          : 'move local/skins/' + name + '.json (and its name in local/skins/index.json) by hand'));
        return { ok: false };
      }
      var O = oldPlace();
      var st = api.store || store();   // api.store: the tests'
      if (!O || !st || !api.fsBase) { log('! cannot move a skin here (no store or relay)'); return { ok: false }; }
      confirm = confirm || O.twice({ ms: (cfg && cfg.confirmMs) || 3000 });
      if (!confirm.press(name)) { log('Del again to move "' + name + '" to ' + O.DIR + 'skins/ (it leaves this list)'); return { ok: false }; }
      return st.load(KEY).then(function (m) {
        var skin = m && typeof m === 'object' ? m[name] : null;
        if (!skin) { log('! "' + name + '" is not among the saved skins any more'); return { ok: false }; }
        var to = O.path('skins', name, new Date());
        var put = kinds.putDoc || Tezcatl.listKinds.putDoc;
        return put(api.fsBase + '/fs/write?path=' + encodeURIComponent(to), JSON.stringify(skin, null, 2) + '\n', 'absent').then(function (w) {
          if (!w.ok) { log('! "' + name + '" not moved: ' + w.message); return { ok: false }; }
          return st.update(KEY, function (cur) {
            if (!cur || typeof cur !== 'object' || !cur[name]) return undefined;
            var next = Object.assign({}, cur);
            delete next[name];
            return next;
          }).then(function (u) {
            if (u && u.ok === false) { log('! written to ' + to + ', but still among the saved skins: ' + u.message); return { ok: false }; }
            log('moved "' + name + '" to ' + to + ' (back: put it in local/skins/ and name it in local/skins/index.json)');
            return api.store ? { ok: true } : fill().then(function (items) { return { items: items }; });
          });
        });
      });
    }

    var openSettings = null;
    function openSkin(name, api) {
      var op = root.Tezcatl && root.Tezcatl.openPage;
      if (!op) { if (api.log) api.log('! lib/core/open-page.js is missing'); return; }
      var r = op.open('panels/skins/frame.html?skin=' + encodeURIComponent(name), null, openSettings);
      if (api.log) api.log(r && r.error ? '! ' + r.error : 'skin "' + name + '" in a new frame window');
    }

    return {
      fill: fill,
      subscribe: function (cfg, api, onChange) {
        var op = root.Tezcatl && root.Tezcatl.openPage;
        if (op && op.loadSettings) op.loadSettings().then(function (s) { openSettings = s; }, function () {});
        var ms = (cfg && cfg.pollMs) || 3000;
        var stop = false;
        var t = null;
        function tick() {
          if (stop) return;
          fill().then(function (items) { if (!stop) onChange(items); t = root.setTimeout(tick, ms); },
                      function () { t = root.setTimeout(tick, ms); });
        }
        t = root.setTimeout(tick, ms);
        return function () { stop = true; if (t) root.clearTimeout(t); };
      },
      onSelect: function (item, cfg, api) {
        if (item && item.raw) openSkin(item.raw.name, api);
      },
      remove: remove,
      onKey: function (chord, item, cfg, api) {
        if (!item || !item.raw || !cfg || !cfg.keys || cfg.keys[chord] !== 'read') return;
        var name = item.raw.name;
        if (!/^\S+$/.test(name)) { if (api.log) api.log('! "' + name + '" has a blank: open it with Enter (a new window)'); return; }
        var C = api.commands || (root.Tezcatl && root.Tezcatl.commands);
        if (!C) { if (api.log) api.log('! lib/core/commands.js is missing'); return; }
        C.invoke('skin.read', { name: name }, { onNone: function () { if (api.log) api.log('! no frame takes skin.read ── open it with Enter'); } });
        if (api.log) api.log('skin read ' + name + ' ── in the frame focused last');
      },
      _summary: summary,
      _toItem: toItem,
      _toItems: toItems,
      _filesListed: filesListed,
    };
  })();
})(typeof self !== 'undefined' ? self : this);
