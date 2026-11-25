'use strict';
// Xipe Totec reached outside the dialogue window (D-xipe-elsewhere):
// lib/xipe/xipe-line.js (a line sent as `input`, unread; the work store's pair),
// lib/target/xipe.js (the dock's destination) and lib/recv/xipe.js (the
// receiving side's source). The connection is a stand-in of xipe-session.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.join(__dirname, '..');
const transcript = require(path.join(root, 'lib/xipe/xipe-transcript.js'));
const xipeLine = require(path.join(root, 'lib/xipe/xipe-line.js'));

function fakeBus() {
  const posted = [];
  const handlers = {};
  return {
    posted,
    post: (type, payload, opts) => {
      posted.push({ type, payload, opts });
      (handlers[type] || []).forEach((h) => h(payload, { from: { id: 'self' } }));
    },
    on: (type, h) => { (handlers[type] = handlers[type] || []).push(h); },
    deliver: (type, payload, meta) => (handlers[type] || []).forEach((h) => h(payload, meta)),
  };
}

// a Tezcatl with a stand-in session: sessions[] keeps each one's handlers and inputs
function fakeT(bus) {
  const sessions = [];
  const T = {
    bus,
    xipeTranscript: transcript,
    config: { load: () => Promise.resolve({ connections: [{ url: 'ws://127.0.0.1:1/ws' }] }) },
    xipeSession: {
      relayXipeUrl: (_c, p) => 'ws://127.0.0.1:1' + p,
      create: (opts) => {
        const s = { opts, inputs: [], closed: false, seq: 0 };
        sessions.push(s);
        return {
          input: (text) => { s.inputs.push(text); s.seq += 1; return 'req-' + s.seq; },
          close: () => { s.closed = true; },
        };
      },
    },
    xipeLine,
  };
  return { T, sessions };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

test('xipe-line: a line goes as input unread (waiting for the connection); sent and answered are a pair of the work store', async () => {
  const bus = fakeBus();
  const { T, sessions } = fakeT(bus);
  const said = [];
  const x = xipeLine.create({ T, bus, root: 'p', on: { lines: (ls, kind) => said.push({ ls, kind }) } });
  // sent before the connection is made: it waits for it
  assert.deepEqual(await x.send('do row/list'), { ok: true });
  assert.equal(sessions[0].opts.url, 'ws://127.0.0.1:1/xipe');
  assert.equal(sessions[0].opts.root, 'p');
  assert.deepEqual(await x.send('   '), { ok: false, error: 'xipe: an empty line' });
  assert.deepEqual(sessions[0].inputs, ['do row/list']);
  assert.deepEqual(said[0], { ls: ['> do row/list'], kind: 'sent' });
  assert.deepEqual(bus.posted.find((m) => m.type === 'xipe.sent').payload, { req: 'req-1' });
  sessions[0].opts.on.reply({ id: 'req-1', result: {}, error: null, dialogue: { text: '3 rows' } });
  assert.deepEqual(said[1], { ls: ['3 rows'], kind: 'reply' });
  assert.deepEqual(bus.posted.find((m) => m.type === 'xipe.answered').payload, { req: 'req-1', ok: true });
  x.close();
  assert.equal(sessions[0].closed, true);
});

test('xipe-line: "@" is the last reference, put in as text before the line goes', async () => {
  const bus = fakeBus();
  const { T, sessions } = fakeT(bus);
  T.recvRefs = { text: () => 'x' };
  T.radar = { expand: (_b, line) => Promise.resolve(line === 'bad @' ? { error: '@ ── no reference yet (radar first)' } : { line: line.replace('@', '01ABC') }) };
  const said = [];
  const x = xipeLine.create({ T, bus, on: { lines: (ls, kind) => said.push({ ls, kind }) } });
  await tick();
  assert.deepEqual(await x.send('eval @'), { ok: true });
  assert.deepEqual(sessions[0].inputs, ['eval 01ABC']);
  const r = await x.send('bad @');
  assert.equal(r.ok, false);
  assert.deepEqual(sessions[0].inputs, ['eval 01ABC'], 'a line whose reference is missing is not sent');
  assert.deepEqual(said[said.length - 1].ls, ['> bad @', '# @ ── no reference yet (radar first)']);
});

function loadWay(file, T) {
  const g = { Tezcatl: T };
  const src = require('node:fs').readFileSync(path.join(root, file), 'utf8');
  new Function('self', src)(g);
  return g.Tezcatl;
}

test('target xipe: a line of chars, its returns at the end dropped; what went is said as xipe.said', async () => {
  const bus = fakeBus();
  const { T, sessions } = fakeT(bus);
  loadWay('lib/target/xipe.js', T);
  const way = T.targets.xipe.create({ siblings: () => [] });
  way.start(() => {});
  await tick();
  const keys = (s) => Array.from(s).map((k) => ({ key: k }));
  assert.deepEqual(await way.send('xipe', keys('help').concat([{ key: 'return' }])), { ok: true });
  assert.deepEqual(sessions[0].inputs, ['help']);
  const r = await way.send('xipe', [{ key: 'a', modifiers: ['ctrl'] }]);
  assert.equal(r.ok, false);
  assert.deepEqual(await way.send('xipe', [{ key: 'return' }]), { ok: false, error: 'xipe: an empty line' });
  const s = bus.posted.filter((m) => m.type === 'xipe.said');
  assert.deepEqual(s[0].payload, { lines: ['> help'], kind: 'sent', root: '.', skin: null });
  sessions[0].opts.on.reply({ id: 'req-1', result: null, error: null, dialogue: { text: 'commands: …' } });
  assert.equal(way.candidates()[0].detail, 'commands: …');
});

test('recv xipe: its own skin\'s xipe.said (a sibling, or the same skin said), notify left out; alone in a window, any', () => {
  const bus = fakeBus();
  const T = { bus };
  loadWay('lib/recv/xipe.js', T);
  const inSkin = T.recvSources.xipe.create({ siblings: () => [{ id: 'it-1' }] });
  const alone = T.recvSources.xipe.create({ siblings: () => [] });
  const dock = T.recvSources.xipe.create({ siblings: () => [{ id: 'm-1' }], skin: () => 'frame-1' });
  dock.start(() => {});
  inSkin.start(() => {});
  alone.start(() => {});
  bus.deliver('xipe.said', { lines: ['> help'], kind: 'sent' }, { from: { id: 'it-1' } });
  bus.deliver('xipe.said', { lines: ['other'], kind: 'reply' }, { from: { id: 'it-9' } });
  bus.deliver('xipe.said', { lines: ['· notify/rowChanged'], kind: 'notify' }, { from: { id: 'it-1' } });
  assert.deepEqual(inSkin.lines(), [{ text: '> help', cls: 'sent' }]);
  assert.deepEqual(alone.lines().map((l) => l.text), ['> help', 'other']);
  // the dock's input_target is no panel of the skin: it says the skin's id
  bus.deliver('xipe.said', { lines: ['> do x'], kind: 'sent', skin: 'frame-1' }, { from: { id: 'it-2' } });
  bus.deliver('xipe.said', { lines: ['> elsewhere'], kind: 'sent', skin: 'frame-2' }, { from: { id: 'it-3' } });
  assert.deepEqual(dock.lines().map((l) => l.text), ['> do x']);
});
