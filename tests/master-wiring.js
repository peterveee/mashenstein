// The master limiter and THE CEILING, switched in and out in any order, leave ONE path to the
// output.
//
// wireMaster (mixer.js) took the limiter's output off only when the limiter went out. With it
// in, THE CEILING going in after it left the limiter's old wire to the destination standing:
// the limiter straight out AND the limiter through the ceiling, the whole song twice and 6 ms
// apart (each DynamicsCompressorNode delays by 6 ms). A comb filter, heard as phasing (Peter,
// 25 Oct 2026) — the title screen's song has the limiter on, so the jukebox's first song with
// it on too played doubled until a song without it rewired the master.
//
// The claim is an impulse response: one small click into the mixer's input, rendered offline
// through a fresh mixer after every sequence of setLimiter/setCeiling calls that ends in each
// state, must come out as exactly one tap, where that state puts it. Chromium, offline.
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ENTRY = `
import { createMixer } from ${JSON.stringify(join(ROOT, 'src/engine/mixer.js'))};
window.__render = async (steps) => {
  const SR = 48000;
  const ctx = new OfflineAudioContext(2, SR * 0.1, SR);
  const input = ctx.createGain();
  const mixer = createMixer(ctx, {
    musicBus: ctx.createGain(), echoBus: ctx.createGain(), master: input, destination: ctx.destination,
    songTrim: ctx.createGain(), metered: false,
  });
  await mixer.ready;
  for (const [what, on] of steps) (what === 'limiter' ? mixer.setLimiter(on) : mixer.setCeiling(on));
  const click = ctx.createBuffer(2, 1, SR);
  click.getChannelData(0)[0] = 0.05; click.getChannelData(1)[0] = 0.05;
  const src = ctx.createBufferSource(); src.buffer = click; src.connect(input); src.start(0.01);
  const out = (await ctx.startRendering()).getChannelData(0);
  let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
  // A tap: a local peak above a fifth of the largest, a millisecond clear of the last one.
  const taps = [];
  for (let i = 1; i < out.length - 1; i++) {
    const a = Math.abs(out[i]);
    if (a > peak * 0.2 && a >= Math.abs(out[i - 1]) && a >= Math.abs(out[i + 1])
      && (!taps.length || i - taps[taps.length - 1] > SR / 1000)) taps.push(i);
  }
  return { taps: taps.map((i) => +((i / SR - 0.01) * 1000).toFixed(2)), limiter: mixer.limiterOn, ceiling: mixer.ceilingOn };
};
`;

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};

async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('FAIL: playwright is required: npm install');
    process.exit(1);
  }
  const esbuild = require('esbuild');
  const built = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
  });
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setContent('<!doctype html><meta charset="utf-8">'
      + `<script>${built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>')}<\/script>`, { waitUntil: 'load' });

    // From every state to every state, in both orders — applyMix sets the ceiling first, then
    // the limiter; the desk can do either alone.
    const states = [[false, false], [true, false], [false, true], [true, true]];
    const bad = [];
    let checked = 0;
    for (const [l0, c0] of states) {
      for (const [l1, c1] of states) {
        for (const ceilingFirst of [true, false]) {
          const to = ceilingFirst ? [['ceiling', c1], ['limiter', l1]] : [['limiter', l1], ['ceiling', c1]];
          const r = await page.evaluate((s) => window.__render(s), [['limiter', l0], ['ceiling', c0], ...to]);
          // Each compressor in the path is 6 ms; nothing in it, a wire.
          const expected = 6 * ((l1 ? 1 : 0) + (c1 ? 1 : 0));
          const one = r.taps.length === 1 && Math.abs(r.taps[0] - expected) < 0.5;
          if (!one) bad.push(`limiter ${l0}→${l1}, ceiling ${c0}→${c1}${ceilingFirst ? ' (ceiling first)' : ''}: taps at ${r.taps.join(', ')} ms, expected ${expected}`);
          checked++;
        }
      }
    }
    assert(!bad.length, `every limiter/ceiling sequence leaves one path to the output (${checked} sequences)${bad.length ? `\n  ${bad.join('\n  ')}` : ''}`);
  } finally {
    await browser.close();
  }
  if (errors.length) { console.error('FAIL: page errors:', errors); failed = true; }
  console.log(failed ? 'MASTER WIRING: FAILED' : 'MASTER WIRING: PASSED');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
