// test/e2e/matrix_csv.mjs -- the table's CSV link (D-matrix-csv): the table
// as shown is written through the relay at the top of the FS root as
// <kind>_<ref>-<time>.csv, the header says the path, and the path goes into
// the killring second -- what was yanked last stays first. A second click in
// the same second is refused (never over a file) and said. The demo table, no Xipe.
import fs from 'node:fs';
import path from 'node:path';
import { openPage, PAGES, check, done } from './cdp.mjs';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const E2E = process.env.E2E_DIR || path.join(process.env.TMPDIR || '/tmp', 'tezcatl-e2e');
const FSROOT = path.join(E2E, 'fsroot');
const YANKED = 'yanked-' + Date.now().toString(36);

// the killring service (invisible page) and what it lists
const k = await openPage(PAGES + 'panels/invisible/killring.html');
await wait(500);
const ringTop = () => k.eval(`new Promise((res) => {
  Tezcatl.bus.on('killring.list', (p) => { res(p.items.slice(0, 2).map((e) => e.text)); });
  Tezcatl.bus.post('killring.query', {});
  setTimeout(() => res(null), 3000);
})`);

const p = await openPage(PAGES + 'panels/resident/matrix.html?kind=demo&ref=demo');
await p.waitFor(`!document.getElementById('csv-link').hidden`, 15000);
// the person yanked something (from another page: a page does not hear its own posts)
await p.eval(`Tezcatl.bus.post('killring.add', { text: ${JSON.stringify(YANKED)}, source: 'e2e' }); true`);
for (let i = 0; i < 20 && ((await ringTop()) || [])[0] !== YANKED; i++) await wait(200);
const before = new Set(fs.readdirSync(FSROOT));
await p.eval(`document.getElementById('csv-link').click(); true`);
await p.waitFor(`/CSV written|CSV not written/.test(document.getElementById('msg').textContent)`, 10000);
const msg = await p.eval(`document.getElementById('msg').textContent`);
console.log('matrix csv: ' + msg);
const m = /CSV written: (\S+\.csv)/.exec(msg);
check(!!m && /^demo_demo-\d{8}-\d{6}\.csv$/.test(m[1]), 'the header says the file written: demo_demo-<time>.csv');
const made = [...fs.readdirSync(FSROOT)].filter((f) => !before.has(f));
check(m && made.includes(m[1]), 'the file is at the top of the FS root');
if (m && made.includes(m[1])) {
  const text = fs.readFileSync(path.join(FSROOT, m[1]), 'utf8');
  check(/^arg0,/.test(text) && text.split('\r\n').length >= 3, 'it holds the table: the header and the rows');
}
check(/killring's second/.test(msg), 'the header says the path is the killring\'s second');

// the killring: what was yanked stays first, the path second
await wait(500);
const ring = await ringTop();
console.log('killring: ' + JSON.stringify(ring));
check(ring && ring[0] === YANKED && m && ring[1] === m[1], 'the killring: the yanked text first, the CSV path second');

// the same name again (same second) is never written over
if (m) {
  fs.writeFileSync(path.join(FSROOT, 'keep.csv'), 'mine\n');
  await p.eval(`(() => { const D = Tezcatl.matrixData; const f = D.csvFileName; D.csvFileName = () => 'keep.csv'; document.getElementById('csv-link').click(); D.csvFileName = f; return true; })()`);
  await p.waitFor(`/CSV not written/.test(document.getElementById('msg').textContent)`, 10000);
  check(fs.readFileSync(path.join(FSROOT, 'keep.csv'), 'utf8') === 'mine\n', 'a file of the same name is kept: ' + await p.eval(`document.getElementById('msg').textContent`));
  fs.rmSync(path.join(FSROOT, 'keep.csv'));
  fs.rmSync(path.join(FSROOT, m[1]));
}
done();
