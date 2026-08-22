// The SHAPE of a pitch sweep, measured off the rendered samples.
//
// `sweep` says how far and how long. `pitchCurve` (KLNG8) and `sweepCurve` (game
// synth) say where in that time the pitch actually goes, and that is most of what the
// drop sounds like: an even glide, a hang-then-plunge, or a snap that is at the note
// before you hear it travel. Three shapes that a knob cannot express, so they are a pill.
//
// Asserted by COUNTING ZERO CROSSINGS in a window of the render rather than by reading
// back the automation events. Reading the schedule would only prove that the engine
// called the method the test expected it to call; the question is where the pitch IS
// partway through, which is a property of the sound and is what the ear is judging.
//
// Run in Chromium against a real OfflineAudioContext, for the same reason
// tests/voice-edit.js is: Web Audio's automation curves are the thing under test, and a
// stub of `setTargetAtTime` would prove only that the stub works.
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ENTRY = `
import { VoiceRack } from ${JSON.stringify(join(ROOT, 'src/engine/voices.js'))};
window.__VoiceRack = VoiceRack;
`;

const results = [];
const assert = (cond, msg) => results.push({ ok: !!cond, msg });

// 800 Hz down to 100 over 400ms — three octaves, which is more than any kick and is
// chosen so the three curves land far enough apart to be told apart by a crossing count
// rather than by a tolerance argument.
const FROM = 800, TO = 100, SWEEP = 0.4;
// Where each shape should be halfway through, from the definitions in `pitchRamp`:
//   exp   the geometric mean of the two ends
//   lin   the arithmetic mean
//   snap  two time constants down (tau is a quarter of the sweep), so 13.5% of the way
//         from the target back up to where it started
const WANT = {
  exp: Math.sqrt(FROM * TO),                       // 283 Hz
  lin: (FROM + TO) / 2,                            // 450 Hz
  snap: TO + (FROM - TO) * Math.exp(-2),           // 195 Hz
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
  const bundleJs = built.outputFiles[0].text;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent(
    `<!doctype html><meta charset="utf-8">`
    + `<script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}<\/script>`,
    { waitUntil: 'load' },
  );

  const out = await page.evaluate(async ({ FROM, TO, SWEEP }) => {
    const VoiceRack = window.__VoiceRack;
    const said = [];
    const say = (ok, msg) => said.push({ ok, msg });
    const SR = 44100;

    /**
     * The frequency of a sine over a window, from how often it crosses zero.
     *
     * A sweep is still moving inside the window, so this is its AVERAGE over those
     * 50ms and not an instantaneous reading — which is why the window is centred on
     * the moment being asked about and why the tolerances below are percentages.
     */
    const freqAt = (pcm, at, win = 0.05) => {
      const a = Math.max(0, Math.round((at - win / 2) * SR));
      const b = Math.min(pcm.length - 1, Math.round((at + win / 2) * SR));
      let crossings = 0;
      for (let i = a + 1; i <= b; i++) {
        if ((pcm[i - 1] < 0 && pcm[i] >= 0) || (pcm[i - 1] >= 0 && pcm[i] < 0)) crossings++;
      }
      return crossings / 2 / ((b - a) / SR);
    };

    /** One hit of a bare pitched drum section, rendered alone. */
    const renderDrum = async (osc) => {
      const ctx = new OfflineAudioContext(1, Math.round(SR * 0.7), SR);
      const rack = new VoiceRack(ctx);
      const dry = ctx.createGain();
      dry.connect(ctx.destination);
      // No noise, no drive, no knock: the oscillator on its own, so nothing but its
      // own pitch is in the samples being counted.
      rack._playDrum(
        { kind: 'drum', osc: { type: 'sine', from: FROM, to: TO, sweep: SWEEP, decay: 1.5, gain: 1, ...osc } },
        { time: 0, gain: 1, dry, wet: null, echo: false },
      );
      const buf = await ctx.startRendering();
      return buf.getChannelData(0);
    };

    /** The new master tune belongs on the drum entry, outside each source section. */
    const renderTunedDrum = async (tune) => {
      const ctx = new OfflineAudioContext(1, Math.round(SR * 0.7), SR);
      const rack = new VoiceRack(ctx);
      const dry = ctx.createGain();
      dry.connect(ctx.destination);
      rack._playDrum(
        { kind: 'drum', tune,
          osc: { type: 'sine', from: FROM, to: TO, sweep: SWEEP, decay: 1.5, gain: 1 } },
        { time: 0, gain: 1, dry, wet: null, echo: false },
      );
      const buf = await ctx.startRendering();
      return buf.getChannelData(0);
    };

    /** The same question on the melodic path: a game-synth note bent ONTO its pitch. */
    const renderGame = async (pitch) => {
      const ctx = new OfflineAudioContext(1, Math.round(SR * 0.7), SR);
      const rack = new VoiceRack(ctx);
      const dry = ctx.createGain();
      dry.connect(ctx.destination);
      rack._playGame(
        // +36 semitones is three octaves above the written note, so the note starts at
        // FROM and arrives at TO — the same interval as the drum case, stated the way a
        // melodic preset states it now: an envelope, in semitones, on `.detune`.
        { synth: 'KNDO-5',
          waveform: 'sine',
          attack: 0.002,
          release: 0.05,
          pitch: { semitones: 36, decay: SWEEP, sustain: 0, ...pitch } },
        { freq: TO, time: 0, dur: 0.6, gain: 1, dry, wet: null, echo: false },
      );
      const buf = await ctx.startRendering();
      return buf.getChannelData(0);
    };

    const mid = SWEEP / 2;
    const want = {
      exp: Math.sqrt(FROM * TO),
      lin: (FROM + TO) / 2,
      snap: TO + (FROM - TO) * Math.exp(-2),
    };
    const near = (got, target, pct = 0.1) => Math.abs(got - target) <= target * pct;

    // ---- 1. each shape is where it says it is, halfway through --------------------
    const drum = {};
    for (const curve of ['exp', 'lin', 'snap']) {
      const pcm = await renderDrum({ pitchCurve: curve });
      drum[curve] = freqAt(pcm, mid);
      say(near(drum[curve], want[curve]),
        `drum ${curve}: ${Math.round(drum[curve])} Hz halfway through a ${FROM}→${TO} sweep`
        + ` (want ~${Math.round(want[curve])})`);
      // And every shape ARRIVES. `snap` is the one that could fail this: setTargetAtTime
      // approaches its target forever, so the engine plants the value at the end.
      const arrived = freqAt(pcm, SWEEP + 0.1);
      say(near(arrived, TO, 0.05), `drum ${curve}: lands on ${TO} Hz by the end of the sweep`
        + ` (${Math.round(arrived)} Hz)`);
    }

    // ---- 2. and they are three different sounds, in the right order ---------------
    //
    // Falling, `lin` is the one still up high — half the HERTZ is only a third of the
    // octaves — and `snap` is the one already down. If these ever come out equal the
    // pill is decorative.
    say(drum.snap < drum.exp && drum.exp < drum.lin,
      `falling, snap ${Math.round(drum.snap)} < exp ${Math.round(drum.exp)}`
      + ` < lin ${Math.round(drum.lin)} Hz`);

    // ---- 3. a preset that names no curve renders as it always did -----------------
    //
    // The whole catalogue is in this case, and the null test's baselines depend on it.
    const bare = freqAt(await renderDrum({}), mid);
    say(near(bare, drum.exp, 0.02),
      `naming no curve is exponential — ${Math.round(bare)} Hz against exp's ${Math.round(drum.exp)}`);
    const nonsense = freqAt(await renderDrum({ pitchCurve: 'wobble' }), mid);
    say(near(nonsense, drum.exp, 0.02),
      'and so is a curve nobody implemented, rather than no sweep at all');

    // ---- 4. master Drum Tune is neutral at zero and doubles pitched sources at +12 --
    const legacy = await renderTunedDrum(undefined);
    const zero = await renderTunedDrum(0);
    let zeroDiff = 0;
    for (let i = 0; i < legacy.length; i++) zeroDiff = Math.max(zeroDiff,
      Math.abs(legacy[i] - zero[i]));
    say(zeroDiff < 1e-7,
      `Drum Tune 0 is render-identical to an omitted Tune (max diff ${zeroDiff.toExponential(2)})`);
    const baseTune = freqAt(legacy, 0.04, 0.025);
    const octave = freqAt(await renderTunedDrum(12), 0.04, 0.025);
    say(near(octave, baseTune * 2, 0.08),
      `Drum Tune +12 doubles the pitched source (${Math.round(baseTune)} → ${Math.round(octave)} Hz)`);

    // ---- 5. the melodic path's bend is an ENVELOPE, and still the exponential shape --
    //
    // The pitch envelope writes CENTS on `.detune`, and linear in cents is exponential in
    // hertz — so the melodic bend has exactly one shape and it is the one every preset
    // written before it rendered as. That equivalence is the whole claim of the rename:
    // `sweep`/`sweepTime`/`sweepCurve` became `pitch.{semitones,decay,…}` without moving
    // a sample of what the catalogue plays. The three-way pill is gone WITH the ramp, and
    // the drum path above still owns all three for the pitch drops that need them.
    const bent = freqAt(await renderGame({}), mid);
    say(near(bent, want.exp),
      `game synth: ${Math.round(bent)} Hz halfway through a ${FROM}→${TO} bend`
      + ` (want ~${Math.round(want.exp)} — the exponential shape, in cents)`);
    const landed = freqAt(await renderGame({}), SWEEP + 0.1);
    say(near(landed, TO, 0.05),
      `game synth: lands on its written ${TO} Hz once the envelope has fallen`
      + ` (${Math.round(landed)} Hz)`);
    // A sustain holds the bend OFF the note — an envelope can do what the old single ramp
    // could not say at all, which is the reason for the shape rather than a side effect.
    const held = freqAt(await renderGame({ sustain: 0.5 }), SWEEP + 0.1);
    say(held > TO * 1.5,
      `game synth: a sustaining pitch envelope stays off the note (${Math.round(held)} Hz`
      + ` against ${TO})`);
    // And no bend at all is the note, flat — the default every preset in the catalogue is.
    const flat = freqAt(await renderGame({ semitones: 0 }), mid);
    say(near(flat, TO, 0.05),
      `game synth: no AMOUNT is the written note throughout (${Math.round(flat)} Hz)`);

    return said;
  }, { FROM, TO, SWEEP });

  for (const r of out) assert(r.ok, r.msg);
  await browser.close();

  if (errors.length) assert(false, `page errors: ${errors.join('; ')}`);

  let failed = 0;
  for (const r of results) {
    if (r.ok) console.log(`ok: ${r.msg}`);
    else { console.error(`FAIL: ${r.msg}`); failed++; }
  }
  console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(`FAIL: ${e.message}`); process.exit(1); });
