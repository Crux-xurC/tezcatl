// test/e2e/xipe_elsewhere.mjs -- Xipe Totec reached outside the dialogue window
// (D-xipe-elsewhere), against the real copy (root "."):
//   - the dock's input_target lists xipe (i); `;i i` sends the dock's line there as
//     `input`, and the receiving side, following the input, shows the line and
//     Xipe Totec's answer (lib/recv/xipe.js)
//   - a matrix_set's command line: `xipe <line>` goes to Xipe Totec (its first
//     answer line on the bar), and the same frame's xipe source shows it all;
//     `xipe` alone is refused; matrix commands still work
//   - the tab's title: the frame's skin name first (main.html follows the frame)
import { openPage, PAGES, check, done } from './cdp.mjs';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const type = async (p, str) => { for (const ch of str) await p.key(ch, '', ch); await wait(250); };
const RX = `[...document.getElementById('recvx').children].map((d) => d.textContent).join('\\n')`;

console.log('the dock: ;i i');
const b = await openPage(PAGES + 'panels/skins/frame.html?skin=main');
await b.waitFor(`/ready|empty\\.|read "/.test(document.getElementById('recv').textContent)`, 15000);
await b.waitFor(`(() => { try { return window.frameSkin.target().contentWindow.Tezcatl.targetsReady; } catch (_) { return false; } })()`, 15000);
const TG = `window.frameSkin.target().contentDocument`;
check(!!await b.waitFor(`/i\\s*xipe\\s*connected/.test(${TG}.getElementById('list').textContent)`, 20000),
  'input_target lists xipe (i), connected -- ' + (await b.eval(`${TG}.getElementById('list').textContent`)).replace(/\s+/g, ' '));
await b.eval(`document.getElementById('line').focus(); true`);
await type(b, ';i');
await b.key('i', 'KeyI', 'i');
await wait(500);
check(/xipe/.test(await b.eval(`${TG}.getElementById('head').textContent`)), 'the dock sends to xipe: ' + await b.eval(`${TG}.getElementById('head').textContent`));
await b.eval(`document.getElementById('line').focus(); true`);
await type(b, 'help');
await b.key('Enter', 'Enter', '\r');
check(!!await b.waitFor(`(() => { const t = ${RX}; return /> help/.test(t) && t.split('\\n').length > 3; })()`, 20000),
  'the receiving side follows the input: the line and Xipe Totec\'s answer -- ' + (await b.eval(RX)).split('\n').slice(0, 3).join(' | '));
check(/^── xipe/.test(await b.eval(RX)), '...under the xipe source: ' + (await b.eval(RX)).split('\n')[0]);
check(/^main — Tezcatl$/.test(await b.eval('document.title')), 'the frame\'s title has its skin\'s name first: ' + await b.eval('document.title'));

console.log('main.html: the tab follows the frame');
const m = await openPage(PAGES + 'main.html');
check(!!await m.waitFor(`document.title === 'main — Tezcatl'`, 15000), 'main.html\'s title is the frame\'s: ' + await m.eval('document.title'));
await m.eval(`(() => { const d = document.getElementById('frame').contentDocument; const l = d.getElementById('line'); l.focus(); return true; })()`);
await m.send('Input.insertText', { text: 'skin name e2e-title' });
await m.key('Enter', 'Enter', '\r');
check(!!await m.waitFor(`document.title === 'e2e-title — Tezcatl'`, 5000), 'skin name changes the tab\'s title too: ' + await m.eval('document.title'));
await m.close();

console.log('matrix_set: xipe <line>');
const p = await openPage(PAGES + 'panels/skins/frame.html?synthesis=matrix_set');
const F = (part) => `[...document.querySelectorAll('iframe')].find(f => (f.src||'').includes(${JSON.stringify(part)}))`;
const doc = (part) => `${F(part)}.contentDocument`;
const S = `${F('matrix_bar.html')}.contentDocument.getElementById('status')`;
await p.waitFor(`!!${F('matrix_bar.html')} && !!${F('matrix_bar.html')}.contentDocument.getElementById('status')`, 15000);
await p.waitFor(`/xipe_rows:all/.test(${S}.textContent)`, 60000);
const cmd = async (line) => {
  await p.eval(`${F('code_cmd_in')}.contentWindow.focus(); ${doc('code_cmd_in')}.querySelector('.cm-content').focus(); true`);
  await p.send('Input.insertText', { text: line });
  await p.key('Enter', 'Enter', '\r', 2);
};
await cmd('xipe');
check(!!await p.waitFor(`/^! xipe ── xipe: what to send/.test(${S}.textContent)`, 5000), '`xipe` alone is refused: ' + await p.eval(`${S}.textContent`));
await cmd('xipe help');
check(!!await p.waitFor(`/^xipe ── /.test(${S}.textContent)`, 20000), 'xipe help: the first line of the answer on the bar -- ' + await p.eval(`${S}.textContent`));
await cmd('matrix pwd');
check(!!await p.waitFor(`${S}.textContent === 'xipe_rows:all'`, 5000), 'matrix commands still work: ' + await p.eval(`${S}.textContent`));
// the same frame's receiving side, the xipe source chosen (;o i)
await p.eval(`document.getElementById('line').focus(); true`);
await type(p, ';o');
await p.key('i', 'KeyI', 'i');
await wait(400);
// out of the input form, the receiving side shows the source chosen
await p.eval(`document.getElementById('line').blur(); document.body.focus(); true`);
await p.waitFor(`document.getElementById('dock').classList.contains('recv-other')`, 5000);
check(!!await p.waitFor(`(() => { const t = ${RX}; return /^── xipe/.test(t) && /> help/.test(t) && t.split('\\n').length > 3; })()`, 10000),
  'the frame\'s xipe source shows what the matrix line sent and the answer -- ' + (await p.eval(RX)).split('\n').slice(0, 2).join(' | '));

await done();
