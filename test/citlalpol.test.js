'use strict';
// Citlalpol in Tezcatl (D-citlalpol-bus): the bus's numbering and keeping, who counts as this
// skin's bus, and a record as a row of text.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const B = require(path.join(__dirname, '../lib/citlalpol/citlalpol-bus.js'));
const L = require(path.join(__dirname, '../lib/citlalpol/citlalpol-log.js'));

test('bus: records numbered as they come, the last `keep` kept, non-objects dropped', () => {
  const b = B.create({ keep: 2 });
  assert.deepEqual(b.add([{ host: 'a' }, null, 'x', { host: 'b' }]).map((e) => e.n), [1, 2]);
  b.add([{ host: 'c' }]);
  assert.deepEqual(b.recent().map((e) => [e.n, e.r.host]), [[2, 'b'], [3, 'c']]);
  assert.equal(b.count(), 3);
  assert.equal(b.last().r.host, 'c');
});

test("bus: only a citlalpol_bus among the siblings is this skin's", () => {
  const sib = [{ id: 'b1', role: 'citlalpol_bus' }, { id: 'x', role: 'xterm' }];
  assert.equal(B.fromMyBus({ from: { id: 'b1' } }, sib), true);
  assert.equal(B.fromMyBus({ from: { id: 'x' } }, sib), false);
  assert.equal(B.fromMyBus({ from: { id: 'b2' } }, sib), false);
  assert.equal(B.fromMyBus({ from: { id: 'b1' } }, null), false);
});

test('log: a record as a row of text; control characters shown, never acting', () => {
  const row = L.row({ n: 7, r: { at: '2026-11-24T12:00:18.123+09:00', decision: 'stand_in', proto: 'http', host: 'pong.test', port: 80,
    method: 'GET', path: '/ping', cmd: 'curl \x1b]0;pwned\x07 x', default: true, captured: true, access: 'try', run: 'c-1' } });
  assert.equal(row.id, 'c7');
  assert.equal(row.cells.time, '11-24 12:00:18');
  assert.equal(row.cells.dest, 'pong.test:80');
  assert.equal(row.cells.request, 'GET /ping');
  assert.equal(row.cells.result, 'undecided (captured)');
  assert.equal(row.cells.cmd, 'curl \\x1b]0;pwned\\x07 x');
  assert.equal(L.row({ n: 1, r: { decision: 'refuse', why: 'not in access.json' } }).cells.result, 'not in access.json');
  assert.equal(L.row({ n: 2, r: { decision: 'stand_in', matched: 'ping' } }).cells.result, 'matched ping');
});

test('log: the time keeps its date, so a filter is right across midnight', () => {
  const late = L.row({ n: 1, r: { at: '2026-11-24T23:59:00.000+09:00' } }).cells.time;
  const early = L.row({ n: 2, r: { at: '2026-11-25T00:01:00.000+09:00' } }).cells.time;
  assert.equal(late, '11-24 23:59:00');
  assert.equal(early, '11-25 00:01:00');
  const G = require('../lib/xipe/matrix-data.js');
  const since = G.parseFilterExpr('>= 11-25 00:00');
  assert.equal(since(late), false);
  assert.equal(since(early), true);
  assert.equal(L.row({ n: 3, r: { at: 'soon' } }).cells.time, 'soon');
});

test('citlalpol.json: glyph rules each have a glyph, the last matches anything', () => {
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, '../citlalpol.json'), 'utf8'));
  assert.ok(c.glyphs.every((g) => typeof g.glyph === 'string' && g.glyph && g.when && typeof g.when === 'object'));
  assert.deepEqual(c.glyphs[c.glyphs.length - 1].when, {});
});

const I = require(path.join(__dirname, '../lib/citlalpol/citlalpol-image.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../citlalpol.json'), 'utf8'));

test('image: the glyph from structured fields only, first rule wins', () => {
  const g = (r) => I.glyphFor(r, cfg.glyphs);
  assert.equal(g({ decision: 'stand_in', default: true, method: 'GET' }), '💭');
  assert.equal(g({ port: 587, proto: 'socks5' }), '📧');
  assert.equal(g({ method: 'GET', path: '/a/logo.PNG?x=…' }), '📷');
  assert.equal(g({ method: 'POST', path: '/v1' }), '📩');
  assert.equal(g({ method: 'get', path: '/ping' }), '🔎');
  assert.equal(g({ proto: 'connect', method: 'CONNECT', port: 443 }), '🛜');
  assert.equal(g({ proto: 'socks5', port: 9999 }), '📶');
  assert.equal(g({ proto: 'dns', method: 'A', port: 53 }), '📇');
  assert.equal(g({ proto: 'tcp', port: 8080 }), '🔌');
  assert.equal(g({ host: '<img src=x onerror=alert(1)>' }), '💬');
});

test('image: the way a record goes, and packets counted per glyph and way', () => {
  assert.equal(I.route({ decision: 'pass' }), 'out');
  assert.equal(I.route({ decision: 'pass', to_auth: 'zoozve', proto: 'tcp' }), 'local');
  assert.equal(I.route({ decision: 'pass', proto: 'dns', method: 'A' }), 'back');
  assert.equal(I.route({ decision: 'refuse', proto: 'dns' }), 'stop');
  assert.equal(I.route({ decision: 'stand_in' }), 'back');
  assert.equal(I.route({ decision: 'stand_in', why: 'the stand-in does not answer' }), 'stop');
  assert.equal(I.route({ decision: 'refuse' }), 'stop');
  const ps = I.packets([{ decision: 'refuse', method: 'GET' }, { decision: 'refuse', method: 'GET' }, { decision: 'pass', proto: 'connect' }], cfg.glyphs);
  assert.deepEqual(ps.map((p) => [p.glyph, p.route, p.count]), [['🔎', 'stop', 2], ['🛜', 'out', 1]]);
  assert.equal(I.circled(1), '');
  assert.equal(I.circled(2), '②');
  assert.equal(I.circled(20), '⑳');
  assert.equal(I.circled(21), '20+');
});
