'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parse, parsePath, format } = require('../lib/xipe/matrix-commands.js');

test('parse: each command, with or without the leading matrix', () => {
  assert.deepEqual(parse('matrix update'), { cmd: 'update' });
  assert.deepEqual(parse('pwd'), { cmd: 'pwd' });
  assert.deepEqual(parse('matrix approve'), { cmd: 'approve' });
  assert.deepEqual(parse('  matrix   get  xipe_rows:all '), { cmd: 'get', path: 'xipe_rows:all', table: { kind: 'xipe_rows', ref: 'all', root: '.' } });
});

test('parse: what is refused, saying how to write it', () => {
  assert.match(parse('matrix update now').error, /takes no arguments/);
  assert.match(parse('matrix pwd x').error, /takes no arguments/);
  assert.match(parse('approve all').error, /takes no arguments/);
  assert.match(parse('matrix get').error, /one path/);
  assert.match(parse('matrix get a b').error, /one path/);
  assert.match(parse('matrix get :x').error, /kind/);
  assert.match(parse('matrix set').error, /no such command: set/);
  assert.match(parse('matrix').error, /no command/);
});

test('parse: filter (the expression as written), save-kind, kinds', () => {
  assert.deepEqual(parse('matrix filter time >= 11-26 14:30'), { cmd: 'filter', col: 'time', expr: '>= 11-26 14:30' });
  assert.deepEqual(parse('filter decision'), { cmd: 'filter', col: 'decision', expr: '' });
  assert.match(parse('matrix filter').error, /a column/);
  assert.deepEqual(parse('matrix save-kind mine'), { cmd: 'save-kind', name: 'mine' });
  assert.match(parse('save-kind').error, /one name/);
  assert.deepEqual(parse('kinds'), { cmd: 'kinds' });
  assert.match(parse('kinds x').error, /takes no arguments/);
});

test('parsePath: the kinds shown as they are', () => {
  assert.deepEqual(parsePath('json:~work/books/decode/magit.log.json'), { kind: 'json', ref: '~work/books/decode/magit.log.json', root: '.' });
  assert.deepEqual(parsePath('xipe_raw:row/list?call_ids=a,b'), { kind: 'xipe_raw', ref: 'row/list?call_ids=a,b', root: '.' });
  assert.deepEqual(parsePath('cards:all'), { kind: 'cards', ref: 'all', root: '.' });
});

test('parsePath: kind:ref[@root]', () => {
  assert.deepEqual(parsePath('xipe_rows:all'), { kind: 'xipe_rows', ref: 'all', root: '.' });
  assert.deepEqual(parsePath('xipe_rows'), { kind: 'xipe_rows', ref: 'all', root: '.' });
  assert.deepEqual(parsePath('xipe_rows:call_ids=a,b@fake'), { kind: 'xipe_rows', ref: 'call_ids=a,b', root: 'fake' });
  assert.deepEqual(parsePath('xipe:module=Calc&name=add&arity=2'), { kind: 'xipe', ref: 'module=Calc&name=add&arity=2', root: '.' });
});

test('parsePath: the query form, also inside a URL', () => {
  assert.deepEqual(parsePath('kind=xipe&root=fake&ref=row%3Dx1'), { kind: 'xipe', ref: 'row=x1', root: 'fake' });
  assert.deepEqual(parsePath('?kind=demo&ref=x'), { kind: 'demo', ref: 'x', root: '.' });
  assert.deepEqual(parsePath('http://127.0.0.1:4001/panels/resident/matrix.html?kind=xipe_rows&root=.&ref=all'), { kind: 'xipe_rows', ref: 'all', root: '.' });
});

test('format: what pwd prints, read back by get unchanged', () => {
  const tables = [
    { kind: 'xipe_rows', ref: 'all', root: '.' },
    { kind: 'xipe_rows', ref: 'call_ids=a,b', root: 'fake' },
    { kind: 'xipe', ref: 'module=Calc&name=add&arity=2', root: '.' },
  ];
  for (const t of tables) assert.deepEqual(parsePath(format(t)), t);
  assert.equal(format({ kind: 'xipe_rows', ref: 'all', root: '.' }), 'xipe_rows:all');
  assert.equal(format({ kind: 'xipe_rows', ref: 'all', root: 'fake' }), 'xipe_rows:all@fake');
  assert.equal(format(null), '');
});
