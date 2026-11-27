// lib/core/old-place.js -- where tezcatl puts what a person takes away (D-old-place): nothing kept by
// tezcatl is deleted from a panel; it is moved to ~work/old/<kind>/<name>-<YYYYMMDD-HHMMSS>.json, out of
// every list, and a person cleans ~work/old/ with the shell (rm -r ~/.local/state/tezcatl/work/old/*).
// A move is asked twice (the same key again within `ms`), as magit's X.
//
//   path(kind, name, date)   -> "~work/old/<kind>/<name>-<stamp>.json"; a name's characters outside
//                               [\w.-] become "-" (the file is one name, never a path)
//   twice({ms, now})         -> {press(key) -> true when the same key was pressed within ms, else false
//                               (and the press is remembered)}
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else (root.Tezcatl = root.Tezcatl || {}).oldPlace = mod;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DIR = '~work/old/';

  function pad(n) { return String(n).padStart(2, '0'); }
  function stamp(d) {
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }
  function safe(s) { return String(s == null ? '' : s).replace(/[^\w.-]/g, '-').replace(/^\.+/, '-') || '-'; }

  function path(kind, name, date) {
    return DIR + safe(kind) + '/' + safe(name) + '-' + stamp(date || new Date()) + '.json';
  }

  function twice(opts) {
    const ms = (opts && opts.ms) || 3000;
    const now = (opts && opts.now) || Date.now;
    let last = null;
    return {
      press: function (key) {
        const t = now();
        const again = !!(last && last.key === key && t - last.t <= ms);
        last = again ? null : { key: key, t: t };
        return again;
      },
    };
  }

  return { DIR: DIR, path: path, twice: twice };
});
