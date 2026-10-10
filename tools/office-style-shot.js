// Render CORPORATE KOMBAT backdrop-style candidates headless, to PNGs.
//   node tools/office-style-shot.js <src/dev/office-styles/<id>.js | shipped> [--times 0,4] [--scale 2] [--floors lobby,open,exec]
//   node tools/office-style-shot.js --sheet <style files or shipped ...> [--t 3] [--scale 1.5]
// Writes work/local/office-styles/out/<id>-<floor>-t<t>.png, or with --sheet one contact
// sheet (a row per style, a column per floor) to work/local/office-styles/sheet.png. Each
// style is bundled on its own, so a half-written sibling can't break the render. Also
// prints the backdrop's paint time per frame (headless software canvas, so only relative).
import esbuild from 'esbuild';
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const k = args.indexOf(`--${name}`);
  if (k < 0) return dflt;
  const v = args[k + 1];
  args.splice(k, 2);
  return v;
};
const sheet = args.includes('--sheet');
if (sheet) args.splice(args.indexOf('--sheet'), 1);
const times = opt('times', '0,4').split(',').map(Number);
const sheetT = Number(opt('t', '3'));
const scale = Number(opt('scale', sheet ? '1.5' : '2'));
const floors = opt('floors', 'lobby,open,exec').split(',');
const targets = args.length ? args : ['shipped'];
const outDir = join(root, 'work/local/office-styles/out');
mkdirSync(outDir, { recursive: true });

async function bundle(target) {
  const importStyle = target === 'shipped'
    ? 'const STYLE = null;'
    : `import { STYLE } from ${JSON.stringify('./' + target)};`;
  const entry = `
${importStyle}
import { drawOfficeStyleScene, OFFICE_SCREENS } from './src/dev/office-styles/scene.js';
window.__name = STYLE ? STYLE.name : 'SHIPPED — doodle';
window.__shot = (floor, t, scale) => {
  const c = document.createElement('canvas');
  c.width = Math.round(480 * scale); c.height = Math.round(270 * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  const screen = OFFICE_SCREENS.find((s) => s.floor === floor);
  drawOfficeStyleScene(ctx, t, STYLE, screen);
  // time a few more frames of the same floor, after the first (which may bake)
  const t0 = performance.now();
  for (let k = 1; k <= 6; k++) drawOfficeStyleScene(ctx, t + k / 24, STYLE, screen);
  const ms = (performance.now() - t0) / 6;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.scale(scale, scale);
  drawOfficeStyleScene(ctx, t, STYLE, screen);
  return { url: c.toDataURL('image/png'), ms };
};
`;
  const result = await esbuild.build({
    stdin: { contents: entry, resolveDir: root, sourcefile: 'office-shot-entry.js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'error',
  });
  return result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
}

const browser = await chromium.launch();
const errors = [];
const rows = [];
for (const target of targets) {
  const id = target === 'shipped' ? 'shipped' : basename(target, '.js');
  let js;
  try { js = await bundle(target); } catch (e) { errors.push(`${id}: bundle failed: ${e.message}`); continue; }
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${id}: ${e.stack || e}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${id}: ${m.text()}`); });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#000"><script>${js}</script></body></html>`);
  const name = await page.evaluate(() => window.__name);
  if (!name) { errors.push(`${id}: bundle did not run`); await page.close(); continue; }
  const row = { id, name, cells: [] };
  for (const floor of floors) {
    for (const t of sheet ? [sheetT] : times) {
      try {
        const { url, ms } = await page.evaluate(([a, b, c]) => window.__shot(a, b, c), [floor, t, scale]);
        if (sheet) row.cells.push(url);
        else {
          const file = join(outDir, `${id}-${floor}-t${t}.png`);
          writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
          console.log(`${file}  (${ms.toFixed(1)} ms/frame)`);
        }
      } catch (e) { errors.push(`${id} ${floor} t=${t}: ${e.message}`); }
    }
  }
  rows.push(row);
  await page.close();
}

if (sheet && rows.length) {
  const page = await browser.newPage();
  const cw = Math.round(480 * scale), ch = Math.round(270 * scale);
  const html = `<!doctype html><html><body style="margin:0;background:#111;font:bold 14px monospace;color:#ddd">
    ${rows.map((r) => `<div style="padding:8px 8px 2px">${r.name}</div><div style="display:flex;gap:6px;padding:0 8px 8px">${r.cells.map((u) => `<img src="${u}" width="${cw}" height="${ch}">`).join('')}</div>`).join('')}
  </body></html>`;
  await page.setContent(html);
  await page.setViewportSize({ width: floors.length * (cw + 6) + 16, height: 400 });
  const file = join(root, 'work/local/office-styles/sheet.png');
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
  await page.close();
}
await browser.close();
if (errors.length) { console.error('ERRORS:\n' + errors.join('\n')); process.exit(1); }
