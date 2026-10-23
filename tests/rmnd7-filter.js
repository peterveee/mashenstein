/**
 * RMND-7'S OPTIONAL FILTER AND PITCH ENVELOPE.
 *
 * Tone's FMSynth and AMSynth carry no filter, so the engine builds a native biquad cascade
 * behind the synth and sweeps it on the same per-slot envelope CRLS-1's filter rides
 * (`buildSpec` / `_addSlot` in src/engine/voices.js). Both live on KNDO-5's keys — `filter`
 * with KEY FOLLOW and an `env` with curves (TNGR-2's shape), `pitch` with AMOUNT and curves —
 * at the top of the voice, never inside Tone's `options`. The filter switches on like
 * KNDO-5's: absent from the preset until it is, so shipped presets build no node. Checked:
 *
 *   1. the spec: nothing reaches Tone's class, the cascade and both envelopes are read
 *      from the voice-level keys with the cards' defaults;
 *   2. the panel: Filter is the optional section with KEY FOLLOW, Filter Env disables rather
 *      than hides and carries curve pills, Pitch Env is there, and the board keeps CRLS-1's
 *      five columns with the filter on or off;
 *   3. rendered in a real OfflineAudioContext: a closed filter darkens the FM tone, ENV
 *      AMOUNT opens it at the strike and DECAY closes it back, KEY FOLLOW opens it for a
 *      higher note, and the pitch envelope starts the note an octave up and lands on it.
 */
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { isDeepStrictEqual } from 'util';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const { VoiceRack } = await import('../src/engine/voices.js');

// ---- 1. the spec -----------------------------------------------------------------
const base = {
  harmonicity: 2, modulationIndex: 6,
  oscillator: { type: 'sine' }, modulation: { type: 'square' },
  envelope: { attack: 0.001, decay: 0.01, sustain: 1, release: 0.05 },
  modulationEnvelope: { attack: 0.001, decay: 0.3, sustain: 1, release: 0.05 },
};
const plain = VoiceRack.buildSpec({ synth: 'RMND-7', options: base });
assert(plain.nativeFilter === null && plain.fenv === null && plain.penv === null,
  'an RMND-7 preset without the keys builds no filter and no envelopes');
const filtered = VoiceRack.buildSpec({ synth: 'RMND-7', options: base,
  filter: { type: 'lowpass', slope: -24, freq: 400, Q: 3, track: 0.5, env: { octaves: 2, decay: 0.3, decayCurve: 'exponential' } },
  pitch: { semitones: 12, decay: 0.2 } });
assert(isDeepStrictEqual(filtered.opts, plain.opts), 'nothing reaches the bag Tone\'s class is built from');
assert(isDeepStrictEqual(filtered.nativeFilter, { type: 'lowpass', stages: 2, freq: 400, Q: 3, track: 0.5 }),
  `TYPE, SLOPE, CUTOFF, RESONANCE and KEY FOLLOW describe the cascade (${JSON.stringify(filtered.nativeFilter)})`);
assert(filtered.fenv?.cents === 2400 && filtered.fenv.decay === 0.3 && filtered.fenv.sustain === 0
  && filtered.fenv.decayCurve === 'exp' && filtered.fenv.attackCurve === 'lin',
  'the filter envelope: ENV AMOUNT in cents, the card\'s defaults, the curve pills honoured');
assert(filtered.penv?.cents === 1200 && filtered.penv.attack === 0 && filtered.penv.decay === 0.2,
  'the pitch envelope: AMOUNT in cents, attack zero by default');
const crls = VoiceRack.buildSpec({ synth: 'CRLS-1', options: { filter: { type: 'lowpass' },
  filterEnvelope: { baseFrequency: 300, octaves: 2 } } });
assert(crls.fenv?.octaves === 2 && crls.fenv.cents === 2400 && crls.penv === null,
  'CRLS-1 is unchanged: its envelope still says octaves, now with the span in cents beside it');

// ---- 2. the panel ----------------------------------------------------------------
const { fullLayout, panelSpec, stripPanelSpec } = await import('../tools/mixer-voice-editor.js');
const off = { kind: 'tone', synth: 'RMND-7', options: structuredClone(base) };
const on = { ...structuredClone(off), filter: { type: 'highpass', slope: -12, freq: 900, Q: 2.5, track: 1, env: { octaves: -1.5 } } };
const groups = panelSpec(on).groups;
const filterCard = groups.find((g) => g.key === 'filter');
const envCard = groups.find((g) => g.key === 'filterenv');
const pitchCard = groups.find((g) => g.key === 'pitchenv');
assert(filterCard?.optional === 'filter' && filterCard.rows.some((r) => r.label === 'KEY FOLLOW'),
  'the Filter card is the optional section and carries KEY FOLLOW');
assert(typeof envCard?.bodyWhen === 'function' && !envCard.when
  && ['ATK', 'DEC', 'REL'].every((l) => envCard.rows.some((r) => r.label === l)),
  'Filter Env disables rather than hides, and ends on the three curve pills');
assert(pitchCard?.rows.some((r) => r.path === '$pitch.semitones'), 'Pitch Env is on the board');
assert(fullLayout(on).bands[0].cols === 5 && fullLayout(off).bands[0].cols === 5,
  'the Advanced board keeps five columns with the filter on or off');
const simpleOn = stripPanelSpec(on).groups[0].rows.map((r) => r.label);
const simpleOff = stripPanelSpec(off).groups[0].rows.map((r) => r.label);
assert(simpleOn.includes('CUTOFF') && simpleOn.includes('RESONANCE') && !simpleOff.includes('CUTOFF'),
  'Simple gets CUTOFF and RESONANCE only when the preset carries a filter');

// ---- 3. the sound ----------------------------------------------------------------
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

const fe = { attack: 0.001, decay: 0.3, sustain: 0, release: 0.05 };
const lp = { type: 'lowpass', Q: 0.7, slope: -24, freq: 250 };
const sine = { ...base, modulationIndex: 0, modulation: { type: 'sine' } };
const presets = {
  plain: { synth: 'RMND-7', kind: 'tone', options: base },
  closed: { synth: 'RMND-7', kind: 'tone', options: base, filter: { ...lp, env: { octaves: 0, ...fe } } },
  swept: { synth: 'RMND-7', kind: 'tone', options: base, filter: { ...lp, env: { octaves: 4, ...fe } } },
  tracked: { synth: 'RMND-7', kind: 'tone', options: base, filter: { ...lp, track: 1, env: { octaves: 0, ...fe } }, note: 440 },
  level: { synth: 'RMND-7', kind: 'tone', options: sine },
  bent: { synth: 'RMND-7', kind: 'tone', options: sine, pitch: { semitones: 12, attack: 0, decay: 0.25, sustain: 0, release: 0.05 } },
  // AM at a 5.5 Hz tremolo (RATIO 0, FINE 50 on a 110 Hz note): the carrier's level swings
  // between 1 − depth and 1, so the trough-to-crest ratio over the sustain IS 1 − depth.
  ...Object.fromEntries([2, 1, 0.5, 0, undefined].map((d) => [`am${d}`, { synth: 'RMND-7', kind: 'tone', ...(d === undefined ? {} : { amDepth: d }),
    options: { ...Object.fromEntries(Object.entries(sine).filter(([k]) => k !== 'modulationIndex')),
      harmonicity: 0.05, modulationEnvelope: { attack: 0.001, decay: 0.01, sustain: 1, release: 0.05 } } }])),
};
const res = await page.evaluate(async (presets) => {
  const out = {};
  for (const [name, p] of Object.entries(presets)) {
    const RATE = 44100; const ctx = new OfflineAudioContext(1, RATE, RATE);
    const dry = ctx.createGain(); dry.connect(ctx.destination);
    const { note = 110, ...voice } = p;
    const rack = new window.__VR(ctx); window.__V.__rf = { ...voice, id: '__rf' };
    rack.play('bass', '__rf', note, { time: 0.02, dur: 0.8, gain: 0.5, dry, wet: null, echo: false });
    const x = (await ctx.startRendering()).getChannelData(0);
    const F = 882; const c = []; const zc = []; let peak = 0;
    for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
    for (let s = Math.round(0.02 * RATE); s + F < Math.round(0.8 * RATE); s += F) {
      let num = 0, den = 0;
      for (let f = note; f < 8000; f += note) { let re = 0, im = 0; for (let i = 0; i < F; i++) { const ph = 2 * Math.PI * f * i / RATE; re += x[s + i] * Math.cos(ph); im -= x[s + i] * Math.sin(ph); } const m = re * re + im * im; num += Math.log2(f) * m; den += m; }
      c.push(den > 0 ? num / den : 0);
    }
    // Zero crossings: a pure sine's pitch, in hertz, is half of them per second. The head
    // is the 40 ms after the strike, the tail the 300 ms before the release.
    const hz = (from, to) => { let z = 0; const a = Math.round(from * RATE); const b = Math.round(to * RATE); for (let i = a + 1; i < b; i++) if ((x[i] >= 0) !== (x[i - 1] >= 0)) z++; return z / 2 / (to - from); };
    zc.push(hz(0.02, 0.06), hz(0.45, 0.75));
    // The level envelope over the sustain, in 10 ms peaks: its trough against its crest.
    let lo = Infinity, hi = 0;
    for (let a = Math.round(0.3 * RATE); a + 441 < Math.round(0.8 * RATE); a += 441) {
      let pk = 0; for (let i = a; i < a + 441; i++) pk = Math.max(pk, Math.abs(x[i]));
      lo = Math.min(lo, pk); hi = Math.max(hi, pk);
    }
    // How much of the sustain's energy sits OFF the 110 Hz carrier line: a 0.5 s window
    // resolves 2 Hz, so a sideband 5.5 Hz away is a separate bin from the carrier.
    let onLine = 0, total = 0;
    { const a = Math.round(0.3 * RATE); const N = Math.round(0.5 * RATE);
      const bin = (f) => { let re = 0, im = 0; for (let i = 0; i < N; i++) { const ph = 2 * Math.PI * f * i / RATE; re += x[a + i] * Math.cos(ph); im -= x[a + i] * Math.sin(ph); } return re * re + im * im; };
      for (let f = 90; f <= 130; f += 2) { const m = bin(f); total += m; if (f === 110) onLine = m; } }
    out[name] = { c, zc, peak, swing: hi > 0 ? lo / hi : 1, sideband: total > 0 ? 1 - onLine / total : 0 };
  }
  return out;
}, presets);
await browser.close();
for (const e of errors) fail(`page error: ${e}`);
const { plain: P, closed: C, swept: S, tracked: T, level: L, bent: B } = res;
assert([P, C, S, T, L, B].every((r) => r.peak > 0.02), `all six render sound (peaks ${[P, C, S, T, L, B].map((r) => r.peak.toFixed(3)).join(' / ')})`);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
assert(mean(P.c) - mean(C.c) > 0.5,
  `a closed low-pass darkens the FM tone (${(mean(P.c) - mean(C.c)).toFixed(2)} octaves of brightness lost)`);
const early = S.c[0] - C.c[0];
const late = Math.abs(S.c[S.c.length - 1] - C.c[C.c.length - 1]);
assert(early > 0.5, `ENV AMOUNT opens the filter at the strike (+${early.toFixed(2)} octaves over the closed one)`);
assert(late < 0.15, `and DECAY to SUSTAIN 0 closes it back (${late.toFixed(2)} octaves apart at the end)`);
// KEY FOLLOW 1 at 440 Hz lifts a 250 Hz cutoff two octaves, to 1 kHz: against the note's
// own harmonics that is a plainly brighter tone than the same cascade left at 250 Hz on
// the same note — which the closed preset played at 440 Hz would be. Here the comparison
// is relative to the fundamental: at 110 Hz the cutoff sits 1.2 octaves above the note,
// at 440 Hz with KEY FOLLOW it sits 1.2 octaves above the note again, so the brightness in
// octaves-over-the-fundamental should match within a fraction of an octave, where without
// key follow the 440 Hz note would be nearly a whole octave darker.
const rel = (r, note) => mean(r.c) - Math.log2(note);
assert(Math.abs(rel(T, 440) - rel(C, 110)) < 0.35,
  `KEY FOLLOW keeps the cutoff the same interval above the note (${rel(T, 440).toFixed(2)} vs ${rel(C, 110).toFixed(2)} octaves over the fundamental)`);
// The pitch envelope: an octave up at the strike, on the note by the end of the decay.
const [z0, zEnd] = B.zc; const zRef = L.zc[1];
assert(z0 > 180 && z0 < 240, `the bent note starts near an octave up (${z0.toFixed(0)} Hz in the first 40 ms after the strike)`);
assert(Math.abs(zEnd - zRef) < 8, `and lands on the written note (${zEnd.toFixed(0)} Hz against ${zRef.toFixed(0)} unbent)`);
// Depth 2 is ring modulation: carrier × modulator, two troughs per tremolo cycle, and the
// carrier itself gone — on a sine carrier at 110 Hz that is energy at 104.5 and 115.5 Hz and
// none at 110, which the 110 Hz harmonic series the centroid is taken over cannot see, so it
// shows as near-silence against the depth-1 render's full 110 Hz line.
for (const [d, lo, hi] of [[2, 0, 0.15], [1, 0, 0.15], [0.5, 0.4, 0.6], [0, 0.9, 1.01]]) {
  const sw = res[`am${d}`].swing;
  assert(sw >= lo && sw <= hi, `AM DEPTH ${d} swings the carrier between ${(1 - d).toFixed(1)} and 1 (trough/crest ${sw.toFixed(2)})`);
}
// A preset without the key is Tone's own AM: a −10 dB modulator through AudioToGain, which
// swings the carrier between 0.34 and 0.66 of itself — trough/crest 0.52 — at the same crest.
const ringCrest = res.am2.peak; const amCrest = res.am1.peak;
assert(Math.abs(ringCrest - amCrest) < 0.01 && res.am2.sideband > 0.9 && res.am1.sideband < 0.8,
  `depth 2 is ring modulation: the same crest (${ringCrest.toFixed(3)} vs ${amCrest.toFixed(3)}), the carrier gone (${(res.am2.sideband * 100).toFixed(0)}% of the energy off 110 Hz, against ${(res.am1.sideband * 100).toFixed(0)}% at depth 1)`);
const tone = res.amundefined;
assert(tone.swing > 0.48 && tone.swing < 0.56 && Math.abs(tone.peak - res.am1.peak) < 0.01,
  `without the key the AM is exactly what Tone did (trough/crest ${tone.swing.toFixed(2)}, crest ${tone.peak.toFixed(3)} vs ${res.am1.peak.toFixed(3)} at depth 1)`);
console.log(failed ? `RMND-7 FILTER: ${failed} FAILED` : 'RMND-7 FILTER: PASSED');
process.exit(failed ? 1 : 0);
