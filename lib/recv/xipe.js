// lib/recv/xipe.js -- Xipe Totec as a source of the receiving side
// (output_target/xipe.json; D-xipe-elsewhere). The shape is in lib/recv/xterm.js.
//
// One: the lines sent to Xipe Totec from this skin outside the dialogue window
// (the dock's input line with xipe as its destination, lib/target/xipe.js; a
// matrix_set's `xipe <line>`, lib/xipe/matrix-bar-page.js) and their answers,
// as the dialogue window's record shows them -- said on the bus as xipe.said
// {lines, kind, root, skin}. Only its own skin's: a sibling (a matrix_set's bar), or
// a page saying the same skin (the dock's input_target is no panel of the skin,
// so it says its skin's bus id); alone in a window, any.
// The broadcast notify/* lines are left out here (the dialogue window shows them).
(function (root) {
  'use strict';
  var T = (root.Tezcatl = root.Tezcatl || {});
  var KEEP = 500;

  function create(ctx) {
    var rec = [];
    var changed = function () {};

    function mine(p, meta) {
      var sib = ctx.siblings() || [];
      var skin = ctx.skin ? ctx.skin() : null;
      if (!sib.length && !skin) return true;
      if (skin && p.skin === skin) return true;
      var id = meta && meta.from && meta.from.id;
      return !!id && sib.some(function (x) { return x.id === id; });
    }

    function start(onChange) {
      changed = onChange || changed;
      T.bus.on('xipe.said', function (p, meta) {
        if (!p || !Array.isArray(p.lines) || p.kind === 'notify' || !mine(p, meta)) return;
        var cls = p.kind === 'sent' ? 'sent' : p.kind === 'info' ? 'meta' : (p.lines[0] && /^! /.test(p.lines[0]) ? 'err' : '');
        p.lines.forEach(function (l) { rec.push({ text: String(l), cls: cls }); });
        if (rec.length > KEEP) rec.splice(0, rec.length - KEEP);
        changed('xipe');
      });
    }

    function candidates() {
      var last = rec[rec.length - 1];
      return [{ key: 'xipe', label: 'xipe', state: 'open', detail: last ? last.text : '' }];
    }

    function lines() { return rec.slice(); }

    return { start: start, candidates: candidates, lines: lines };
  }

  (T.recvSources = T.recvSources || {}).xipe = { create: create };
})(typeof self !== 'undefined' ? self : this);
