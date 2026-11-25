// lib/citlalpol/citlalpol-bus.js -- the pure part of citlalpol_bus (D-citlalpol-bus): the records
// read so far, numbered as they came (n), the last `keep` of them kept for a panel opened later.
// A record is Citlalpol's JSON line as it is; nothing here reads its strings.
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else (root.Tezcatl = root.Tezcatl || {}).citlalpolBus = mod;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function create(opts) {
    const keep = Math.max(1, (opts && opts.keep) || 500);
    let n = 0;
    let kept = [];
    return {
      // records (plain objects) -> the entries added, [{n, r}]
      add: function (records) {
        const added = (records || []).filter(function (r) { return r && typeof r === 'object' && !Array.isArray(r); })
          .map(function (r) { n += 1; return { n: n, r: r }; });
        kept = kept.concat(added);
        if (kept.length > keep) kept = kept.slice(kept.length - keep);
        return added;
      },
      recent: function () { return kept.slice(); },
      count: function () { return n; },
      last: function () { return kept.length ? kept[kept.length - 1] : null; },
    };
  }

  // is the message from citlalpol_bus of this skin? (siblings: the skin port's list, null alone)
  function fromMyBus(meta, siblings) {
    const id = meta && meta.from && meta.from.id;
    return !!id && (siblings || []).some(function (s) { return s.id === id && s.role === 'citlalpol_bus'; });
  }

  return { create: create, fromMyBus: fromMyBus };
});
