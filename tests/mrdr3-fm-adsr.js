/**
 * MRDR-3'S LAYER FM HAS A FULL ADSR, AND BOTH BACKENDS AGREE ON IT (23 Oct 2026).
 *
 * The layer FM envelope was attack and decay to nothing. It now has SUSTAIN and RELEASE
 * (`layer.oscN.fm.sustain` / `.release`, default 0 — the old strike-only shape), and the
 * desk shows RATIO + RATIO FINE and FM DEPTH on RMND-7's scales. Checked:
 *
 *   1. the panel: RATIO / RATIO FINE round-trip one stored ratio, FM DEPTH reads and writes
 *      in RMND-7's units over MRDR-3's stored number, and the ADSR is on a row of its own;
 *   2. the worklet core (the same source the AudioWorklet runs): SUSTAIN holds the FM
 *      brightness through the note where sustain 0 lets it fall, and the old shape is
 *      untouched when the new keys are absent;
 *   3. the native path — the one that ships — in a real OfflineAudioContext says the same;
 *   4. the Mod LFO's TARGET FM breathes the FM edge on both backends.
 */
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { compileMrdr3, mrdr3Colours } from '../src/engine/mrdr3/compile.js';
import { renderMrdr3, frameAt } from '../src/engine/mrdr3/dsp.js';
import { mrdr3Tables } from '../src/engine/mrdr3/tables.js';
import { mrdr3NoiseSet } from '../src/engine/mrdr3/noise.js';
import { VOICES } from '../src/data/voices.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

// ---- 1. the panel -----------------------------------------------------------------
const { panelSpec } = await import('../tools/mixer-voice-editor.js');
const voice = { kind: 'tone', synth: 'MRDR-3', layer: { osc1: { type: 'sine', fm: { type: 'sine', ratio: 7.152, index: 2, attack: 0.001, decay: 0.3 } } } };
const card = panelSpec(voice).groups.find((g) => g.key === 'osc1.fm');
const row = (label) => card?.rows.find((r) => r.label === label);
assert(row('RATIO')?.read(7.152) === 7 && row('RATIO FINE')?.read(7.152) === 152,
  'RATIO and RATIO FINE read 7 and 152 off a stored 7.152');
row('RATIO').write(9, voice);
row('RATIO FINE').write(5, voice);
assert(voice.layer.osc1.fm.ratio === 9.005, `and write it back one half at a time (${voice.layer.osc1.fm.ratio})`);
const depth = row('FM DEPTH');
assert(depth?.max === 100 && Math.abs(depth.read(1) - 3.162) < 0.01 && Math.abs(depth.write(10) - 3.162) < 0.01,
  'FM DEPTH is 0–100 in RMND-7\'s units: a stored 1 reads 3.16, and 10 stores 3.16');
assert(depth.read(depth.write(100)) <= 100 && depth.read(depth.write(0.1)) > 0,
  'FM DEPTH at the top of the pot reads back inside its range (no out-of-range asterisk)');
assert(['ATTACK', 'DECAY', 'SUSTAIN', 'RELEASE'].every((l) => row(l)) && row('ATTACK').startRow,
  'the FM card carries a full ADSR, starting a row of its own');

// ---- 2. the worklet core ----------------------------------------------------------
const SR = 44100;
const TABLES = mrdr3Tables();
const NOISE = mrdr3NoiseSet(SR, mrdr3Colours(VOICES));
const preset = (fm) => ({ id: 'x', synth: 'MRDR-3', layer: { osc1: { type: 'sine', ratio: 1, gain: 1, attack: 0.002, decay: 0.01, sustain: 1, release: 0.1, fm: { type: 'sine', ratio: 1, index: 3, attack: 0.002, decay: 0.15, ...fm } } } });
const core = (v) => renderMrdr3({
  events: [{ type: 'noteOn', frame: frameAt(0.05, SR), eventId: 1, hz: [220], durFrames: frameAt(0.8, SR), velocity: 1 }],
  seconds: 1.2, sampleRate: SR, channels: 1, patch: compileMrdr3(v).patch, tables: TABLES, noise: NOISE,
});
// Brightness: energy above the fundamental against all of it, over a window — FM puts
// energy in the sidebands, so a held FM edge reads high and a decayed one reads near 0.
const bright = (x, from, to) => {
  const a = Math.round(from * SR); const N = Math.round((to - from) * SR);
  const mag = (f) => { let re = 0, im = 0; for (let i = 0; i < N; i++) { const ph = 2 * Math.PI * f * i / SR; re += x[a + i] * Math.cos(ph); im -= x[a + i] * Math.sin(ph); } return re * re + im * im; };
  const fund = mag(220); let rest = 0; for (let k = 2; k <= 8; k++) rest += mag(220 * k);
  return rest / (fund + rest);
};
const ch = (r) => (r.channels ? r.channels[0] : r.outL || r[0]);
const cOld = ch(core(preset({})));
const cZero = ch(core(preset({ sustain: 0, release: 0 })));
const cHeld = ch(core(preset({ sustain: 0.6, release: 0.2 })));
let same = true; for (let i = 0; i < cOld.length; i++) if (cOld[i] !== cZero[i]) { same = false; break; }
assert(same, 'core: a preset without the new keys renders sample-identical to sustain 0, release 0');
const coreFell = bright(cZero, 0.5, 0.8); const coreHeld = bright(cHeld, 0.5, 0.8);
assert(coreFell < 0.02 && coreHeld > 0.1,
  `core: SUSTAIN holds the FM edge through the note (${(coreHeld * 100).toFixed(1)}% sideband energy late on, against ${(coreFell * 100).toFixed(1)}% at sustain 0)`);

// The Mod LFO aimed at FM: the FM edge rises and falls at the LFO's rate (2 Hz, DEPTH 1)
// on a sustained FM layer; aimed at FILTER on a patch with no filter, it moves nothing.
const lfoPreset = (target) => ({ ...preset({ sustain: 1, decay: 0.01 }),
  layer: { ...preset({ sustain: 1, decay: 0.01 }).layer, lfo: { type: 'sine', target, depth: 1, rate: 2 } } });
const swing = (x) => {
  const b = []; for (let w = 0.1; w + 0.05 <= 1.0; w += 0.05) b.push(bright(x, w, w + 0.05));
  return Math.max(...b) - Math.min(...b);
};
const longCore = (v) => ch(renderMrdr3({
  events: [{ type: 'noteOn', frame: frameAt(0.05, SR), eventId: 1, hz: [220], durFrames: frameAt(1.2, SR), velocity: 1 }],
  seconds: 1.3, sampleRate: SR, channels: 1, patch: compileMrdr3(v).patch, tables: TABLES, noise: NOISE,
}));
const cFm = swing(longCore(lfoPreset('fm'))); const cFl = swing(longCore(lfoPreset('filter')));
assert(cFm > 0.3 && cFl < 0.05,
  `core: LFO TARGET FM breathes the FM edge (brightness swings ${(cFm * 100).toFixed(0)} points; FILTER on a filterless patch ${(cFl * 100).toFixed(1)})`);

// ---- 3. the native path -------------------------------------------------------------
const esbuild = require('esbuild');
const { chromium } = require('playwright');
const js = (await esbuild.build({
  stdin: { contents: `import { VoiceRack } from ${JSON.stringify(join(ROOT, 'src/engine/voices.js'))}; import { VOICES } from ${JSON.stringify(join(ROOT, 'src/data/voices.js'))}; window.__VR = VoiceRack; window.__V = VOICES;`, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', write: false, logLevel: 'silent',
})).outputFiles[0].text;
const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setContent(`<!doctype html><meta charset=utf-8><script>${js.replace(/<\/script>/gi, '<\\/script>')}</scr` + 'ipt>');
const native = await page.evaluate(async (presets) => {
  const out = [];
  for (const p of presets) {
    const ctx = new OfflineAudioContext(1, Math.round(1.2 * 44100), 44100);
    const dry = ctx.createGain(); dry.connect(ctx.destination);
    const rack = new window.__VR(ctx); window.__V.__fa = { ...p, id: '__fa', kind: 'tone' };
    rack.play('bass', '__fa', 220, { time: 0.05, dur: 0.8, gain: 0.5, dry, wet: null, echo: false });
    out.push(Array.from((await ctx.startRendering()).getChannelData(0)));
  }
  return out;
}, [preset({ sustain: 0, release: 0 }), preset({ sustain: 0.6, release: 0.2 })]);
const nativeLfo = await page.evaluate(async (presets) => {
  const out = [];
  for (const p of presets) {
    const ctx = new OfflineAudioContext(1, Math.round(1.3 * 44100), 44100);
    const dry = ctx.createGain(); dry.connect(ctx.destination);
    const rack = new window.__VR(ctx); window.__V.__fl = { ...p, id: '__fl', kind: 'tone' };
    rack.play('bass', '__fl', 220, { time: 0.05, dur: 1.2, gain: 0.5, dry, wet: null, echo: false });
    out.push(Array.from((await ctx.startRendering()).getChannelData(0)));
  }
  return out;
}, [lfoPreset('fm'), lfoPreset('filter')]);
// The fixed PULSE modulator: rendered natively (the shipping path), finite, and a different
// spectrum from SQUARE — a 25% pulse carries the even harmonics a square has none of.
const waveOf = (type) => ({ ...preset({ sustain: 1, decay: 0.01 }),
  layer: { osc1: { ...preset({}).layer.osc1, fm: { ...preset({}).layer.osc1.fm, type, sustain: 1, decay: 0.01 } } } });
const nativeWaves = await page.evaluate(async (presets) => {
  const out = [];
  for (const p of presets) {
    const ctx = new OfflineAudioContext(1, Math.round(0.6 * 44100), 44100);
    const dry = ctx.createGain(); dry.connect(ctx.destination);
    const rack = new window.__VR(ctx); window.__V.__fw = { ...p, id: '__fw', kind: 'tone' };
    rack.play('bass', '__fw', 220, { time: 0.05, dur: 0.5, gain: 0.5, dry, wet: null, echo: false });
    out.push(Array.from((await ctx.startRendering()).getChannelData(0)));
  }
  return out;
}, [waveOf('pulse'), waveOf('square')]);
await browser.close();
for (const e of errors) fail(`page error: ${e}`);
const nFell = bright(native[0], 0.5, 0.8); const nHeld = bright(native[1], 0.5, 0.8);
assert(nFell < 0.02 && nHeld > 0.1,
  `native: SUSTAIN holds the FM edge too (${(nHeld * 100).toFixed(1)}% against ${(nFell * 100).toFixed(1)}%)`);
const nFm = swing(nativeLfo[0]); const nFl = swing(nativeLfo[1]);
assert(nFm > 0.3 && nFl < 0.05,
  `native: LFO TARGET FM breathes the FM edge too (${(nFm * 100).toFixed(0)} points; FILTER on a filterless patch ${(nFl * 100).toFixed(1)})`);
const [pls, sqr] = nativeWaves;
const finite = pls.every(Number.isFinite) && Math.max(...pls.map(Math.abs)) > 0.01;
let diff = 0; for (let i = 0; i < pls.length; i++) diff = Math.max(diff, Math.abs(pls[i] - sqr[i]));
assert(finite && diff > 0.01, `a PULSE modulator renders, finite and audibly not a square (largest sample difference ${diff.toFixed(3)})`);
assert(row('WAVE')?.options.join(' ') === 'sine square sawtooth triangle pulse',
  'the FM WAVE row offers the four native waves and PULSE beside TRIANGLE, and no PWM');
// NOT asserted: that the two hold it at the SAME brightness. They do not, and did not before
// SUSTAIN existed — the native path draws the FM envelope with `adsr` (decay clamped to the
// note), the dev-only worklet with the gate ADSR (decay runs its own length, a lifted
// attack), so a strike already measured 50% sideband energy native against 39% core. The
// worklet is the comparison scaffold (src/engine/mrdr3/identity.js); the native path ships.
console.log(`note: held brightness native ${(nHeld * 100).toFixed(1)}%, worklet core ${(coreHeld * 100).toFixed(1)}% — an older gap between the backends' FM envelope shapes`);
console.log(failed ? `MRDR-3 FM ADSR: ${failed} FAILED` : 'MRDR-3 FM ADSR: PASSED');
process.exit(failed ? 1 : 0);
