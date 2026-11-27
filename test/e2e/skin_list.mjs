// test/e2e/skin_list.mjs -- the skin_list panel (panels/tool/list.html?config=skin_list):
// the skins kept by skin save (~work/store/frame-skins.json of the stack's own work
// place, written here), one row each, by name: lines (empty ones), axis, ratios,
// panels, and a panel kept under an old name (code_vi) marked; Enter opens the
// skin in a new frame window; inside a frame, M-r reads it into that frame
// (skin.read), where code_vi is code_editor; a skin saved meanwhile appears;
// the shipped skins (skins/index.json) are rows too, marked [skins/].
import fs from 'node:fs';
import path from 'node:path';
import { openPage, attachTo, PAGES, check, done } from './cdp.mjs';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const E2E = process.env.E2E_DIR || path.join(process.env.TMPDIR || '/tmp', 'tezcatl-e2e');
const STORE = path.join(E2E, 'work', 'store');
fs.mkdirSync(STORE, { recursive: true });
const FILE = path.join(STORE, 'frame-skins.json');
const tag = 's' + Date.now().toString(36);
const OLD = tag + '_old';
const WIDE = tag + '_wide';
const before = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {};
fs.writeFileSync(FILE, JSON.stringify(Object.assign({}, before, {
  [OLD]: { name: OLD, type: 'B', axis: 'h', ratio: [1, 4], focus: '21', columns: [[['tree', 1, 1, false]], [['code_vi', 1, 1, true]]] },
  [WIDE]: { name: WIDE, type: 'D', axis: 'h', ratio: [1, 1, 1, 1], focus: '11', columns: [[['killring', 1, 1, true]], [], [], []] },
}), null, 2));

console.log('skin_list: the skins kept');
const p = await openPage(PAGES + 'panels/tool/list.html?config=skin_list');
await p.waitFor(`document.body.textContent.indexOf(${JSON.stringify(OLD)}) >= 0`, 10000);
const text = await p.eval(`document.body.textContent`);
check(text.indexOf(WIDE + '4 lines (3 empty) · axis h · 1:1:1:1 · killring | (empty) | (empty) | (empty)') >= 0 ||
      /4 lines \(3 empty\) · axis h · 1:1:1:1 · killring \| \(empty\) \| \(empty\) \| \(empty\)/.test(text), 'a row: lines, the empty ones, axis, ratios, panels');
check(/2 lines · axis h · 1:4 · tree \| code_vi\s+⚠ old name: code_vi → code_editor/.test(text), 'a panel kept under an old name is marked (code_vi → code_editor)');
check(text.indexOf(OLD) < text.indexOf(WIDE), 'by name');
// the shipped skins (skins/index.json) after the saved ones, marked by where they are
check(/demo\[skins\/\] 1 line · axis v · 1 · xterm, matrix_set/.test(text) || /\[skins\/\] 1 line · axis v · 1 · xterm, matrix_set/.test(text),
  'a shipped skin as a row, marked [skins/] (demo)');
check(/vibe_coding/.test(text) && /agenda/.test(text), 'the other shipped skins too (vibe_coding, agenda)');

// Enter: a new frame window with that skin
await p.eval(`(() => { const f = document.getElementById('filter'); f.focus(); f.value = ${JSON.stringify(WIDE)}; f.dispatchEvent(new Event('input')); return true; })()`);
await wait(300);
await p.key('Enter', 'Enter', '\r');
const w = await attachTo('skin=' + encodeURIComponent(WIDE), 10000);
await w.waitFor(`window.frameSkin && window.frameSkin.state() && window.frameSkin.state().name === ${JSON.stringify(WIDE)}`, 15000);
check((await w.eval(`window.frameSkin.state().columns.length`)) === 4, 'Enter: the skin in a new frame window (4 lines, as kept)');

// a skin saved meanwhile appears (read again every pollMs)
const LATER = tag + '_later';
const now = JSON.parse(fs.readFileSync(FILE, 'utf8'));
now[LATER] = { name: LATER, type: 'A', axis: 'v', ratio: [1], columns: [[['tree', 1, 1, true]]] };
fs.writeFileSync(FILE, JSON.stringify(now, null, 2));
await p.eval(`(() => { const f = document.getElementById('filter'); f.value = ''; f.dispatchEvent(new Event('input')); return true; })()`);
await p.waitFor(`document.body.textContent.indexOf(${JSON.stringify(LATER)}) >= 0`, 8000);
check(/1 line · axis v · 1 · tree/.test(await p.eval(`document.body.textContent`)), 'a skin saved meanwhile appears');

// inside a frame, M-r reads the skin into it (skin.read): code_vi is code_editor there
const f = await openPage(PAGES + 'panels/skins/frame.html');
await f.waitFor(`/ready|empty\\./.test(document.getElementById('recv').textContent)`, 15000);
await f.eval(`document.getElementById('line').focus(); true`);
await f.send('Input.insertText', { text: 'skin add skin_list' });
await f.key('Enter', 'Enter', '\r');
await f.waitFor(`window.frameSkin.frameAt('11') && window.frameSkin.frameAt('11').contentDocument.body.textContent.indexOf(${JSON.stringify(OLD)}) >= 0`, 15000);
await f.eval(`(() => { const d = window.frameSkin.frameAt('11').contentDocument; const fl = d.getElementById('filter'); window.frameSkin.frameAt('11').contentWindow.focus(); fl.focus(); fl.value = ${JSON.stringify(OLD)}; fl.dispatchEvent(new Event('input')); return true; })()`);
await wait(300);
await f.key('r', 'KeyR', '', 1);
await f.waitFor(`window.frameSkin.state().name === ${JSON.stringify(OLD)}`, 10000);
const st = JSON.parse(await f.eval(`JSON.stringify(window.frameSkin.state())`));
const got = JSON.stringify(st.columns.map((c) => c.map((x) => (Array.isArray(x) ? x[0] : x.panel)))) + ' ' + st.ratio.join(':');
check(got === '[["tree"],["code_editor"]] 1:4', 'M-r: the frame reads it (skin.read) ── code_vi read as code_editor, ratios 1:4 -- ' + got);

// inside a frame, Enter opens the skin in a new window -- that skin, not a copy of the frame's own
// (a window opened gets a copy of its opener's sessionStorage, where the frame keeps its skin)
const g = await openPage(PAGES + 'panels/skins/frame.html');
await g.waitFor(`/ready|empty\\./.test(document.getElementById('recv').textContent)`, 15000);
await g.eval(`document.getElementById('line').focus(); true`);
await g.send('Input.insertText', { text: 'skin add skin_list' });
await g.key('Enter', 'Enter', '\r');
await g.waitFor(`window.frameSkin.frameAt('11') && /demo/.test(window.frameSkin.frameAt('11').contentDocument.body.textContent)`, 15000);
await g.eval(`(() => { const d = window.frameSkin.frameAt('11').contentDocument; const fl = d.getElementById('filter'); window.frameSkin.frameAt('11').contentWindow.focus(); fl.focus(); fl.value = 'demo'; fl.dispatchEvent(new Event('input')); return true; })()`);
await wait(300);
await g.key('Enter', 'Enter', '\r');
const dw = await attachTo('skin=demo', 10000);
check(!!await dw.waitFor(`window.frameSkin && window.frameSkin.state() && window.frameSkin.state().name === 'demo'`, 15000),
  'Enter inside a frame: the new window has the skin chosen, not the frame\'s -- ' + await dw.eval(`window.frameSkin && window.frameSkin.state().name`));
await dw.eval(`document.getElementById('line').focus(); true`);
await dw.send('Input.insertText', { text: 'skin name demo_mine' });
await dw.key('Enter', 'Enter', '\r');
await dw.waitFor(`window.frameSkin.state().name === 'demo_mine'`, 5000);
await dw.eval(`location.reload(); true`);
await wait(2500);
check(!!await dw.waitFor(`window.frameSkin && window.frameSkin.state() && window.frameSkin.state().name === 'demo_mine'`, 15000), '...and its reload keeps what it became');

// Del twice: a saved skin moved to ~work/old/skins/<name>-<time>.json and out of the list (D-old-place);
// a shipped one is not moved
console.log('skin_list: Del twice moves a saved skin to ~work/old/skins/');
const filter = async (v) => { await p.eval(`(() => { const f = document.getElementById('filter'); f.focus(); f.value = ${JSON.stringify(v)}; f.dispatchEvent(new Event('input')); return true; })()`); await wait(300); };
const foot = `document.body.textContent`;
await filter(LATER);
await p.key('Delete', 'Delete', '');
check(!!await p.waitFor(`/Del again to move/.test(${foot})`, 5000), 'the first Del asks again');
check(LATER in JSON.parse(fs.readFileSync(FILE, 'utf8')), '...and moves nothing yet');
await p.key('Delete', 'Delete', '');
const OLDDIR = path.join(E2E, 'work', 'old', 'skins');
check(!!await p.waitFor(`${foot}.indexOf(${JSON.stringify('moved "' + LATER + '" to ~work/old/skins/')}) >= 0`, 8000), 'the second Del moves it, and says where');
const moved = fs.existsSync(OLDDIR) ? fs.readdirSync(OLDDIR).filter((n) => n.startsWith(LATER + '-')) : [];
check(moved.length === 1 && JSON.parse(fs.readFileSync(path.join(OLDDIR, moved[0]), 'utf8')).name === LATER, 'the file in ~work/old/skins/ is the skin -- ' + moved.join(','));
check(!(LATER in JSON.parse(fs.readFileSync(FILE, 'utf8'))), 'it is out of the saved skins');
await filter('');
check(!!await p.waitFor(`document.body.textContent.indexOf(${JSON.stringify(LATER)}) < 0 || /moved/.test(${foot})`, 5000) &&
  (await p.eval(`[...document.querySelectorAll('#list > *')].map((e) => e.textContent).join('|')`)).indexOf(LATER + '1 line') < 0, '...and out of the list');
await filter('vibe_coding');
await p.key('Delete', 'Delete', '');
await p.key('Delete', 'Delete', '');
check(!!await p.waitFor(`/shipped skins stay/.test(${foot})`, 5000), 'a shipped skin is not moved');

const errs = [p, w, f, g].flatMap((x) => x.logs.filter((l) => /exception/.test(l)));
check(errs.length === 0, 'no JS exceptions' + (errs.length ? ': ' + errs.join(' | ') : ''));
done();
