// lib/target/xipe.js -- Xipe Totec as a destination of input_target
// (input_target/xipe.json; D-xipe-elsewhere). The shape is in lib/target/emacs-vent.js.
//
// One, the project "." of xipe.json: a line typed in the dock's input line (or
// the palette's) goes to Xipe Totec as the dialogue window sends one -- `input`
// {text}, unread (lib/xipe/xipe-line.js). A line of chars only, as tezcatl's
// destination takes (a key with a modifier, or a named key, is refused; the
// returns at its end are its end). What went and what came back is said on the
// bus (xipe.said {lines, kind, root, skin}), which the receiving side's Xipe Totec
// source shows (lib/recv/xipe.js) -- it follows the destination, so the answer
// is seen where the line was typed.
(function (root) {
  'use strict';
  var T = (root.Tezcatl = root.Tezcatl || {});
  var ROOT = '.';

  function create() {
    var changed = function () {};
    var last = '';
    var line = null;

    function start(onChange) {
      changed = onChange || changed;
      line = T.xipeLine.create({
        T: T, bus: T.bus, root: ROOT,
        on: {
          state: function () { changed(); },
          lines: function (ls, kind) {
            if (kind === 'reply' && ls.length) last = ls[0];
            T.bus.post('xipe.said', { lines: ls, kind: kind, root: ROOT, skin: T.skinPort ? T.skinPort.id(window) : null });
            if (kind === 'reply') changed();
          },
        },
      });
    }

    function candidates() {
      var s = line ? line.state() : 'connecting';
      return [{
        key: 'xipe',
        label: 'xipe',
        state: s,
        detail: last || ('root ' + ROOT),
        lines: ['Xipe Totec, root ' + ROOT + ': a line as the dialogue window sends it (help, do …, eval …)',
          'last answer: ' + (last || '(none yet)')],
      }];
    }

    function send(_key, events) {
      if (!line) return Promise.resolve({ ok: false, error: 'xipe: not started' });
      var n = events.length;
      while (n > 0 && events[n - 1].key === 'return' && !(events[n - 1].modifiers || []).length) n--;
      if (!n) return Promise.resolve({ ok: false, error: 'xipe: an empty line' });
      var text = '';
      for (var i = 0; i < n; i++) {
        var e = events[i];
        if ((e.modifiers && e.modifiers.length) || Array.from(e.key).length !== 1) {
          return Promise.resolve({ ok: false, error: 'xipe takes a line of chars, not ' + (T.lead ? T.lead.describe([e]) : e.key) });
        }
        text += e.key;
      }
      return line.send(text);
    }

    return { start: start, candidates: candidates, send: send };
  }

  (T.targets = T.targets || {}).xipe = { create: create };
})(typeof self !== 'undefined' ? self : this);
