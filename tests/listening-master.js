// A BOUNCE FOR LISTENING — tools/lib/listening-master.js, measured off the samples.
//
// The desk's Bounce brings a song from the game's level up to LISTENING_TARGET through the
// desk's own L7 limiter. The claims: it lands on the target, nothing comes out over the
// ceiling, the samples are where they were (L7's look-ahead taken back off), a stretch the
// limiter has no reason to touch is the mix times one gain — the balance kept — and silence
// stays silence. Rendered in Chromium, because L7 is Web Audio nodes.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = `
import { masterForListening, LISTENING_TARGET, LISTENING_CEILING_DB } from ${JSON.stringify(join(ROOT, 'tools/lib/listening-master.js'))};
import { loudness } from ${JSON.stringify(join(ROOT, 'tools/lib/loudness.js'))};
window.__m = { masterForListening, LISTENING_TARGET, LISTENING_CEILING_DB, loudness };
`;

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};

const { chromium } = require('playwright');
const esbuild = require('esbuild');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const html = '<!doctype html><meta charset="utf-8">'
  + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`;
const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
const errors = [];

try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('https://mashenstein.render/', { waitUntil: 'load' });
  const r = await page.evaluate(async () => {
    const { masterForListening, LISTENING_TARGET, LISTENING_CEILING_DB, loudness } = window.__m;
    const SR = 44100;
    const n = SR * 30;
    const L = new Float32Array(n);
    const R = new Float32Array(n);
    // A quiet game-level song: two tones, and a loud low hit every half second for the
    // first twenty seconds — then ten seconds of the tones alone, which nothing should limit.
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const ph = t % 0.5;
      const hit = t < 20 && ph < 0.06 ? Math.exp(-ph * 60) * 0.5 * Math.sin(2 * Math.PI * 55 * t) : 0;
      L[i] = 0.05 * Math.sin(2 * Math.PI * 220 * t) + hit;
      R[i] = 0.03 * Math.sin(2 * Math.PI * 330 * t) + hit;
    }
    const t0 = performance.now();
    const done = await masterForListening([L, R], { sampleRate: SR });
    const ms = performance.now() - t0;
    const [oL, oR] = done.channels;
    let peak = 0;
    for (const c of [oL, oR]) for (let i = 0; i < c.length; i++) peak = Math.max(peak, Math.abs(c[i]));
    // The quiet tail: output over input, sample for sample, on both sides.
    const ratio = (o, x) => {
      let lo = Infinity; let hi = -Infinity;
      for (let i = Math.floor(24 * SR); i < Math.floor(29 * SR); i++) {
        if (Math.abs(x[i]) < 0.01) continue;
        const q = o[i] / x[i];
        lo = Math.min(lo, q); hi = Math.max(hi, q);
      }
      return { lo, hi };
    };
    const silent = await masterForListening([new Float32Array(SR), new Float32Array(SR)], { sampleRate: SR });
    return {
      target: LISTENING_TARGET, ceiling: LISTENING_CEILING_DB, ms,
      before: loudness([L, R], SR).lufs, lufs: done.lufs, gainDb: done.gainDb,
      peakDb: 20 * Math.log10(peak), length: oL.length === n && oR.length === n,
      left: ratio(oL, L), right: ratio(oR, R),
      silentSame: silent.gainDb === 0 && silent.channels[0].every((v) => v === 0),
    };
  });
  assert(r.before < -20, `the fixture starts at a game level (${r.before.toFixed(1)} LUFS)`);
  assert(Math.abs(r.lufs - r.target) < 0.2,
    `it lands on the listening target (${r.lufs.toFixed(2)} LUFS for ${r.target}, ${r.gainDb.toFixed(1)} dB of drive)`);
  assert(r.peakDb <= r.ceiling + 0.05, `and nothing comes out over L7's ceiling (peak ${r.peakDb.toFixed(2)} dBFS for ${r.ceiling})`);
  assert(r.length, 'the file is the length it went in at');
  const want = 10 ** (r.gainDb / 20);
  const flat = (q) => Math.abs(q.lo / want - 1) < 0.01 && Math.abs(q.hi / want - 1) < 0.01;
  assert(flat(r.left) && flat(r.right),
    `where nothing needs limiting it is the mix times one gain, sample for sample, on both sides — in time and in balance (L ×${r.left.lo.toFixed(3)}–${r.left.hi.toFixed(3)}, R ×${r.right.lo.toFixed(3)}–${r.right.hi.toFixed(3)}, want ×${want.toFixed(3)})`);
  assert(r.silentSame, 'silence comes back as silence');
  console.log(`  (${Math.round(r.ms)} ms for 30 s of stereo)`);
  assert(errors.length === 0, `no page errors${errors.length ? `: ${errors.join('; ')}` : ''}`);
} finally {
  await browser.close();
}

if (failed) { console.error('\nLISTENING MASTER: FAILED'); process.exit(1); }
console.log('\nLISTENING MASTER: ok');
