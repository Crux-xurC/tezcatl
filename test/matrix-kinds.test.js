'use strict';
// lib/xipe/matrix-kinds.js (D-matrix-raw): a table shown as it is, kinds declared as data.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const K = require('../lib/xipe/matrix-kinds.js');

test('items: an array, the one array an object holds (or `from`), else the keys as rows', () => {
  assert.deepEqual(K.items([{ a: 1 }, 2]).items, [{ a: 1 }, { value: 2 }]);
  const one = K.items({ cards: [{ id: 'n1' }], project: 'x' });
  assert.deepEqual([one.items, one.from, one.keyed], [[{ id: 'n1' }], 'cards', false]);
  assert.equal(K.items({ a: [], b: [{ x: 1 }] }, 'b').from, 'b');
  const keyed = K.items({ a: [], b: [] });
  assert.equal(keyed.keyed, true);
  assert.deepEqual(keyed.items.map((i) => i.key), ['a', 'b']);
  assert.deepEqual(K.items(null).items, []);
});

test('toGrid: every key a column (or the declared ones); ids by the declared key when it holds, else positions', () => {
  const list = [{ id: 'n1', label: 'Calc.add/2', meta: { x: 1 }, path: 'lib/c.ex', line: 3 }, { id: 'n2', label: 'Calc.sub/2', rows: 0 }];
  const raw = K.toGrid(list, {});
  assert.deepEqual(raw.columns.map((c) => c.key), ['id', 'label', 'meta', 'path', 'line', 'rows']);
  assert.deepEqual(raw.rows.map((r) => r.id), ['r0', 'r1']);
  assert.equal(raw.rows[0].cells.meta, '{"x":1}');
  assert.equal(raw.rows[1].cells.path, '');
  assert.equal(raw.ids, 'position');
  assert.equal(raw.type, 'item');
  const d = K.toGrid(list, { id: 'id', ids: 'node', type: 'function', columns: ['label', { key: 'id', label: 'node id' }], place: { path: 'path', line: 'line' } }, (p) => 'proj/' + p);
  assert.deepEqual(d.rows.map((r) => r.id), ['n1', 'n2']);
  assert.deepEqual(d.columns.map((c) => c.label), ['label', 'node id']);
  assert.deepEqual(d.rows[0].open, { path: 'proj/lib/c.ex', span: { line: 3 } });
  assert.equal(d.rows[1].open, undefined);
  assert.equal(d.ids, 'node');
  assert.equal(d.type, 'function');
  assert.deepEqual(K.toGrid([{ id: 'a' }, { id: 'a' }], { id: 'id' }).rows.map((r) => r.id), ['r0', 'r1'], 'ids that repeat are not ids');
});

test('parseRaw: a method and its query; values read as JSON where they are, lists for ids', () => {
  assert.deepEqual(K.parseRaw('card/list'), { method: 'card/list', params: {} });
  assert.deepEqual(K.parseRaw('row/list?call_ids=a,b'), { method: 'row/list', params: { call_ids: ['a', 'b'] } });
  assert.deepEqual(K.parseRaw('graph/neighbors?depth=2&direction=in&on=["x"]').params, { depth: 2, direction: 'in', on: ['x'] });
  assert.ok(K.parseRaw('all').error);
  assert.ok(K.parseRaw('').error);
  assert.ok(K.parseRaw('a b').error);
});

test('allowed: only a method that changes nothing (method/list)', () => {
  const listed = { methods: [
    { name: 'card/list', route: 'dispatch', writes: false, confirm: false, repl: false },
    { name: 'row/add', route: 'dispatch', writes: true, confirm: false, repl: false },
    { name: 'config/set', route: 'dispatch', writes: false, confirm: true, repl: false },
    { name: 'eval', route: 'repl', writes: true, confirm: false, repl: true },
  ] };
  assert.deepEqual(K.allowed(listed, 'card/list'), { ok: true });
  assert.match(K.allowed(listed, 'row/add').error, /writes the Book/);
  assert.match(K.allowed(listed, 'config/set').error, /confirm/);
  assert.match(K.allowed(listed, 'eval').error, /changes something/);
  assert.match(K.allowed(listed, 'nothing/here').error, /not a method/);
  assert.match(K.allowed(null, 'card/list').error, /not a method/);
});

test('readDecl / declOf: a declaration read back; the table shown kept as one', () => {
  assert.ok(K.readDecl({ source: {} }, 'x').error);
  assert.ok(K.readDecl({ name: 'y', source: { file: 'a.json' } }, 'x').error);
  assert.equal(K.readDecl({ source: { xipe: 'card/list' } }, 'x').decl.name, 'x');
  const list = [{ id: 'n1', label: 'a', path: 'p', line: 1 }, { id: 'n2', label: 'b', path: 'q', line: 2 }];
  const d = K.declOf('mine', { kind: 'xipe_raw', ref: 'card/list', from: 'cards', columns: [{ key: 'label' }, { key: 'id' }], list });
  assert.equal(d.path, '~work/matrix_kinds/mine.json');
  assert.deepEqual(d.decl, { name: 'mine', desc: '', source: { xipe: 'card/list', params: {} }, from: 'cards', id: 'id', type: 'mine', columns: ['label', 'id'], place: { path: 'path', line: 'line' } });
  assert.deepEqual(K.declOf('f', { kind: 'json', ref: '~work/books/x.json', columns: [], list: [] }).decl.source, { file: '~work/books/x.json' });
  assert.ok(K.declOf('xipe_rows', { kind: 'json', ref: 'a', list: [] }).error, 'a built-in name is not taken');
  assert.ok(K.declOf('a b', { kind: 'json', ref: 'a', list: [] }).error);
  assert.ok(K.declOf('ok', { kind: 'xipe_rows', ref: 'all', list: [] }).error, 'only a table shown as it is');
});

test('find / declared: yours (~work/matrix_kinds/) first, then the shipped ones of matrix_kinds/index.json', async () => {
  const served = {
    ['F/fs/read?path=' + encodeURIComponent('~work/matrix_kinds/cards.json')]: { desc: 'mine', source: { xipe: 'card/list' } },
    ['F/fs/read?path=' + encodeURIComponent('~work/matrix_kinds/books.json')]: { desc: 'a book', source: { file: '~work/books/x.json' } },
    ['F/fs?path=' + encodeURIComponent('~work/matrix_kinds')]: { entries: [{ name: 'cards.json' }, { name: 'books.json' }, { name: 'xipe.json' }, { name: 'notes.txt' }] },
    'S/matrix_kinds/index.json': ['cards', 'other'],
    'S/matrix_kinds/cards.json': { desc: 'shipped', source: { xipe: 'card/list' } },
    'S/matrix_kinds/other.json': { desc: 'other', source: { file: 'a.json' } },
  };
  const io = { fsBase: 'F', sibling: (rel) => 'S/' + rel, getJson: (u) => Promise.resolve(served[u] || null) };
  const f = await K.find('cards', io);
  assert.equal(f.where, '~work/matrix_kinds/');
  assert.equal(f.decl.desc, 'mine');
  assert.equal((await K.find('other', io)).where, 'matrix_kinds/');
  assert.equal(await K.find('none', io), null);
  assert.equal(await K.find('xipe_rows', io), null);
  const all = await K.declared(io);
  assert.deepEqual(all.map((d) => [d.name, d.where]), [['books', '~work/matrix_kinds/'], ['cards', '~work/matrix_kinds/'], ['other', 'matrix_kinds/']]);
  const lines = K.lines(all);
  assert.match(lines[0], /^xipe ── /);
  assert.match(lines[lines.length - 1], /^other ── other {2}\[matrix_kinds\/\]$/);
});

test('matrix_kinds/: index.json names every declaration, and each one reads', () => {
  const dir = path.join(__dirname, '..', 'matrix_kinds');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json').map((f) => f.slice(0, -5)).sort();
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8')).slice().sort(), files);
  for (const n of files) {
    const r = K.readDecl(JSON.parse(fs.readFileSync(path.join(dir, n + '.json'), 'utf8')), n);
    assert.ok(r.decl, n + ': ' + r.error);
    assert.ok(!K.BUILTIN[n], n + ' is a built-in name');
  }
});
