// Render named SFX cues to WAV, through the real engine, so they can be compared by ear.
//
// Usage:  node tools/render-cues.js [name ...]     (default: the level-start candidates)
//         node tools/render-cues.js --list
//
// tools/render-sfx.js also writes cue WAVs, but it is a hand-written REIMPLEMENTATION of
// two specific cues — it mirrors AudioSys.osc() rather than calling it, which is fine for
// the two it knows and no use at all for a cue built from noise buffers, convolution or a
// stereo panner. This drives the actual engine in an OfflineAudioContext, the same way
// tools/lib/render-bank-browser.js renders a song, so what lands in the file is what the
// game plays. Slower, and correct for anything.
//
// Cues reach the destination by several routes — some straight to the master, some via
// musicBus, some through the shared reverb send — so the render captures the whole graph
// rather than tapping any one bus.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wavBuffer, SR } from './lib/wav.js';


const require = createRequire(import.meta.url);
const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));

// The shortlist for "the level has started". Not exhaustive — any cue name the engine
// knows works, and --list prints them.
const DEFAULTS = ['portal', 'comet', 'star', 'checkpoint', 'fizzUp', 'dash', 'boom', 'power'];

// Shapes for the portal swoosh, for picking one by ear. `portal:long` renders the cue
// through portalSwoosh's options rather than a different cue — so whichever wins is
// adopted by passing the same object at the call site, with nothing to re-create.
//
// stretch scales the sweeps and the seam, q is resonance (up = whistly, down = airy),
// spread is how far the bands travel, wet is how much room. 1 is the cue as authored.
const SHAPES = {
  now:     {},
  long:    { stretch: 1.8 },
  longer:  { stretch: 2.6 },
  whistle: { stretch: 1.8, q: 2.2 },
  airy:    { stretch: 2.0, q: 0.55, spread: 1.4 },
  wide:    { stretch: 2.0, spread: 1.7 },
  cavern:  { stretch: 2.2, wet: 1.9 },
  epic:    { stretch: 2.8, q: 1.5, spread: 1.6, wet: 1.5 },

  // No knock. The low sine under the seam is the loudest thing in the cue and it lands
  // in the middle of the swoosh; these all take it out and differ in what replaces it.
  clean:   { stretch: 1.8, thump: 0 },
  pass:    { stretch: 2.0, thump: 0, flash: 0.5, pan: 0.9, spread: 1.4 },
  relay:   { stretch: 2.2, thump: 0, flash: 0.6, pan: 0.9, overlap: 0.13, spread: 1.3 },
  breath:  { stretch: 2.4, thump: 0, flash: 0, q: 0.5, spread: 1.5, pan: 0.6 },
  siren:   { stretch: 2.0, thump: 0, flash: 0.4, q: 2.4, pan: 0.7, spread: 1.2 },
  vast:    { stretch: 2.6, thump: 0, flash: 0.5, pan: 1, wet: 2, spread: 1.4 },
  // `portal:wired` renders whatever the game is actually firing, read from the engine
  // rather than copied here — so a shape tuned in audio.js cannot silently drift out of
  // the tool that is supposed to audition it.
  wired:   null,
  wiredIn: 'PORTAL_RELAY_IN',
  wiredOut:'PORTAL_RELAY_OUT',
  wiredCred:'PORTAL_RELAY_CREDITS',
  cred4:   { stretch: 4, thump: 0, flash: 0, pan: 1, overlap: 0.18, q: 0.8, spread: 1.6, wet: 1.4, swell: 0.5 },
  cred8:   { stretch: 8, thump: 0, flash: 0, pan: 1, overlap: 0.18, q: 0.8, spread: 1.6, wet: 1.4, swell: 0.5 },
  handover:{ stretch: 2.4, thump: 0, flash: 0, pan: 1, overlap: 0.18, q: 0.8, spread: 1.6, wet: 1.4 },

  // handover, with the incoming leg swelling in rather than arriving on a hard attack.
  // Same cue otherwise; `swell` is the only difference between the first three.
  hand2:   { stretch: 2.4, thump: 0, flash: 0, pan: 1, overlap: 0.18, q: 0.8, spread: 1.6, wet: 1.4, swell: 0.3 },
  hand3:   { stretch: 2.4, thump: 0, flash: 0, pan: 1, overlap: 0.18, q: 0.8, spread: 1.6, wet: 1.4, swell: 0.5 },
  // Crossing later as well as softer, so the outgoing leg is established first.
  hand4:   { stretch: 2.4, thump: 0, flash: 0, pan: 1, overlap: 0.10, q: 0.8, spread: 1.6, wet: 1.4, swell: 0.35 },
  // Longer again, for the most gradual version of the same gesture.
  hand5:   { stretch: 3.0, thump: 0, flash: 0, pan: 1, overlap: 0.14, q: 0.8, spread: 1.6, wet: 1.4, swell: 0.4 },
};

// Long enough for the slowest of them (cometSwoop runs 1.34s) plus a reverb tail.
const SECONDS = 5;

const ENTRY = `
import * as A from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
window.__Audio = A.Audio;
window.__WIRED = { shape: A.PORTAL_RELAY, gain: A.PORTAL_RELAY_GAIN };
window.__A = A;
`;

async function main() {
  const args = process.argv.slice(2);
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('playwright is required: npm install && npx playwright install chromium');
    process.exit(1);
  }
  const esbuild = require('esbuild');
  const built = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
  });
  const bundleJs = built.outputFiles[0].text;

  const browser = await chromium.launch({ headless: true });

  if (args[0] === '--list') {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><meta charset="utf-8">`
      + `<script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>`, { waitUntil: 'load' });
    // Read the cue names out of the switch itself, so this cannot drift from the engine.
    const names = await page.evaluate(() => {
      const src = String(window.__Audio.sfx);
      return [...src.matchAll(/case '([A-Za-z0-9]+)'/g)].map((m) => m[1]);
    });
    await browser.close();
    console.log([...new Set(names)].sort().join('\n'));
    return;
  }

  const names = args.length ? args : DEFAULTS;
  const outDir = join(ROOT, 'audio', 'sfx-renders');
  mkdirSync(outDir, { recursive: true });

  // A fresh page per cue: Audio is a singleton and `ensure` binds one context for its
  // lifetime, exactly as tests/song-switch.js explains.
  for (const name of names) {
    // `portal@2.6` renders that cue at that gain, so several strengths of the same cue
    // can be laid side by side in one run and compared.
    // `portal@3.5` is a gain, `portal:long` is a shape, and they compose:
    // `portal:epic@3.5` is that shape at the strength the game actually fires it.
    const [namePart, gainStr] = name.split('@');
    const [cueName, shapeName] = namePart.split(':');
    const gain = gainStr ? Number(gainStr) : 1;
    const shape = shapeName ? SHAPES[shapeName] : undefined;
    if (shapeName && shape === undefined) {
      console.error(`no shape "${shapeName}" — one of ${Object.keys(SHAPES).join(', ')}`);
      continue;
    }
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setContent(`<!doctype html><meta charset="utf-8">`
      + `<script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>`, { waitUntil: 'load' });
    const out = await page.evaluate(async ({ cue, gain: g, shape, seconds, sr }) => {
      const Audio = window.__Audio;
      const ctx = new OfflineAudioContext(2, sr * seconds, sr);
      Audio.setCaptureEnabled(false);
      Audio.setNoiseSeed(1);
      Audio.ensure(ctx);
      if (Audio.mixer) await Audio.mixer.ready;
      // songTrim sits at silence until a bank opens it. Most cues go straight to the
      // master and never notice, but a few — cometSwoop is one — ride musicBus, and
      // those render as nothing at all unless it is opened by hand. Worth knowing about
      // a cue as well as hearing it: one that rides the music path is scaled by the
      // song trim and the music volume, so a player with the music down loses it.
      Audio.songTrim.gain.cancelScheduledValues(0);
      Audio.songTrim.gain.setValueAtTime(1, 0);
      // `wired` comes through as null: take the engine's own shape and, when no gain was
      // asked for, its own gain too, so `portal:wired` is exactly what the game plays.
      const useShape = shape === null ? window.__WIRED.shape
        : (typeof shape === 'string' ? window.__A[shape] : shape);
      const useGain = (shape === null || typeof shape === 'string') && g === 1
        ? window.__WIRED.gain : g;
      Audio.sfx(cue, { gain: useGain, shape: useShape });
      const buf = await ctx.startRendering();
      const L = Array.from(buf.getChannelData(0));
      const R = Array.from(buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0));
      let peak = 0; let last = 0;
      for (let i = 0; i < L.length; i++) {
        const a = Math.max(Math.abs(L[i]), Math.abs(R[i]));
        if (a > peak) peak = a;
        if (a > 1e-4) last = i;
      }
      // How long the cue takes to get half way up. This is the difference between a
      // sound that swells in and one that arrives — the thing you cannot see in a peak
      // or an RMS, and the thing that decides whether a swoosh reads as percussion.
      let rise = 0;
      for (let i = 0; i < L.length; i++) {
        if (Math.max(Math.abs(L[i]), Math.abs(R[i])) >= peak * 0.5) { rise = i / sr; break; }
      }
      // Where the cue is LOUDEST, on a short smoothing window rather than at the single
      // hottest sample — one stray peak in a noise sweep is not where the sound lands.
      // This is what a caller firing the cue ahead of an event has to lead by.
      const win = Math.max(1, Math.round(sr * 0.02));
      let best = -1; let bestAt = 0; let acc = 0;
      for (let i = 0; i < L.length; i++) {
        acc += (L[i] * L[i] + R[i] * R[i]) / 2;
        if (i >= win) acc -= (L[i - win] * L[i - win] + R[i - win] * R[i - win]) / 2;
        if (i >= win && acc > best) { best = acc; bestAt = (i - win / 2) / sr; }
      }
      return { L, R, peak, tail: last / sr, rise, loudestAt: bestAt };
    }, { cue: cueName, gain, shape, seconds: SECONDS, sr: SR });
    await page.close();
    for (const e of errors) console.error(`${name}: ${e}`);

    const file = join(outDir, `${name.replace(':', '-').replace('@', '-x')}.wav`);
    const L = Float32Array.from(out.L);
    const R = Float32Array.from(out.R);
    writeFileSync(file, wavBuffer([L, R], 1));
    const db = out.peak > 0 ? `${(20 * Math.log10(out.peak)).toFixed(1)}` : '-inf';
    // RMS as well as peak, because peak is the wrong question for comparing cues of
    // different shapes: a one-second whoosh and a third-of-a-second arpeggio can share
    // a peak and be nowhere near each other to listen to.
    //
    // RMS rather than LUFS, which is what you would reach for first and what this tried
    // to use. Integrated loudness gates on 400ms blocks and needs several of them above
    // threshold; every cue here is between a sixth of a second and a second and a half,
    // so the whole set measured -inf. LUFS is for programme material, not for blips.
    //
    // Over the cue's own length, not the padded render — otherwise two seconds of
    // silence drag every reading down by a different amount depending on the tail.
    const heard = Math.max(1, Math.ceil((out.tail + 0.05) * SR));
    let sum = 0;
    for (let i = 0; i < heard; i++) sum += (L[i] * L[i] + R[i] * R[i]) / 2;
    const rms = Math.sqrt(sum / heard);
    const r = rms > 0 ? `${(20 * Math.log10(rms)).toFixed(1)}` : '-inf';
    console.log(`${name.padEnd(18)} ${out.tail.toFixed(2)}s  rise ${out.rise.toFixed(3)}s`
      + `  loudest ${out.loudestAt.toFixed(3)}s`
      + `  peak ${db.padStart(6)}  rms ${String(r).padStart(6)}  ${file.replace(`${ROOT}/`, '')}`);
  }
  await browser.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
