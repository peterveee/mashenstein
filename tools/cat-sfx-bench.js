// THE CAT SFX BENCH — `npm run catbench`, then http://localhost:8030 (or
// http://MBP14.local:8030 from a phone on the same network).
//
// Peter, 16 Oct 2026, while the swiping cats' sounds were being auditioned as WAVs:
// "can i play with the synth?". A slider per field of the engine's own shapes —
// SWIPE_SHAPES (the paw) and MEOW_SHAPES (the meows and hisses) in engine/audio.js —
// and PLAY fires the real cue through the real engine, so nothing here can drift from
// what the game plays. COPY gives the shape as a line to paste into that table.
// Rebuilt on every page load, so an edit to audio.js shows up on refresh.
import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.CAT_BENCH_PORT || 8030);

function page() {
  const esbuild = require('esbuild');
  const js = esbuild.buildSync({
    entryPoints: [join(root, 'tools/cat-sfx-bench-entry.js')],
    bundle: true, format: 'iife', write: false, logLevel: 'warning',
    define: { __MASH_BUILD__: '"cat-bench"' },
  }).outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>');
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cat SFX bench</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #14112a; color: #ece8ff; font: 14px ui-monospace, Menlo, monospace; }
  #app { max-width: 720px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 18px; letter-spacing: 2px; color: #ff5a7a; margin: 4px 0 14px; }
  .row { display: flex; align-items: center; gap: 10px; margin: 6px 0; flex-wrap: wrap; }
  .lab { width: 80px; color: #b8b0e0; }
  input[type=range] { flex: 1; min-width: 160px; accent-color: #ff5a7a; }
  .val, #pitchV { width: 56px; text-align: right; color: #ffd36b; }
  button, select { background: #2a2450; color: #ece8ff; border: 1px solid #524c9e; border-radius: 6px; padding: 8px 12px; font: inherit; }
  button.on { background: #ff2e4d; border-color: #ff2e4d; color: #fff; }
  #play { background: #38d8f8; color: #0b0920; border-color: #38d8f8; font-weight: 700; }
  .seg { display: inline-flex; gap: 4px; }
  .chk { color: #b8b0e0; }
  pre { background: #0b0920; border: 1px solid #36315a; border-radius: 6px; padding: 10px; white-space: pre-wrap; word-break: break-all; color: #cfe8ff; }
</style></head><body><script>${js}</script></body></html>`;
}

createServer((req, res) => {
  try {
    const html = page();
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(html);
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(String(e.stack || e));
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`cat SFX bench: http://localhost:${PORT}  ·  phone: http://MBP14.local:${PORT}`);
});
