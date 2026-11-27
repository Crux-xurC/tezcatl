// lib/xipe/matrix-kinds.js -- the kinds of table matrix.html shows (D-matrix-shell, D-matrix-raw), the
// pure part: the built-in adapters (named and described here; their code is in lib/xipe/matrix-page.js
// and the adapters it calls), two that show an answer as it is, and kinds declared as data.
//
//   json:<path>                  a JSON file as it is (~work/... or a path from the FS root)
//   xipe_raw:<method>[?k=v&...]  a Xipe Totec method's answer as it is -- only a method that changes
//                                nothing (method/list: route dispatch, writes false, no confirm, no REPL)
//   <name>:all                   a declared kind: matrix_kinds/<name>.json (shipped, named in its
//                                index.json) or ~work/matrix_kinds/<name>.json (yours, looked at first;
//                                `matrix save-kind <name>` writes one from the table shown)
//
// "As it is" is structure only (JSON), never text read for meaning: the items are the answer when it is
// an array, else the one array it holds (or the declaration's `from`), else its keys as rows. A cell is
// the value as text (an object or array as JSON). A declaration:
//
//   { "name": "cards", "desc": "...", "source": {"xipe": "card/list", "params": {}} | {"file": "<path>"},
//     "from": "cards", "id": "id", "ids": "node", "type": "function",
//     "columns": ["label", "effect", ...] (or [{"key", "label"}]; none: every key),
//     "place": {"path": "path", "line": "line"} }
//
// id: the key whose value is a row's id (colours, selection, `radar`'s ids) -- when every item has a
// different one, else the row's position (r0, r1 ...); ids: what those ids are, said by `radar`
// ("node" -> "(node ids)"); place: the keys of where an item is defined, for `g d` (a Xipe Totec
// source's path is from the project's root, a file's from the FS root).
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else (root.Tezcatl = root.Tezcatl || {}).matrixKinds = mod;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // the adapters written in code: name -> [what it shows, what its ref is]
  const BUILTIN = {
    xipe: ['one function and its calc rows (card/get)', 'an address: module=Calc&name=add&arity=2, or row=<call id>'],
    xipe_rows: ['every calc row as a sentence (row/list)', 'all, or call_ids=<id>,<id>'],
    xipe_classes: ['the classes waiting for a person; matrix approve (card/list)', 'all, source=agent, source=changed'],
    given: ["a table its synthesis' main hands it (a database window)", 'its name'],
    demo: ['a fixture to try the keys on', 'anything'],
    json: ['a JSON file as it is (an array of objects, or an object holding one)', 'a path: ~work/... or from the FS root'],
    xipe_raw: ["a Xipe Totec method's answer as it is (only one that changes nothing)", '<method>[?key=value&...]'],
  };
  const NAME = /^[A-Za-z][\w.-]*$/;
  const MINE = '~work/matrix_kinds/';
  const SHIPPED = 'matrix_kinds/';

  function str(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  // an answer -> {items: [object], from: key | null, keyed: bool}
  function items(answer, from) {
    if (Array.isArray(answer)) return { items: answer.map(asItem), from: null, keyed: false };
    if (isObj(answer)) {
      if (from && Array.isArray(answer[from])) return { items: answer[from].map(asItem), from: from, keyed: false };
      const arrays = Object.keys(answer).filter(function (k) { return Array.isArray(answer[k]); });
      if (!from && arrays.length === 1) return { items: answer[arrays[0]].map(asItem), from: arrays[0], keyed: false };
      return { items: Object.keys(answer).map(function (k) { return { key: k, value: answer[k] }; }), from: null, keyed: true };
    }
    return { items: answer == null ? [] : [{ value: answer }], from: null, keyed: false };
  }
  function asItem(v) { return isObj(v) ? v : { value: v }; }

  // the keys of the items, in the order first met
  function keysOf(list) {
    const seen = [];
    list.forEach(function (it) { Object.keys(it).forEach(function (k) { if (seen.indexOf(k) < 0) seen.push(k); }); });
    return seen;
  }

  // does `key` give every item a different id (a non-empty string or a number)?
  function idKeyHolds(list, key) {
    if (!key || !list.length) return false;
    const seen = {};
    return list.every(function (it) {
      const v = it[key];
      if (!(typeof v === 'string' && v) && typeof v !== 'number') return false;
      if (seen['_' + v]) return false;
      seen['_' + v] = true;
      return true;
    });
  }

  // items + declaration -> {columns, rows, type, ids, idKey}; place(path) -> a path code_editor opens, or null
  function toGrid(list, decl, place) {
    decl = decl || {};
    const cols = Array.isArray(decl.columns) && decl.columns.length
      ? decl.columns.map(function (c) { return typeof c === 'string' ? { key: c, label: c } : { key: String(c.key), label: String(c.label || c.key) }; })
      : keysOf(list).map(function (k) { return { key: k, label: k }; });
    const idKey = idKeyHolds(list, decl.id) ? decl.id : null;
    const pl = isObj(decl.place) ? decl.place : null;
    return {
      type: typeof decl.type === 'string' && decl.type ? decl.type : 'item',
      ids: idKey && typeof decl.ids === 'string' && decl.ids ? decl.ids : (idKey ? idKey : 'position'),
      idKey: idKey,
      columns: cols.map(function (c) { return { key: c.key, label: c.label, render: 'text' }; }),
      rows: list.map(function (it, i) {
        const cells = {};
        cols.forEach(function (c) { cells[c.key] = str(it[c.key]); });
        const row = { id: idKey ? String(it[idKey]) : 'r' + i, cells: cells };
        if (pl && typeof it[pl.path] === 'string' && it[pl.path]) {
          const at = typeof place === 'function' ? place(it[pl.path]) : it[pl.path];
          const line = Number(it[pl.line]);
          if (at) row.open = { path: at, span: line > 0 ? { line: line } : null };
        }
        return row;
      }),
    };
  }

  // a value of a query, as Xipe Totec takes it: JSON when it reads as JSON ([..], {..}, numbers, true,
  // false, null, "..."), else the text; "a,b" for a key ending in _ids or named ids/args is a list
  function paramValue(key, v) {
    const t = String(v);
    if (/^\s*([[{"]|-?\d|true\b|false\b|null\b)/.test(t)) {
      try { return JSON.parse(t); } catch (e) { /* text */ }
    }
    if (/(^|_)ids$|^args$/.test(key)) return t.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    return t;
  }

  // xipe_raw's ref -> {method, params} | {error}
  function parseRaw(ref) {
    const s = String(ref == null ? '' : ref).trim();
    const q = s.indexOf('?');
    const method = (q >= 0 ? s.slice(0, q) : s).trim();
    if (!method || method === 'all' || !/^[\w-]+(\/[\w-]+)*$/.test(method)) return { error: 'xipe_raw: which method (xipe_raw:card/list)' };
    const params = {};
    if (q >= 0) new URLSearchParams(s.slice(q + 1)).forEach(function (v, k) { params[k] = paramValue(k, v); });
    return { method: method, params: params };
  }

  // method/list's answer, a method -> {ok: true} | {error}: only what changes nothing is called
  function allowed(listed, method) {
    const ms = listed && Array.isArray(listed.methods) ? listed.methods : [];
    const m = ms.filter(function (x) { return x && x.name === method; })[0];
    if (!m) return { error: method + ' is not a method Xipe Totec lists (method/list)' };
    if (m.writes || m.confirm || m.repl || m.route !== 'dispatch') {
      return { error: method + ' changes something (' + (m.writes ? 'writes the Book' : m.confirm ? 'asks to confirm' : 'runs the REPL') + '): xipe_raw shows only what changes nothing ── send it with xipe <line>' };
    }
    return { ok: true };
  }

  // a declaration read -> {decl} | {error}
  function readDecl(json, name) {
    if (!isObj(json)) return { error: name + ': not a JSON object' };
    const src = json.source;
    const okSrc = isObj(src) && ((typeof src.xipe === 'string' && src.xipe) || (typeof src.file === 'string' && src.file));
    if (!okSrc) return { error: name + ': source is {"xipe": "<method>"} or {"file": "<path>"}' };
    if (json.name != null && json.name !== name) return { error: name + ': its "name" is "' + json.name + '"' };
    return { decl: Object.assign({}, json, { name: name }) };
  }

  // the table shown (a json / xipe_raw / declared one) -> a declaration to keep under `name`
  // shown: {kind, ref, decl?, from, columns: [{key, label}], list: [items]}
  function declOf(name, shown) {
    if (!NAME.test(String(name || '')) || BUILTIN[name]) return { error: 'save-kind: a name of letters, digits, _ . - (not ' + Object.keys(BUILTIN).join(', ') + ')' };
    let source;
    if (shown.decl) source = shown.decl.source;
    else if (shown.kind === 'json') source = { file: shown.ref };
    else if (shown.kind === 'xipe_raw') {
      const r = parseRaw(shown.ref);
      if (r.error) return r;
      source = { xipe: r.method, params: r.params };
    } else return { error: 'save-kind: only a table shown as it is (json:, xipe_raw:) or a declared one' };
    const list = shown.list || [];
    const keys = keysOf(list);
    const d = { name: name, desc: (shown.decl && shown.decl.desc) || '', source: source };
    const from = shown.from || (shown.decl && shown.decl.from);
    if (from) d.from = from;
    const id = shown.decl && shown.decl.id ? shown.decl.id : (idKeyHolds(list, 'id') ? 'id' : null);
    if (id) d.id = id;
    if (shown.decl && shown.decl.ids) d.ids = shown.decl.ids;
    d.type = (shown.decl && shown.decl.type) || name;
    d.columns = (shown.columns || []).map(function (c) { return c.key; });
    const place = shown.decl && shown.decl.place ? shown.decl.place
      : (keys.indexOf('path') >= 0 ? (keys.indexOf('line') >= 0 ? { path: 'path', line: 'line' } : { path: 'path' }) : null);
    if (place) d.place = place;
    return { decl: d, path: MINE + name + '.json' };
  }

  // the receiving side's lines of `matrix kinds`: the built-in, then the declared ([{name, desc, where}])
  function lines(declared) {
    const out = Object.keys(BUILTIN).map(function (k) { return k + ' ── ' + BUILTIN[k][0] + '; ref: ' + BUILTIN[k][1]; });
    (declared || []).forEach(function (d) { out.push(d.name + ' ── ' + (d.desc || '(declared)') + '  [' + d.where + ']'); });
    return out;
  }

  // -- where declarations are (io: {getJson(url) -> Promise<json | null>, sibling(rel) -> URL of a page
  // file, fsBase: the relay's http base | null}) -----------------------------------------------------
  function fsRead(io, path) { return io.fsBase ? io.getJson(io.fsBase + '/fs/read?path=' + encodeURIComponent(path)) : Promise.resolve(null); }

  // a declared kind by name: yours first, then the shipped -> Promise<{decl, where} | {error} | null>
  function find(name, io) {
    if (!NAME.test(String(name || '')) || BUILTIN[name]) return Promise.resolve(null);
    return fsRead(io, MINE + name + '.json').then(function (j) {
      if (j) return withWhere(readDecl(j, name), MINE);
      return io.getJson(io.sibling(SHIPPED + 'index.json')).then(function (names) {
        if (!Array.isArray(names) || names.indexOf(name) < 0) return null;
        return io.getJson(io.sibling(SHIPPED + name + '.json')).then(function (j2) {
          return j2 ? withWhere(readDecl(j2, name), SHIPPED) : { error: SHIPPED + name + '.json could not be read' };
        });
      });
    });
  }
  function withWhere(r, where) { return r.error ? r : { decl: r.decl, where: where }; }

  // every declared kind -> Promise<[{name, desc, where}]>: yours (the directory ~work/matrix_kinds/ as
  // the relay lists it: {entries: [{name, type}]}), then the shipped ones not shadowed
  function declared(io) {
    const mine = io.fsBase ? io.getJson(io.fsBase + '/fs?path=' + encodeURIComponent(MINE.replace(/\/$/, ''))) : Promise.resolve(null);
    return mine.then(function (dir) {
      const names = (dir && Array.isArray(dir.entries) ? dir.entries : [])
        .map(function (e) { return e && typeof e.name === 'string' ? e.name : ''; })
        .filter(function (n) { return /\.json$/.test(n); })
        .map(function (n) { return n.slice(0, -5); })
        .filter(function (n) { return NAME.test(n) && !BUILTIN[n]; })
        .sort();
      return Promise.all(names.map(function (n) {
        return fsRead(io, MINE + n + '.json').then(function (j) { return { name: n, desc: j && j.desc, where: MINE }; });
      }));
    }).then(function (mineList) {
      return io.getJson(io.sibling(SHIPPED + 'index.json')).then(function (names) {
        names = Array.isArray(names) ? names.filter(function (n) { return NAME.test(String(n)) && !BUILTIN[n]; }) : [];
        const taken = mineList.map(function (d) { return d.name; });
        return Promise.all(names.filter(function (n) { return taken.indexOf(n) < 0; }).map(function (n) {
          return io.getJson(io.sibling(SHIPPED + n + '.json')).then(function (j) { return { name: n, desc: j && j.desc, where: SHIPPED }; });
        })).then(function (shipped) { return mineList.concat(shipped); });
      });
    });
  }

  // the io of a page: T = Tezcatl (config.load, config.sibling) -> Promise<io>; the relay's http base from
  // config.json's first connection, as /fs's other users find it
  function ioFor(T) {
    function getJson(u) {
      return fetch(u, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    }
    return T.config.load().then(function (cfg) {
      const u = cfg && cfg.connections && cfg.connections[0] && cfg.connections[0].url;
      if (!u) return null;
      const x = new URL(u);
      return (x.protocol === 'wss:' ? 'https:' : 'http:') + '//' + x.host;
    }).catch(function () { return null; }).then(function (b) {
      return { getJson: getJson, sibling: T.config.sibling, fsBase: b };
    });
  }

  return {
    BUILTIN: BUILTIN, NAME: NAME, MINE: MINE, SHIPPED: SHIPPED,
    find: find, declared: declared, ioFor: ioFor,
    items: items, toGrid: toGrid, parseRaw: parseRaw, allowed: allowed, readDecl: readDecl, declOf: declOf, lines: lines,
    _str: str, _keysOf: keysOf,
  };
});
