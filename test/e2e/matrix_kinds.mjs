// test/e2e/matrix_kinds.mjs -- tables shown as they are and kinds declared as data (D-matrix-raw), against the
// real copy (root "."), in a matrix_set of a frame:
//   - matrix kinds: the built-in and the declared kinds, one a line on the receiving side (cards, shipped)
//   - cards:all (matrix_kinds/cards.json): the functions with their node ids as row ids; radar says "(node ids)"
//   - xipe_raw:card/list: the same answer as it is (positions as ids); xipe_raw of a method that writes is refused
//   - matrix filter <column> <expression>: as / does; the column alone takes it away
//   - matrix save-kind: ~work/matrix_kinds/<name>.json written, never over one there; matrix get <name>:all shows it
//   - json:<that file>: a JSON file as it is (its keys as rows)
//   - the frame's list kinds
import fs from 'node:fs';
import path from 'node:path';
import { openPage, PAGES, check, done } from './cdp.mjs';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const E2E = process.env.E2E_DIR || path.join(process.env.TMPDIR || '/tmp', 'tezcatl-e2e');
const tag = 'k' + Date.now().toString(36);

const p = await openPage(PAGES + 'panels/skins/frame.html?synthesis=matrix_set');
const F = (part) => `[...document.querySelectorAll('iframe')].find(f => (f.src||'').includes(${JSON.stringify(part)}))`;
const doc = (part) => `${F(part)}.contentDocument`;
const S = `${doc('matrix_bar.html')}.getElementById('status')`;
const RECV = `document.getElementById('recv').textContent`;
await p.waitFor(`!!${F('matrix_bar.html')} && !!${doc('matrix_bar.html')}.getElementById('status')`, 15000);
await p.waitFor(`/xipe_rows:all/.test(${S}.textContent)`, 60000);
const cmd = async (line) => {
  await p.eval(`${F('code_cmd_in')}.contentWindow.focus(); ${doc('code_cmd_in')}.querySelector('.cm-content').focus(); true`);
  await p.send('Input.insertText', { text: line });
  await p.key('Enter', 'Enter', '\r', 2);
};
const status = () => p.eval(`${S}.textContent`);
const grid = () => p.eval(`JSON.stringify((() => { const d = ${doc('matrix.html')}; return { ref: d.getElementById('ref-label').textContent, msg: d.getElementById('msg').textContent, heads: [...d.querySelectorAll('table.mx-grid thead th')].map((t) => t.textContent.trim()), rows: d.querySelectorAll('table.mx-grid tbody tr').length }; })())`).then(JSON.parse);

console.log('matrix kinds');
await cmd('matrix kinds');
check(!!await p.waitFor(`/matrix kinds ── \\d+ kinds/.test(${S}.textContent)`, 10000), 'the bar says how many: ' + await status());
check(!!await p.waitFor(`/cards ── Xipe Totec's functions/.test(${RECV}) && /xipe_raw ── /.test(${RECV})`, 5000), 'the receiving side: one a line, the shipped cards among them');

console.log('cards:all');
await cmd('matrix get cards:all');
check(!!await p.waitFor(`/cards:all {2}\\d+ rows/.test(${S}.textContent)`, 30000), 'a declared kind is fetched: ' + await status());
let g = await grid();
check(g.rows > 0 && g.heads.indexOf('label') >= 0 && g.heads.indexOf('id') >= 0, 'its columns as declared -- ' + g.heads.join(','));
check(/cards \(matrix_kinds\/cards\.json\)/.test(g.ref), 'the head says which declaration: ' + g.ref);
// the cursor on the first row: radar says what the ids are
await p.eval(`(() => { const w = ${doc('matrix.html')}.getElementById('grid-wrap'); ${F('matrix.html')}.contentWindow.focus(); w.focus(); return true; })()`);
await p.key('j', 'KeyJ', 'j');
await wait(300);
await cmd('radar');
check(!!await p.waitFor(`/radar ── cards:all {2}function \\(node ids\\)/.test(${S}.textContent)`, 8000), 'radar: function rows, node ids -- ' + await status());

console.log('xipe_raw');
await cmd('matrix get xipe_raw:card/list');
check(!!await p.waitFor(`/xipe_raw:card\\/list {2}\\d+ rows/.test(${S}.textContent)`, 30000), 'a method that changes nothing, as it is: ' + await status());
g = await grid();
check(/\(from "cards"\)/.test(g.ref) && g.heads.indexOf('effect') >= 0, 'the one array of the answer, every key a column -- ' + g.ref);
await cmd('matrix get xipe_raw:row/add');
check(!!await p.waitFor(`/^! .*row\\/add changes something \\(writes the Book\\)/.test(${S}.textContent)`, 15000), 'a method that writes is refused: ' + await status());

console.log('matrix filter');
await cmd('matrix get cards:all');
await p.waitFor(`/cards:all {2}\\d+ rows/.test(${S}.textContent)`, 30000);
const all = (await grid()).rows;
await cmd('matrix filter effect pure');
check(!!await p.waitFor(`/filter effect pure ── \\d+ rows shown/.test(${S}.textContent)`, 5000), 'filter: as / does -- ' + await status());
const some = (await grid()).rows;
check(some <= all, 'fewer or as many rows: ' + some + ' of ' + all);
await cmd('matrix filter effect');
check(!!await p.waitFor(`/filter effect \\(none\\) ── ${all} rows shown/.test(${S}.textContent)`, 5000), 'the column alone takes it away: ' + await status());
await cmd('matrix filter nothing x');
check(!!await p.waitFor(`/^! .*no column "nothing"/.test(${S}.textContent)`, 5000), 'an unknown column is said: ' + await status());

console.log('matrix save-kind');
await cmd('matrix get xipe_raw:card/list');
await p.waitFor(`/xipe_raw:card\\/list {2}\\d+ rows/.test(${S}.textContent)`, 30000);
await cmd('matrix save-kind ' + tag);
const file = path.join(E2E, 'work', 'matrix_kinds', tag + '.json');
check(!!await p.waitFor(`/save-kind: ~work\\/matrix_kinds\\/${tag}\\.json/.test(${S}.textContent)`, 8000) && fs.existsSync(file), 'written to ~work/matrix_kinds/: ' + await status());
const decl = JSON.parse(fs.readFileSync(file, 'utf8'));
check(decl.source.xipe === 'card/list' && decl.from === 'cards' && decl.id === 'id' && decl.place && decl.place.path === 'path', 'the declaration: source, from, id, place -- ' + JSON.stringify(decl).slice(0, 160));
await cmd('matrix save-kind ' + tag);
check(!!await p.waitFor(`/^! .*is there already/.test(${S}.textContent)`, 8000), 'never over one there: ' + await status());
await cmd('matrix get ' + tag + ':all');
check(!!await p.waitFor(`new RegExp('${tag}:all {2}\\\\d+ rows').test(${S}.textContent)`, 30000), 'matrix get <name>:all shows it: ' + await status());
check(/~work\/matrix_kinds\//.test((await grid()).ref), '...from ~work/matrix_kinds/');

console.log('json:');
await cmd('matrix get json:~work/matrix_kinds/' + tag + '.json');
check(!!await p.waitFor(`/json:\\S+ {2}\\d+ rows/.test(${S}.textContent)`, 10000), 'a JSON file as it is: ' + await status());
check(/\(from "columns"\)/.test((await grid()).ref), 'an object holding one array: that array (the declaration\'s columns) -- ' + (await grid()).ref);
await cmd('matrix get json:~work/none-' + tag + '.json');
check(!!await p.waitFor(`/^! .*no such file/.test(${S}.textContent)`, 10000), 'a missing file is said: ' + await status());
fs.rmSync(file);

console.log('the frame: list kinds');
await p.eval(`document.getElementById('line').focus(); true`);
await p.send('Input.insertText', { text: 'list kinds' });
await p.key('Enter', 'Enter', '\r');
check(!!await p.waitFor(`/skin_list ── the skins kept/.test(${RECV}) && /killring ── /.test(${RECV})`, 5000), 'list kinds: one kind a line');

const errs = p.logs.filter((l) => /exception/.test(l));
check(errs.length === 0, 'no JS exceptions' + (errs.length ? ': ' + errs.join(' | ') : ''));
done();
