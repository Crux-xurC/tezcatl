// test/e2e/citlalpol.mjs -- Citlalpol in Tezcatl (D-citlalpol-bus): records written into the stack's own
// Citlalpol state ($E2E_DIR/citlalpol/records, never this machine's) reach a frame's citlalpol_bus through the
// relay, and its citlalpol_log shows them as rows -- one opened later gets what the bus keeps, a new record
// is added at the bottom, p pauses (what comes waits, then is added), a value with an escape sequence is
// text. A log alone (no bus in its skin) says so. citld's pid file decides "citld running".
import { openPage, PAGES, check, done } from './cdp.mjs';
import fs from 'node:fs';
import path from 'node:path';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const E2E = process.env.E2E_DIR || path.join(process.env.TMPDIR || '/tmp', 'tezcatl-e2e');
const recDir = path.join(E2E, 'citlalpol', 'records');
const runDir = path.join(E2E, 'citlalpol-run');
fs.mkdirSync(recDir, { recursive: true });
fs.mkdirSync(runDir, { recursive: true });
const day = new Date().toISOString().slice(0, 10);
const file = path.join(recDir, day + '.jsonl');
const rec = (o) => fs.appendFileSync(file, JSON.stringify(Object.assign({ at: new Date().toISOString(), run: 'c-e2e', access: 'try' }, o)) + '\n');
const tag = 'e2e' + Date.now().toString(36);
rec({ decision: 'refuse', proto: 'connect', host: tag + '-a.example', port: 443, method: 'CONNECT', cmd: 'curl https://a', why: 'not in access.json' });
rec({ decision: 'stand_in', proto: 'http', host: tag + '-b.test', port: 80, method: 'GET', path: '/ping', cmd: 'curl http://b/ping', default: true, captured: true });
fs.writeFileSync(path.join(runDir, 'citld.pid'), String(process.pid));

const p = await openPage(PAGES + 'panels/skins/frame.html');
await p.waitFor(`/ready|empty\\./.test(document.getElementById('recv').textContent)`, 15000);
const line = async (text) => {
  await p.eval(`document.getElementById('line').focus(); true`);
  await p.send('Input.insertText', { text });
  await p.key('Enter', 'Enter', '\r');
  await wait(600);
};
const F = (role) => `[...document.querySelectorAll('iframe')].find(f => { try { return f.contentWindow.Tezcatl.bus.self.role === ${JSON.stringify(role)}; } catch (_) { return false; } })`;

console.log('citlalpol_bus and citlalpol_log in a frame');
await line('skin add citlalpol_bus');
await p.waitFor(`!!${F('citlalpol_bus')}`, 10000);
check(!!await p.waitFor(`${F('citlalpol_bus')}.contentWindow.citlalpolBus.count() >= 2`, 15000), 'the bus read the records through the relay');
check(!!await p.waitFor(`/● citld/.test(${F('citlalpol_bus')}.contentDocument.getElementById('citld').textContent)`, 5000), 'citld is running (its pid file)');
await line('skin add citlalpol_log');
await p.waitFor(`!!${F('citlalpol_log')}`, 10000);
const LOG = `${F('citlalpol_log')}.contentWindow.citlalpolLog`;
check(!!await p.waitFor(`${LOG}.rows() >= 2`, 10000), 'a log opened later gets what the bus keeps');
const cells = () => p.eval(`JSON.stringify(${LOG}.cells())`).then(JSON.parse);
let c = await cells();
const b = c.find((x) => x.dest === tag + '-b.test:80');
check(!!b && b.request === 'GET /ping' && b.result === 'undecided (captured)' && b.decision === 'stand_in', 'a row: destination, request, result -- ' + JSON.stringify(b));

const before = (await cells()).length;
rec({ decision: 'pass', proto: 'connect', host: tag + '-c.com', port: 443, method: 'CONNECT', cmd: 'git \x1b]0;pwned\x07 fetch' });
check(!!await p.waitFor(`${LOG}.rows() === ${before + 1}`, 8000), 'a new record is added at the bottom');
c = await cells();
check(c.some((x) => x.cmd === 'git \\x1b]0;pwned\\x07 fetch'), 'an escape sequence in a value is shown as text (\\x1b)');
check(await p.eval(`${F('citlalpol_log')}.contentDocument.querySelectorAll('table.mx-grid script, table.mx-grid img').length`) === 0, 'nothing of a record becomes HTML');

await p.eval(`(() => { const d = ${F('citlalpol_log')}.contentDocument.getElementById('grid-wrap'); d.focus(); d.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true })); return true; })()`);
rec({ decision: 'refuse', proto: 'http', host: tag + '-d.test', port: 80, method: 'POST', path: '/x?token=…', cmd: 'curl -X POST', why: 'not in access.json' });
await wait(4000);
check(await p.eval(`${LOG}.rows()`) === before + 1 && /1 waiting/.test(await p.eval(`${F('citlalpol_log')}.contentDocument.getElementById('state').textContent`)),
  'p pauses: the new record waits, counted -- ' + await p.eval(`${F('citlalpol_log')}.contentDocument.getElementById('state').textContent`));
await p.eval(`(() => { const d = ${F('citlalpol_log')}.contentDocument.getElementById('grid-wrap'); d.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true })); return true; })()`);
check(!!await p.waitFor(`${LOG}.rows() === ${before + 2}`, 3000), 'p again: what waited is added');

console.log('citlalpol_image');
await line('skin add citlalpol_image');
await p.waitFor(`!!${F('citlalpol_image')}`, 10000);
const IMG = `${F('citlalpol_image')}`;
check(!!await p.waitFor(`/records/.test(${IMG}.contentDocument.getElementById('state').textContent)`, 8000), 'the image asked the bus: ' + await p.eval(`${IMG}.contentDocument.getElementById('state').textContent`));
const rings = await p.eval(`[...${IMG}.contentDocument.querySelectorAll('textPath')].map(t => t.textContent).join(' | ')`);
check(/tezcatl/.test(rings) && /citlalpol/.test(rings) && /Internet/.test(rings), 'the rings name tezcatl, citlalpol, the Internet');
const sky = await p.eval(`(() => { const d = ${IMG}.contentDocument; const cs = d.defaultView.getComputedStyle(d.body); return cs.backgroundImage + ' ' + cs.animationName + ' ' + cs.backgroundRepeat; })()`);
check(/skyscape\.webp/.test(sky) && /drift/.test(sky) && /repeat-x/.test(sky), 'the sky is the background, flowing to the left: ' + sky);
const skyUrl = (sky.match(/url\("([^"]+)"\)/) || [])[1];
const skyOk = await p.eval(`new Promise((res) => { const i = new Image(); i.onload = () => res(i.naturalWidth + 'x' + i.naturalHeight); i.onerror = () => res('error'); i.src = ${JSON.stringify(skyUrl)}; })`);
check(skyOk === '2172x724', 'the sky picture loads (WebP, 2172x724): ' + skyOk);
rec({ decision: 'refuse', proto: 'http', host: tag + '-e.test', port: 80, method: 'GET', path: '/<img src=x onerror=alert(1)>', why: 'not in access.json' });
rec({ decision: 'refuse', proto: 'http', host: tag + '-f.test', port: 80, method: 'GET', path: '/y', why: 'not in access.json' });
rec({ decision: 'pass', proto: 'connect', host: tag + '-g.com', port: 443, method: 'CONNECT' });
check(!!await p.waitFor(`${IMG}.contentWindow.citlalpolImage.launched().length >= 2`, 8000), 'records travel as glyphs');
const L2 = await p.eval(`JSON.stringify(${IMG}.contentWindow.citlalpolImage.launched())`).then(JSON.parse);
check(L2.some((x) => x.glyph === '🔎' && x.route === 'stop' && x.count === 2) && L2.some((x) => x.glyph === '🛜' && x.route === 'out'),
  'two refused GETs as one 🔎 with ② stopping at Citlalpol, a CONNECT 🛜 going on to the Internet -- ' + JSON.stringify(L2));
rec({ decision: 'pass', proto: 'tcp', via: 'redirect', host: tag + '-db.test', port: 3306, sent_to: '127.0.0.1:55432', to_auth: 'zoozve' });
rec({ decision: 'pass', proto: 'dns', via: 'dns', host: tag + '-db.test', port: 53, method: 'A', answer: '198.18.0.2' });
check(!!await p.waitFor(`${IMG}.contentWindow.citlalpolImage.launched().some((x) => x.route === 'local')`, 8000), 'a pass to a zoozve gate travels to Zoozve');
const L3 = await p.eval(`JSON.stringify(${IMG}.contentWindow.citlalpolImage.launched())`).then(JSON.parse);
check(L3.some((x) => x.glyph === '🖥️' && x.route === 'local') && L3.some((x) => x.glyph === '📇' && x.route === 'back'),
  'the database behind a gate 🖥️ goes to Zoozve and back, a name the wall asked 📇 comes back from Citlalpol -- ' + JSON.stringify(L3));
const zz = await p.eval(`(() => { const d = ${IMG}.contentDocument; const z = d.getElementById('zoozve'); const a = z.getBoundingClientRect(); return JSON.stringify({ moving: !!z.querySelector('animateMotion'), w: Math.round(a.width), glow: d.querySelectorAll('#zoozve-loop use').length }); })()`).then(JSON.parse);
check(zz.moving && zz.w > 0 && zz.glow === 2, 'Zoozve rides its loop, drawn with its glow: ' + JSON.stringify(zz));
await wait(600);
check(await p.eval(`${IMG}.contentDocument.querySelectorAll('#packets img, #packets script, #packets foreignObject').length`) === 0, 'nothing of a record becomes markup in the picture');
fs.mkdirSync(path.join(E2E, 'shots'), { recursive: true });
const shot = await p.send('Page.captureScreenshot', { format: 'png' }).catch(() => null);
if (shot && shot.data) fs.writeFileSync(path.join(E2E, 'shots', 'citlalpol.png'), Buffer.from(shot.data, 'base64'));

console.log('a log alone');
const q = await openPage(PAGES + 'panels/resident/citlalpol_log.html');
await wait(2500);
check(/alone|no citlalpol_bus/.test(await q.eval(`document.getElementById('state').textContent`)), 'a log with no bus in its skin says so: ' + await q.eval(`document.getElementById('state').textContent`));

fs.rmSync(path.join(runDir, 'citld.pid'), { force: true });
check(!!await p.waitFor(`/citld not running/.test(${F('citlalpol_bus')}.contentDocument.getElementById('citld').textContent)`, 8000), 'citld gone: the bus says so');
await done();
