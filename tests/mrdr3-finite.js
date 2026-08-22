/*
 * The core never emits anything that is not a finite number.
 *
 * ---- why this is its own suite -----------------------------------------------------
 *
 * ONE NaN IS PERMANENT. A non-finite sample reaching a Web Audio graph silences everything
 * downstream of it for the rest of the session; Chromium does not recover, and neither
 * does the desk without its watchdog. So the failure does not sound like a bad note — it
 * sounds like the synth stopping, minutes later, for no reason anyone can point at. That
 * is what "the AW version cuts out completely now and then" was.
 *
 * It was two bugs, both in the oscillator loop, and both invisible to every other suite:
 *
 *   1. THE PHASE WRAP IS A SINGLE SUBTRACTION, which is only enough while the increment is
 *      under one cycle. At or above the sample rate the phase runs away and the table
 *      index leaves the table, and an out-of-range read on a Float64Array is `undefined`,
 *      which is NaN. Reached through a layer RATIO on an already high note: smw-title-2's
 *      lead5 carries C9 and E9, and syncRazorLead multiplies a note by 4.7 between its
 *      ratio and its pitch envelope.
 *
 *   2. THE MIP LEVEL IS CLAMPED BEFORE VIBRATO IS ADDED TO IT. mrdr3Level clamps to the
 *      top rung, but vibrato's level offset is SEPARATED — that is what made vibrato
 *      cheap — and is added at the read, after the clamp. A wobble on a note near the top
 *      of the pyramid then asks for rung 12 of twelve, and the crossfade reads off the
 *      end. Measured at level 11.00003, which is how small the overshoot has to be.
 *
 * Both are now clamped at the one place both quantities are formed, and clamping the
 * frequency to Nyquist is what an OscillatorNode does anyway — the specification clamps
 * that node's computed frequency to the same range, so this is native behaviour rather
 * than a guard bolted over a bug.
 *
 * The oracle cannot catch either: it pins the bytes of presets rendered at ORDINARY
 * pitches, and both faults need an extreme one. The parity suite cannot catch them either
 * — both hosts run the same string, so both produce the same NaN. Hence a suite whose only
 * question is whether every sample is a number.
 *
 * Browserless, and fast enough to keep in the default run.
 */
import { VOICES } from '../src/data/voices.js';
import { compileMrdr3, mrdr3Colours } from '../src/engine/mrdr3/compile.js';
import { renderMrdr3, frameAt } from '../src/engine/mrdr3/dsp.js';
import { mrdr3Tables } from '../src/engine/mrdr3/tables.js';
import { mrdr3NoiseSet } from '../src/engine/mrdr3/noise.js';
import { IMPORTED_BY_ID } from '../src/data/imported/index.js';

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const RATES = [48000, 44100];
const TABLES = mrdr3Tables();
const NOISE = {};
for (const r of RATES) NOISE[r] = mrdr3NoiseSet(r, mrdr3Colours(VOICES));

const subjects = Object.values(VOICES)
  .filter((v) => v.synth === 'MRDR-3')
  .map((v) => ({ id: v.id, ...compileMrdr3(v) }))
  .filter((r) => r.patch && !r.problems.length);

/** The first non-finite sample in a rendering, or -1. */
const firstBad = (patch, score, rate, seconds) => {
  const r = renderMrdr3({
    events: score.map((n, i) => ({
      type: 'noteOn', frame: frameAt(n.at, rate), eventId: i + 1, hz: n.hz,
      durFrames: frameAt(n.dur, rate), velocity: 0.8,
    })),
    seconds, sampleRate: rate, tables: TABLES, noise: NOISE[rate], patch,
  });
  for (const ch of r.channels) {
    for (let i = 0; i < ch.length; i++) if (!Number.isFinite(ch[i])) return i;
  }
  return -1;
};

// ---- the cases, each aimed at a division or an index ------------------------------
//
// "extreme pitch" is the one that found both bugs, and it is deliberately past anything
// musical: the point is that a LAYER RATIO or a pitch envelope multiplies whatever note it
// is handed, so the ceiling is reachable from ordinary notes and there is no pitch at
// which the core may stop returning numbers.
const CASES = {
  ordinary: [
    { at: 0.10, dur: 2.20, hz: 220 },
    { at: 2.50, dur: 1.20, hz: [220, 277.18, 329.63] },
  ],
  'legato chain': [
    { at: 0.05, dur: 0.30, hz: 110 }, { at: 0.30, dur: 0.30, hz: 880 },
    { at: 0.55, dur: 0.30, hz: 110 }, { at: 0.58, dur: 0.30, hz: 111 },
    { at: 0.60, dur: 0.30, hz: 110 }, { at: 1.50, dur: 1.00, hz: 55 },
  ],
  'degenerate durations': [
    { at: 0.10, dur: 0.0001, hz: 220 }, { at: 0.10, dur: 2.0, hz: 220 },
    { at: 0.10, dur: 2.0, hz: 220 }, { at: 1.0, dur: 0, hz: 440 },
  ],
  'extreme pitch': [
    { at: 0.05, dur: 0.55, hz: 0.5 }, { at: 0.65, dur: 0.55, hz: 21000 },
    { at: 1.25, dur: 0.55, hz: 1e-6 }, { at: 1.85, dur: 0.55, hz: 40000 },
  ],
  'pool overrun': Array.from({ length: 40 }, (_, i) => (
    { at: 0.05 + i * 0.03, dur: 3.0, hz: 110 * (1 + (i % 12)) })),
};

// EXTREME PITCH runs at both rates because the mip pyramid's rungs and the Nyquist ceiling
// are both rate-dependent, and that is the case that found the two bugs. The other four
// were clean even on the broken build, so they run at the desk's rate only — they are a
// regression net for future changes rather than a reproduction, and the suite has to stay
// fast enough to keep in the default run.
for (const [name, score] of Object.entries(CASES)) {
  const bad = [];
  const rates = name === 'extreme pitch' ? RATES : [44100];
  for (const s of subjects) {
    for (const rate of rates) {
      const at = firstBad(s.patch, score, rate, 2.5);
      if (at >= 0) bad.push(`${s.id}@${rate} frame ${at}`);
    }
  }
  assert(bad.length === 0,
    `${name}: every sample of every preset is a finite number`
    + (bad.length ? ` — ${bad.length} broke, first ${bad[0]}` : ''));
}

// ---- and the case that came from the songs -----------------------------------------
//
// Not a synthetic pitch: the actual notes of a real lane. This is the rendering that was
// silent from 5.69s, and naming the song here is the point — the ceiling is not an
// abstract limit, it is inside the material.
{
  const notes = [];
  for (const sec of IMPORTED_BY_ID['smw-title-2'].bank.sections) {
    if (sec && sec.lead5) for (const n of sec.lead5) if (n) notes.push(n);
  }
  assert(notes.length > 0 && Math.max(...notes) > 8000,
    `smw-title-2/lead5 still carries the high notes this guards (${notes.length} notes,`
    + ` top ${Math.max(...notes).toFixed(0)} Hz)`);

  const step = 0.12;
  // The high notes are what matters, so take the highest rather than the first.
  const worst = [...notes].sort((x, y) => y - x).slice(0, 20);
  const score = worst.map((hz, i) => ({ at: 0.05 + i * step, dur: step * 0.9, hz }));
  const bad = [];
  for (const s of subjects) {
    const at = firstBad(s.patch, score, 44100, 0.2 + worst.length * step);
    if (at >= 0) bad.push(`${s.id} from ${(at / 44100).toFixed(2)}s`);
  }
  assert(bad.length === 0,
    'every preset in the library survives that lane'
    + (bad.length ? ` — ${bad.length} go silent, first ${bad[0]}` : ''));
}

console.log(failed ? `\nMRDR-3 FINITE: ${failed} FAILED` : '\nMRDR-3 FINITE: OK');
process.exit(failed ? 1 : 0);
