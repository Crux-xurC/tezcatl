// lib/xipe/xipe-line.js -- lines typed outside the dialogue window, sent to Xipe Totec
// as the dialogue window sends them (D-xipe-dialogue; D-xipe-elsewhere): the dock's
// input line with Xipe Totec as its destination (lib/target/xipe.js) and the
// matrix_set's command line (`xipe <line>`, lib/xipe/matrix-bar-page.js).
//
// One persistent /xipe connection (lib/xipe/xipe-session.js) per root; a line
// goes as `input` {text} unread -- what it means is Xipe Totec's. "@" in it is
// the last reference (`radar`), put there as text before it goes, as in the
// dialogue window. What went and what came back is said:
//   on.lines(lines, kind)   kind: 'sent' | 'reply' | 'notify' | 'info' --
//                           lines as the dialogue window's record shows them
//                           (lib/xipe/xipe-transcript.js)
//   on.state(state)         'connecting' | 'open' | 'closed' | 'no-config'
// and on the bus: xipe.sent {req} and xipe.answered {req, ok} (a pair of the
// work store, as the dialogue window's), so a line waiting for its answer is
// seen in `work`.
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else (root.Tezcatl = root.Tezcatl || {}).xipeLine = mod;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // opts: {T (Tezcatl), bus, root: "<xipe.json key>", on: {lines, state}}
  function create(opts) {
    const T = opts.T;
    const bus = opts.bus;
    const on = opts.on || {};
    const rootKey = opts.root || '.';
    let state = 'connecting';
    let session = null;
    let sending = Promise.resolve();

    function lines(ls, kind) { if (typeof on.lines === 'function') on.lines(ls, kind); }
    function setState(s) { state = s; if (typeof on.state === 'function') on.state(s); }

    const X = T.xipeTranscript;
    // a line sent before the connection is made waits for it (xipe-session holds
    // what is sent until Xipe Totec answered initialize)
    const made = T.config.load().then(function (c) {
      session = T.xipeSession.create({
        url: T.xipeSession.relayXipeUrl(c, '/xipe'),
        root: rootKey,
        on: {
          state: setState,
          info: function (i) {
            lines(X.info(i), 'info');
            (i.ids || []).forEach(function (id) { bus.post('xipe.answered', { req: id, ok: false }); });
          },
          reply: function (r) {
            lines(X.reply(r), 'reply');
            bus.post('xipe.answered', { req: r.id, ok: !r.error });
          },
          notify: function (n) { lines(X.notify(n), 'notify'); },
        },
      });
    }).catch(function (e) {
      setState('no-config');
      lines(['# config: ' + (e && e.message || e)], 'info');
    });

    // one line -> Promise<{ok, error}>: ok once it is sent (its answer comes as on.lines 'reply')
    function send(text) {
      const line = String(text == null ? '' : text);
      if (!line.trim()) return Promise.resolve({ ok: false, error: 'xipe: an empty line' });
      const go = sending.then(function () { return made; }).then(function () {
        if (!session) return { ok: false, error: 'xipe: no connection (' + state + ')' };
        const expand = T.radar && T.recvRefs ? T.radar.expand(bus, line, T.recvRefs.text) : Promise.resolve({ line: line });
        return expand.then(function (r) {
          if (r.error) { lines(X.sent(line).concat(['# ' + r.error]), 'sent'); return { ok: false, error: r.error }; }
          lines(X.sent(r.line), 'sent');
          bus.post('xipe.sent', { req: session.input(r.line) });
          return { ok: true };
        });
      });
      sending = go.catch(function () {});
      return go;
    }

    return {
      send: send,
      state: function () { return state; },
      root: rootKey,
      close: function () { if (session) session.close(); },
    };
  }

  return { create: create };
});
