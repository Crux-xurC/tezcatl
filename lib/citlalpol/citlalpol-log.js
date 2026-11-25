// lib/citlalpol/citlalpol-log.js -- the pure part of citlalpol_log (D-citlalpol-bus): one record of
// Citlalpol as one row of the table. Every value goes in as text (the grid draws text only):
// the strings are the wall's program's and may be anything.
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else (root.Tezcatl = root.Tezcatl || {}).citlalpolLog = mod;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const COLUMNS = [
    ['time', 'time'], ['decision', 'decision'], ['proto', 'proto'], ['dest', 'destination'], ['request', 'request'],
    ['cmd', 'command'], ['result', 'result / why'], ['access', 'access.json'], ['run', 'run'],
  ];

  function s(v) { return v == null ? '' : String(v); }
  // control characters shown as \xNN (a cell is one line, and nothing in it acts)
  function line(v) { return s(v).replace(/[\x00-\x1f\x7f-\x9f]/g, function (c) { return '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0'); }); }

  function result(r) {
    if (r.why) return r.why;
    if (r.matched) return 'matched ' + r.matched;
    if (r.default) return 'undecided (captured)';
    if (r.decision === 'pass') return 'passed';
    return '';
  }

  // {n, r} -> a row of the grid
  function row(e) {
    const r = e.r || {};
    return {
      id: 'c' + e.n,
      cells: {
        time: line(s(r.at).slice(11, 19)),
        decision: line(r.decision),
        proto: line(r.proto),
        dest: line(r.host != null ? s(r.host) + ':' + s(r.port) : ''),
        request: line([r.method, r.path].filter(Boolean).join(' ')),
        cmd: line(r.cmd),
        result: line(result(r)),
        access: line(r.access),
        run: line(r.run),
      },
    };
  }

  // the record in full, for under the table (text)
  function detail(e) { return JSON.stringify(e.r, null, 2); }

  return { COLUMNS: COLUMNS, row: row, detail: detail, line: line };
});
