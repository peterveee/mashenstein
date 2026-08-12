// BAR EFFECTS AND FREEZE ARE BOTH ROUTING FEATURES, SO TEST THE SAMPLES.
//
// A bar effect selects a prebuilt input branch. The branch must stop receiving new
// notes at the next bar without disconnecting its output, or an echo whose repeat falls
// over the bar line is cut off. Freeze takes the other route into the same strip: PCM
// replaces the source lane before the live fader, so source notes do not double and the
// ordinary channel level remains editable.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import { createMixer } from ${JSON.stringify(join(ROOT, 'src/engine/mixer.js'))};
import { renderBankPage } from ${JSON.stringify(join(ROOT, 'tools/lib/render-bank-page.js'))};
window.__Audio = Audio;
window.__createMixer = createMixer;
window.__renderBankPage = renderBankPage;
`;

let failed = false;
const assert = (ok, message) => {
  if (ok) console.log(`ok: ${message}`);
  else { console.error(`FAIL: ${message}`); failed = true; }
};
const close = (a, b, tolerance = 0.03) => Math.abs(a - b) <= Math.max(a, b, 1e-9) * tolerance;

const { chromium } = require('playwright');
const esbuild = require('esbuild');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const bundle = built.outputFiles[0].text;
const browser = await chromium.launch({ headless: true });
const errors = [];

async function effectSleepLifecycle() {
  const page = await browser.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setContent('<!doctype html><meta charset="utf-8">'
    + `<script>${bundle.replace(/<\/script>/gi, '<\\/script>')}<\/script>`, { waitUntil: 'load' });
  const result = await page.evaluate(async () => {
    const ctx = new AudioContext();
    const musicBus = ctx.createGain();
    const echoBus = ctx.createGain();
    const songTrim = ctx.createGain();
    const master = ctx.createGain();
    musicBus.connect(songTrim); echoBus.connect(songTrim);
    songTrim.connect(master); master.connect(ctx.destination);
    const mixer = window.__createMixer(ctx, {
      musicBus, echoBus, songTrim, master, destination: ctx.destination,
    });
    await ctx.resume();
    const strip = mixer.ensureLane('__effect_sleep_test');
    strip.setEffects([{ id: 'filter', params: { frequency: 1200, Q: 1 } }], 120);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const trackSlept = !strip.effectsAwake;
    strip.wakeEffects(ctx.currentTime + 0.15);
    const trackWoke = strip.effectsAwake;
    await new Promise((resolve) => setTimeout(resolve, 80));
    const trackHeld = strip.effectsAwake;
    await new Promise((resolve) => setTimeout(resolve, 450));
    const trackSleptAgain = !strip.effectsAwake;

    const barChain = [{ id: 'delay', params: {
      sync: 0, delayMs: 300, feedback: 0.5, wet: 1,
    } }];
    strip.prepareBarEffects([barChain], 120);
    await new Promise((resolve) => setTimeout(resolve, 900));
    const barSlot = strip._barFxSlots[0];
    const barStartedAsleep = !barSlot.awake;
    strip.scheduleBarEffects(barChain, ctx.currentTime + 0.03);
    const barWoke = barSlot.awake;
    strip.scheduleBarEffects([], ctx.currentTime + 0.08);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const delayGapKeptAwake = barSlot.awake;
    await new Promise((resolve) => setTimeout(resolve, 650));
    const barSleptAfterTail = !barSlot.awake;
    mixer.reset();
    const oldBarGraphsCleared = strip._barFxSlots.length === 0;
    await ctx.close();
    return {
      trackSlept, trackWoke, trackHeld, trackSleptAgain,
      barStartedAsleep, barWoke, delayGapKeptAwake, barSleptAfterTail, oldBarGraphsCleared,
    };
  });
  await page.close();
  return result;
}

async function freshContextRecovery() {
  const page = await browser.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setContent('<!doctype html><meta charset="utf-8">'
    + `<script>${bundle.replace(/<\/script>/gi, '<\\/script>')}<\/script>`, { waitUntil: 'load' });
  const result = await page.evaluate(async () => {
    const Audio = window.__Audio;
    const notes = new Array(32).fill(null); notes[0] = 220; notes[16] = 330;
    const bank = { bpm: 123, bass: notes, bassGain: 0.2,
      sections: [{ bass: notes }], order: [0] };
    const mix = { lanes: { bass: { gain: -3, pan: 0.2, mute: false,
      noteFx: { arp: { enabled: true, rate: 0.5, direction: 'up', octaves: 1 } } } } };
    const arrangement = { order: [{ s: 0, bars: 2 }], bpm: 127, swing: 58 };
    Audio.setCaptureEnabled(false);
    Audio.ensure();
    await Audio.ctx.resume();
    Audio.setBank(bank, mix, arrangement);
    Audio.step = 23;
    Audio.setLoop(16, 32, { jump: false });
    Audio.pendingStep = { step: 27, at: 32 };
    Audio.expectOutput(Audio.ctx.currentTime, 0.5);
    const pcm = new Float32Array(256); pcm[0] = 0.1;
    Audio.setFrozenLane('bass', { left: pcm, right: pcm, sampleRate: Audio.ctx.sampleRate,
      originStep: 16, segmentStartStep: 16, formSteps: 32 });
    const frozenBefore = Audio.frozenLanes.get('bass');
    const old = Audio.ctx;
    const recovered = await Audio.rebuildRealtimeContext();
    const out = {
      recovered,
      fresh: Audio.ctx !== old,
      oldClosed: old.state === 'closed',
      source: Audio.sourceBank === bank,
      mix: Audio.mixEntry === mix,
      arrangement: Audio.arrangement === arrangement,
      step: Audio.step,
      loopStart: Audio.loopStart,
      loopEnd: Audio.loopEnd,
      pendingStep: Audio.pendingStep?.step,
      frozen: Audio.frozenLanes.get('bass') === frozenBefore,
      expectedReset: !Audio.outputExpected(),
      laneRestored: !!Audio.mixer?.lane('bass'),
      transportResolution: Audio.transportResolution,
    };
    await Audio.ctx.close();
    return out;
  });
  await page.close();
  return result;
}

async function render(config) {
  const page = await browser.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setContent('<!doctype html><meta charset="utf-8">'
    + `<script>${bundle.replace(/<\/script>/gi, '<\\/script>')}<\/script>`, { waitUntil: 'load' });
  const result = await page.evaluate(async (cfg) => {
    const Audio = window.__Audio;
    const SR = 44100;
    const BPM = 120;
    if (cfg.kind === 'range-render') {
      const rest = () => new Array(32).fill(null);
      const active = rest(); active[16] = 220;
      const bank = { bpm: BPM, musicTrim: 1, bassGain: 0.2, bassType: 'square',
        sections: [{ bass: rest() }, { bass: rest() }, { bass: active }, { bass: rest() }],
        order: [0, 1, 2, 3] };
      const out = await window.__renderBankPage({
        bank, blocks: 4, steps: 32, startStep: 64, tail: 2, seed: 1,
        sampleRate: SR, mix: { lanes: { bass: { gain: 0, pan: 0, mute: false } } },
        trackId: 'range-test', arrangement: null, rawLane: true, upfront: true,
      });
      const L = out.outL;
      let sum = 0;
      for (let i = Math.floor(2.01 * SR); i < Math.floor(2.09 * SR); i++) sum += L[i] * L[i];
      return { seconds: out.seconds, note: Math.sqrt(sum / Math.floor(0.08 * SR)) };
    }
    const seconds = cfg.kind === 'bars' ? 6
      : cfg.kind === 'segment' ? 8.5 : cfg.kind === 'partial' ? 6.25 : 2.25;
    const rest = () => new Array(16).fill(null);
    const lengths = () => new Array(16).fill(null);
    let bank;
    let mix;
    let steps;

    if (cfg.kind === 'bars') {
      const first = rest(); const firstLen = lengths();
      const effected = rest(); const effectedLen = lengths();
      const later = rest(); const laterLen = lengths();
      first[4] = 220; firstLen[4] = 0.5;          // 0.5s, direct
      effected[12] = 220; effectedLen[12] = 0.5; // 3.5s, delayed to 4.2s
      later[8] = 220; laterLen[8] = 0.5;          // 5.0s, direct again
      const middle = { s: 1, bars: 1 };
      if (cfg.effect) middle.inlineFx = { bass: [{
        id: 'delay', params: { sync: 0, delayMs: 700, feedback: 0, wet: 1 },
      }] };
      bank = {
        bpm: BPM, bassGain: 0.2, bassType: 'square',
        sections: [
          { bass: first, bassLen: firstLen },
          { bass: effected, bassLen: effectedLen },
          { bass: later, bassLen: laterLen },
        ],
        order: [{ s: 0, bars: 1 }, middle, { s: 2, bars: 1 }],
      };
      mix = { lanes: { bass: { gain: 0, pan: 0, mute: false } } };
      steps = 48;
    } else if (cfg.kind === 'segment') {
      const notes = new Array(32).fill(null); const lens = new Array(32).fill(null);
      notes[16] = 220; lens[16] = 1;
      bank = { bpm: BPM, bass: notes, bassLen: lens, bassGain: 0.2, bassType: 'square',
        order: [{ s: 0, bars: 2 }] };
      mix = { lanes: { bass: { gain: 0, pan: 0, mute: false } } };
      steps = 64;
    } else if (cfg.kind === 'partial') {
      const section = () => {
        const bass = rest(); const bassLen = lengths();
        bass[0] = 220; bassLen[0] = 1;
        return { bass, bassLen };
      };
      bank = { bpm: BPM, bassGain: 0.2, bassType: 'square',
        sections: [section(), section(), section()], order: [0, 1, 2] };
      mix = { lanes: { bass: { gain: 0, pan: 0, mute: false } } };
      steps = 48;
    } else {
      const notes = rest(); const lens = lengths();
      notes[0] = 220; lens[0] = 1;
      bank = { bpm: BPM, bass: notes, bassLen: lens, bassGain: 0.2, bassType: 'square',
        order: [{ s: 0, bars: 1 }] };
      mix = { lanes: { bass: { gain: cfg.gain, pan: 0, mute: false } } };
      steps = 16;
    }

    const ctx = new OfflineAudioContext(2, Math.ceil(SR * seconds), SR);
    Audio.setCaptureEnabled(false);
    Audio.setNoiseSeed(1);
    Audio.ensure(ctx);
    if (Audio.mixer) await Audio.mixer.ready;
    Audio.setBank(bank, mix);
    if (cfg.kind === 'freeze' || cfg.kind === 'segment' || cfg.kind === 'partial') {
      const seconds = cfg.kind === 'segment' ? 2.5 : 2;
      const left = new Float32Array(SR * seconds);
      const right = new Float32Array(SR * seconds);
      for (let i = Math.floor(SR * 0.25); i < Math.floor(SR * 0.35); i++) {
        left[i] = right[i] = 0.05 * Math.sin(2 * Math.PI * 220 * i / SR);
      }
      if (cfg.kind === 'segment') {
        for (let i = Math.floor(SR * 2.1); i < Math.floor(SR * 2.2); i++) {
          left[i] = right[i] = 0.04 * Math.sin(2 * Math.PI * 330 * i / SR);
        }
      }
      const frozen = { left, right, sampleRate: SR,
        originStep: cfg.kind === 'segment' || cfg.kind === 'partial' ? 16 : 0,
        segmentStartStep: cfg.kind === 'segment' || cfg.kind === 'partial' ? 16 : null,
        formSteps: cfg.kind === 'partial' ? 48 : cfg.kind === 'segment' ? 32 : 16,
        ...(cfg.kind === 'partial' ? { coverageStartStep: 16, coverageEndStep: 32 } : {}) };
      Audio.setFrozenLane('bass', cfg.kind === 'partial' ? { segments: [frozen] } : frozen);
    }
    Audio.nextTime = 0;
    Audio.songTrim.gain.cancelScheduledValues(0);
    Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);
    for (let i = 0; i < steps; i++) Audio.scheduleStep();
    const rendered = await ctx.startRendering();
    const L = rendered.getChannelData(0);
    const R = rendered.getChannelData(1);
    const rms = (from, to) => {
      const a = Math.floor(from * SR); const b = Math.min(L.length, Math.floor(to * SR));
      let sum = 0;
      for (let i = a; i < b; i++) sum += L[i] * L[i] + R[i] * R[i];
      return Math.sqrt(sum / Math.max(1, (b - a) * 2));
    };
    return cfg.kind === 'bars'
      ? { first: rms(0.51, 0.59), tail: rms(4.19, 4.29), later: rms(5.01, 5.09) }
      : cfg.kind === 'segment'
        ? { before: rms(2.01, 2.08), first: rms(2.26, 2.34),
          wrappedTail: rms(4.11, 4.19), repeated: rms(6.26, 6.34) }
        : cfg.kind === 'partial'
          ? { before: rms(0.01, 0.08), replaced: rms(2.01, 2.08),
            pcm: rms(2.26, 2.34), after: rms(4.01, 4.08) }
      : { source: rms(0.01, 0.08), pcm: rms(0.26, 0.34) };
  }, config);
  await page.close();
  return result;
}

try {
  const lifecycle = await effectSleepLifecycle();
  assert(lifecycle.trackSlept && lifecycle.trackWoke && lifecycle.trackHeld
    && lifecycle.trackSleptAgain,
  'a silent whole-track insert disconnects, wakes ahead of a note, and sleeps again');
  assert(lifecycle.barStartedAsleep && lifecycle.barWoke && lifecycle.delayGapKeptAwake
    && lifecycle.barSleptAfterTail && lifecycle.oldBarGraphsCleared,
  `a bar-effect branch sleeps until selected and waits through its longest delay gap before sleeping (${JSON.stringify(lifecycle)})`);

  const recovery = await freshContextRecovery();
  assert(recovery.recovered && recovery.fresh && recovery.oldClosed,
    'dead-output recovery closes the failed AudioContext and creates a fresh one');
  assert(recovery.source && recovery.mix && recovery.arrangement && recovery.step === 23
    && recovery.loopStart === 16 && recovery.loopEnd === 32 && recovery.pendingStep === 27,
  `fresh-context recovery preserves the unsaved song state and transport (${JSON.stringify(recovery)})`);
  assert(recovery.frozen && recovery.expectedReset && recovery.laneRestored
    && recovery.transportResolution === 32,
    'fresh-context recovery retains frozen PCM, cached transport resolution, and rebuilt channel strips');

  const dry = await render({ kind: 'bars', effect: false });
  const bars = await render({ kind: 'bars', effect: true });
  assert(close(bars.first, dry.first), `a later bar effect does not alter the direct bar before it (${bars.first.toFixed(6)} vs ${dry.first.toFixed(6)})`);
  assert(bars.tail > Math.max(1e-4, dry.tail * 8),
    'a bar-only delay tail keeps sounding after the next bar selects the direct branch');
  assert(close(bars.later, dry.later), 'notes in the following direct bar bypass the prior bar effect');

  const live = await render({ kind: 'live', gain: 0 });
  const frozen = await render({ kind: 'freeze', gain: 0 });
  const frozenDown = await render({ kind: 'freeze', gain: -6 });
  assert(live.source > 1e-4 && frozen.source < live.source * 0.01,
    'frozen PCM replaces the authored synth lane instead of doubling it');
  assert(frozen.pcm > 1e-4, 'the frozen lane PCM reaches the ordinary channel strip');
  assert(Math.abs(frozenDown.pcm / frozen.pcm - 10 ** (-6 / 20)) < 0.03,
    'the live channel fader still controls a frozen lane');
  const segment = await render({ kind: 'segment', gain: 0 });
  assert(segment.before < 1e-5 && segment.first > 1e-4,
    'a ranged frozen buffer is silent before its original song step and starts at that step');
  assert(segment.wrappedTail > 1e-4,
    'a ranged frozen buffer keeps its release tail across the whole-form wrap');
  assert(segment.repeated > 1e-4,
    'a ranged frozen buffer repeats from its anchored step on the next song pass');
  const partial = await render({ kind: 'partial', gain: 0 });
  assert(partial.before > 1e-4 && partial.replaced < partial.before * 0.01,
    'a selected-bar freeze leaves the source live before its covered bars and replaces it inside them');
  assert(partial.pcm > 1e-4 && partial.after > 1e-4,
    'selected-bar PCM sounds in its range and the following bar returns to the live source');
  const ranged = await render({ kind: 'range-render' });
  assert(Math.abs(ranged.seconds - 6) < 0.01 && ranged.note > 1e-4,
    'the offline renderer starts at a late song step and emits only that short range plus release');
  assert(!errors.length, `the browser raised no processing errors${errors.length ? ` (${errors.join('; ')})` : ''}`);
} finally {
  await browser.close();
}

console.log(failed ? '\nSONG PROCESSING: FAILED' : '\nSONG PROCESSING: PASSED');
process.exit(failed ? 1 : 0);
