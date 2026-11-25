// lib/citlalpol/citlalpol-image.js -- the pure part of citlalpol_image (D-citlalpol-bus): which glyph a
// record travels as (citlalpol.json's rules, on the record's structured fields only -- decision, proto,
// port, method, the path's extension, default; nothing of its strings is read), which way it goes, and
// the circled number of a packet standing for several.
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else (root.Tezcatl = root.Tezcatl || {}).citlalpolImage = mod;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function fields(r) {
    const path = typeof r.path === 'string' ? r.path.split('?')[0] : '';
    const m = /\.([A-Za-z0-9]{1,6})$/.exec(path);
    return {
      decision: r.decision || '', proto: r.proto || '', port: typeof r.port === 'number' ? r.port : null,
      method: typeof r.method === 'string' ? r.method.toUpperCase() : '', ext: m ? m[1].toLowerCase() : '',
      default: !!r.default,
    };
  }

  function matches(when, f) {
    return Object.keys(when || {}).every(function (k) {
      const want = when[k];
      if (Array.isArray(want)) return want.indexOf(f[k]) !== -1;
      return want === f[k];
    });
  }

  // record, rules -> the glyph (the first rule that matches; "💬" when none does)
  function glyphFor(r, rules) {
    const f = fields(r || {});
    const hit = (rules || []).find(function (g) { return g && typeof g.glyph === 'string' && matches(g.when, f); });
    return hit ? hit.glyph : '💬';
  }

  // which way (structured fields only): a pass to a zoozve gate (to_auth) -> to Zoozve, a local server, and back;
  // a name the wall's DNS answered (proto dns, pass) -> back from Citlalpol, which answered it itself; any other
  // pass -> on to the Internet; an old record's stand_in -> back; else stops there
  function route(r) {
    if (!r) return 'stop';
    if (r.decision === 'pass' && r.proto === 'dns') return 'back';
    if (r.decision === 'pass' && r.to_auth === 'zoozve') return 'local';
    if (r.decision === 'pass') return 'out';
    if (r.decision === 'stand_in' && !r.why) return 'back';
    return 'stop';
  }

  const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
  function circled(n) { return n <= 1 ? '' : n <= 20 ? Array.from(CIRCLED)[n - 1] : '20+'; }

  // records that came together -> packets: one per (glyph, route), counted
  function packets(records, rules) {
    const out = [];
    const by = {};
    (records || []).forEach(function (r) {
      const g = glyphFor(r, rules), w = route(r), k = g + '|' + w;
      if (!by[k]) { by[k] = { glyph: g, route: w, count: 0, decision: r.decision || '' }; out.push(by[k]); }
      by[k].count += 1;
    });
    return out;
  }

  return { glyphFor: glyphFor, route: route, circled: circled, packets: packets };
});
