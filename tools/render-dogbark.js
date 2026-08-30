// Audition the bark bench (src/dev/dog-bark-synth.js) to WAV.
//
// The engine's own cue is the same graph now, so `node tools/render-cues.js
// dogBark:finish` renders what the GAME plays, at the game's level; this renders
// the bench, at bench level, which is where a new shape is tried before it is
// wired. Use both — they should agree, and it is a bug if they stop.
//
// Node has no Web Audio, and this synth is a Web Audio graph — so, exactly as
// tools/render-cues.js does for engine cues, the class runs for real in headless
// Chromium under an OfflineAudioContext and the PCM comes back here. What lands in
// the file is what the browser plays, not a second implementation's impression.
//
// Usage:  node tools/render-dogbark.js [name ...]     (default: all of them)
//         node tools/render-dogbark.js --list
// Output: work/auditions/dogbark/*.wav
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wavBuffer, rmsOf, dbfs, SR } from './lib/wav.js';

const require = createRequire(import.meta.url);
const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const OUT = join(ROOT, 'work', 'auditions', 'dogbark');

// One entry per file. `call` is the method, `opts` the options object — the same
// shape any caller of the class would pass, so a winner is adopted by copying the
// object rather than by re-deriving it.
const TAKES = {
  // The five presets, single bark, for comparing voices.
  'a-large-single':  { call: 'play', opts: { preset: 'large' }, seconds: 1.0 },
  'b-medium-single': { call: 'play', opts: { preset: 'medium' }, seconds: 1.0 },
  'c-small-single':  { call: 'play', opts: { preset: 'small' }, seconds: 1.0 },
  'd-guard-single':  { call: 'play', opts: { preset: 'guard' }, seconds: 1.0 },
  'e-yip-single':    { call: 'play', opts: { preset: 'yip' }, seconds: 1.0 },

  // Volleys — what the game actually fires. The finish dog barks four times.
  'f-large-double':  { call: 'doubleBark', opts: { preset: 'large', count: 2, gap: 0.28 }, seconds: 1.4 },
  'g-guard-volley':  { call: 'doubleBark', opts: { preset: 'guard', count: 4, gap: 0.3 }, seconds: 2.2 },
  'h-small-volley':  { call: 'doubleBark', opts: { preset: 'small', count: 3, gap: 0.17 }, seconds: 1.4 },
  'i-yip-volley':    { call: 'doubleBark', opts: { preset: 'yip', count: 4, gap: 0.14 }, seconds: 1.4 },

  // The finish-dog candidate at the count and spacing the game uses today
  // (four barks, 0.26 apart — see BARK_SHAPES.finish in engine/audio.js), so it
  // can be A/B'd against `dogBark:finish` without changing two things at once.
  'j-finishdog':     { call: 'doubleBark', opts: { preset: 'guard', count: 4, gap: 0.26 }, seconds: 2.2 },

  // Peter's bench dial-in (DOG_PRESETS.finish) — single, pair, and the volley at
  // the count and spacing the game fires.
  'p-finish-single': { call: 'play', opts: { preset: 'finish' }, seconds: 1.0 },
  'q-finish-double': { call: 'doubleBark', opts: { preset: 'finish', count: 2, gap: 0.26 }, seconds: 1.4 },
  'r-finish-volley': { call: 'doubleBark', opts: { preset: 'finish', count: 4, gap: 0.26 }, seconds: 2.2 },

  // Parameter corners, for hearing what each control does on the same dog.
  'k-medium-dry':    { call: 'play', opts: { preset: 'medium', distortion: 0, chest: 0, rough: 0 }, seconds: 1.0 },
  'l-medium-strain': { call: 'play', opts: { preset: 'medium', distortion: 1 }, seconds: 1.0 },
  'm-medium-airy':   { call: 'play', opts: { preset: 'medium', breathiness: 1.4 }, seconds: 1.0 },
  'n-medium-nodrop': { call: 'play', opts: { preset: 'medium', pitchDrop: 2 }, seconds: 1.0 },
  'o-medium-bigdrop':{ call: 'play', opts: { preset: 'medium', pitchDrop: 24 }, seconds: 1.0 },
};

const ENTRY = `
import { DogBarkSynthesizer, DOG_PRESETS } from ${JSON.stringify(join(ROOT, 'src/dev/dog-bark-synth.js'))};
window.__Dog = DogBarkSynthesizer;
window.__Presets = DOG_PRESETS;
`;

// Bundle the class into the control bench so the page opens straight off disk.
// tools/dogbark-bench.html is the source and imports the module for real, which
// needs a server; this writes the same page with the import satisfied inline.
async function bench() {
  const require2 = require;
  const esbuild = require2('esbuild');
  const built = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
  });
  const js = built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>');
  const html = readFileSync(join(ROOT, 'tools', 'dogbark-bench.html'), 'utf8')
    .replace(/import \{ DogBarkSynthesizer, DOG_PRESETS \} from '[^']*';/,
      'const { DogBarkSynthesizer, DOG_PRESETS } = { DogBarkSynthesizer: window.__Dog, DOG_PRESETS: window.__Presets };')
    .replace('<script type="module">', `<script>${js}<\/script>\n<script type="module">`);
  const dir = join(ROOT, 'work', 'local');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'dogbark-bench.html');
  writeFileSync(file, html);
  console.log(`-> ${file}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--list') { console.log(Object.keys(TAKES).join('\n')); return; }
  if (args[0] === '--bench') { await bench(); return; }
  const names = args.length ? args : Object.keys(TAKES);
  for (const n of names) {
    if (!TAKES[n]) { console.error(`no take "${n}" — try --list`); process.exit(1); }
  }

  let chromium;
  try { ({ chromium } = require('playwright')); } catch {
    console.error('playwright is required: npm install && npx playwright install chromium');
    process.exit(1);
  }
  const esbuild = require('esbuild');
  const built = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
  });
  const bundleJs = built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>');

  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  for (const name of names) {
    const take = TAKES[name];
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setContent(`<!doctype html><meta charset="utf-8"><script>${bundleJs}<\/script>`,
      { waitUntil: 'load' });
    const out = await page.evaluate(async ({ call, opts, seconds, sr }) => {
      const ctx = new OfflineAudioContext(1, Math.ceil(sr * seconds), sr);
      const dog = new window.__Dog(ctx);
      dog[call](opts);
      const buf = await ctx.startRendering();
      return Array.from(buf.getChannelData(0));
    }, { ...take, sr: SR });
    await page.close();
    for (const e of errors) console.error(`${name}: ${e}`);

    const pcm = Float32Array.from(out);
    let peak = 0;
    for (const s of pcm) peak = Math.max(peak, Math.abs(s));
    // Written at its NATURAL level, not normalised: these have to be compared
    // against each other and against the engine's own cue, and a normalise
    // throws away exactly the difference being auditioned. Peak is reported so
    // anything on the edge of clipping is visible.
    writeFileSync(join(OUT, `${name}.wav`), wavBuffer(pcm, peak > 1 ? 1 / peak : 1));
    console.log(`${name}.wav  peak ${dbfs(peak)}  rms ${dbfs(rmsOf(pcm))}`
      + (peak > 1 ? '  (normalised — it clipped)' : ''));
  }
  await browser.close();
  console.log(`\n-> ${OUT}`);
}

main();
