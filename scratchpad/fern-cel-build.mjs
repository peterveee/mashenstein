import esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const root = '/Users/Peter/mashenstein';
const who = process.argv[2] || 'both';
const out = process.argv[3] || 'fern-cel';
const r = await esbuild.build({
  entryPoints: [root + '/scratchpad/fern-cel-entry.js'],
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'warning',
  outdir: root + '/scratchpad/out',
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const shell = readFileSync(root + '/scratchpad/fern-cel-shell.html', 'utf8');
writeFileSync(root + '/scratchpad/fern-cel.html', shell.replace('/*__BUNDLE__*/', () => js));

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 2400, height: 2000 }, deviceScaleFactor: 1 });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await p.goto('file://' + root + '/scratchpad/fern-cel.html?who=' + who);
await p.waitForTimeout(500);
const size = await p.evaluate(() => [document.body.scrollWidth, document.body.scrollHeight]);
await p.setViewportSize({ width: Math.min(4000, size[0] + 40), height: Math.min(6000, size[1] + 40) });
await p.waitForTimeout(400);
await p.screenshot({ path: `${root}/scratchpad/${out}.png` });
console.log('errors:', errs.length ? errs : 'none');
await b.close();
