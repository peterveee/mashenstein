/*
 * TNGR-2's DSP core, on its own — docs/TNGR-2-completion-spec.md §12.1.
 *
 * Browserless on purpose, and that is a claim rather than a convenience: the core takes
 * its sample rate as an argument and is handed the frame to render, so it depends on no
 * worklet global and no audio context. If this suite ever needs Chromium, the core has
 * grown a dependency it is not allowed to have.
 *
 * The parity between this core and the worklet running the SAME source is asserted
 * separately, in tests/tngr2-dsp-parity.js, which does need a browser.
 */
import {
  renderTngr2, Tngr2Core, Tngr2Voice, tngr2SeededPhase, frameAt, TNGR2_DEFAULT_ENV,
  compileTngr2Patch,
} from '../src/engine/tngr2/dsp.js';
import { packTngr2Tables } from '../src/engine/tngr2/tables.js';

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

const env = TNGR2_DEFAULT_ENV;
// A small catalogue: 'basic' at position 0.25 is a pure fundamental by construction (see
// families.js), which is what makes the pitch checks below readable, and 'sawForm' has
// the harmonic stack the mip and interpolation checks need.
const tables = packTngr2Tables(['basic', 'sawForm', 'crystal']);
// The patch carries the oscillators now; a note carries only what belongs to the note.
const patchWith = (over = {}) => ({
  mode: 'poly', glide: 0, amp: env, filter: { cutoff: 8000 },
  oscA: { table: 'basic', position: 0.25, level: 1, unison: 1 },
  ...over,
});
const patch = patchWith();
const noteOn = (id, at, hz, rate, extra = {}) => ({
  type: 'noteOn', frame: frameAt(at, rate), eventId: id, hz, velocity: 1, ...extra,
});
const noteOff = (id, at, rate) => ({ type: 'noteOff', frame: frameAt(at, rate), eventId: id });

const peak = (chs) => {
  let max = 0;
  for (const ch of chs) for (const s of ch) max = Math.max(max, Math.abs(s));
  return max;
};
const maxDiff = (a, b) => {
  let max = 0;
  for (let c = 0; c < a.length; c++) {
    for (let i = 0; i < a[c].length; i++) max = Math.max(max, Math.abs(a[c][i] - b[c][i]));
  }
  return max;
};
const rms = (chs, from, to, rate) => {
  let sum = 0;
  let n = 0;
  for (const ch of chs) {
    for (let i = Math.floor(from * rate); i < Math.min(ch.length, Math.floor(to * rate)); i++) {
      sum += ch[i] * ch[i];
      n++;
    }
  }
  return Math.sqrt(sum / Math.max(1, n));
};
const diff = (a, b) => {
  let max = 0;
  for (let c = 0; c < Math.min(a.length, b.length); c++) {
    for (let i = 0; i < Math.min(a[c].length, b[c].length); i++) {
      max = Math.max(max, Math.abs(a[c][i] - b[c][i]));
    }
  }
  return max;
};

// ---- it makes a sound, and only when it should ------------------------------
const RATE = 44100;
const basic = renderTngr2({ tables, patch,
  sampleRate: RATE, seconds: 1,
  events: [noteOn(1, 0.1, 220, RATE), noteOff(1, 0.5, RATE)],
});
assert(basic.channels.every((ch) => ch.every(Number.isFinite)), 'every rendered sample is finite');
assert(peak(basic.channels) > 0.1, `a note renders audibly (peak ${peak(basic.channels).toFixed(3)})`);
assert(rms(basic.channels, 0, 0.09, RATE) === 0, 'nothing sounds before the note is stamped to start');
assert(rms(basic.channels, 0.15, 0.45, RATE) > 0.05, 'the note sustains while it is held');
assert(rms(basic.channels, 0.9, 1.0, RATE) < 1e-5,
  'the note is gone once its release has run');

// ---- block size is not a time ------------------------------------------------
//
// The one bug this whole architecture is prone to: reading the block boundary as if it
// were the moment an event happens. Rendered at four different block sizes, including one
// that is not a divisor of anything, the samples must be identical.
const events = [noteOn(1, 0.13, 220, RATE), noteOff(1, 0.41, RATE),
  noteOn(2, 0.27, 330, RATE), noteOff(2, 0.66, RATE)];
const at128 = renderTngr2({ tables, patch, sampleRate: RATE, seconds: 1, events, blockSize: 128 });
for (const size of [1, 512, 997]) {
  const other = renderTngr2({ tables, patch, sampleRate: RATE, seconds: 1, events, blockSize: size });
  const d = diff(at128.channels, other.channels);
  assert(d === 0, `block size ${size} renders identically to 128 (diff ${d})`);
}

// ---- determinism and seeded phase -------------------------------------------
const twice = renderTngr2({ tables, patch, sampleRate: RATE, seconds: 1, events });
assert(diff(at128.channels, twice.channels) === 0, 'the same events render the same samples twice');
assert(tngr2SeededPhase(7, 0) === tngr2SeededPhase(7, 0), 'a seeded phase is stable for one identity');
assert(tngr2SeededPhase(7, 0) !== tngr2SeededPhase(8, 0), 'different events get different phases');
assert(tngr2SeededPhase(7, 0) !== tngr2SeededPhase(7, 1), 'unison members get different phases');
const phases = [];
for (let i = 0; i < 64; i++) phases.push(tngr2SeededPhase(i, 0));
assert(phases.every((p) => p >= 0 && p < 1), 'every seeded phase lands in [0,1)');
assert(new Set(phases).size > 55, `seeded phases are well spread (${new Set(phases).size}/64 distinct)`);

// ---- both sample rates -------------------------------------------------------
for (const rate of [44100, 48000]) {
  const r = renderTngr2({ tables, patch,
    sampleRate: rate, seconds: 0.5, events: [noteOn(1, 0.05, 440, rate), noteOff(1, 0.3, rate)],
  });
  assert(r.frames === Math.ceil(0.5 * rate), `${rate} renders the right number of frames`);
  assert(peak(r.channels) > 0.1, `${rate} renders audibly`);
}

// A note is the same PITCH at both rates: one cycle must take the same wall time, which
// is the check that catches a phase increment computed against the wrong rate.
const cycles = (rate) => {
  const r = renderTngr2({ tables, patch: patchWith({ filter: { cutoff: 18000 } }),
    sampleRate: rate, seconds: 0.5, events: [noteOn(1, 0, 100, rate)],
  });
  const ch = r.channels[0];
  let crossings = 0;
  const from = Math.floor(0.2 * rate);
  const to = Math.floor(0.4 * rate);
  for (let i = from + 1; i < to; i++) if (ch[i - 1] <= 0 && ch[i] > 0) crossings++;
  return crossings;
};
const c44 = cycles(44100);
const c48 = cycles(48000);
assert(Math.abs(c44 - c48) <= 1 && Math.abs(c44 - 20) <= 1,
  `100 Hz is 100 Hz at both rates (${c44} and ${c48} cycles in 0.2 s)`);

// ---- the allocator -----------------------------------------------------------
//
// Sixteen voices, and a seventeenth note that must take one rather than be dropped or
// grow the pool.
const many = [];
for (let i = 0; i < 24; i++) many.push(noteOn(100 + i, 0.01 + i * 0.001, 200 + i * 20, RATE));
const crowded = renderTngr2({ tables, patch, sampleRate: RATE, seconds: 0.6, events: many, maxVoices: 16 });
assert(crowded.health.voices <= 16, `the pool never exceeds sixteen voices (${crowded.health.voices})`);
assert(crowded.health.steals === 8, `the eight notes past the pool steal (${crowded.health.steals})`);
assert(crowded.channels.every((ch) => ch.every(Number.isFinite)),
  'a crowded lane still renders finite samples');

// A releasing voice is taken before a sounding one — the note you have let go of is the
// one you miss least.
const core = new Tngr2Core({ sampleRate: RATE, maxVoices: 2 });
core.installTables(tables);
core.installPatch(patch);
core.scheduleAll([
  noteOn(1, 0, 220, RATE), noteOn(2, 0, 330, RATE),
  noteOff(1, 0.01, RATE),
  noteOn(3, 0.02, 440, RATE),
]);
const scratch = [new Float32Array(RATE), new Float32Array(RATE)];
core.process(scratch, 0, RATE, 0);
assert(core.findVoice(2) !== null, 'the still-held note survives the steal');
assert(core.findVoice(3) !== null, 'the new note got a voice');

// Live controller edits compile on the main thread, then install this form directly in
// the worklet. It must be the exact same patch the core would compile for itself.
const precompiled = new Tngr2Core({ sampleRate: RATE, maxVoices: 2 });
precompiled.installTables(tables);
precompiled.installCompiledPatch(compileTngr2Patch(patch));
precompiled.scheduleAll([noteOn(31, 0, 220, RATE), noteOff(31, 0.2, RATE)]);
const compiledOut = [new Float32Array(RATE), new Float32Array(RATE)];
precompiled.process(compiledOut, 0, RATE, 0);
const rawPatch = renderTngr2({
  tables, patch, sampleRate: RATE, seconds: 1,
  events: [noteOn(31, 0, 220, RATE), noteOff(31, 0.2, RATE)], maxVoices: 2,
});
assert(maxDiff(compiledOut, rawPatch.channels) === 0,
  'a main-thread compiled patch is sample-identical to an audio-thread compiled patch');

// ---- note off, panic ---------------------------------------------------------
const panicked = renderTngr2({ tables, patch,
  sampleRate: RATE, seconds: 1,
  events: [
    noteOn(1, 0.05, 220, RATE), noteOff(1, 0.9, RATE),
    noteOn(2, 0.6, 440, RATE),
    { type: 'panic', frame: frameAt(0.4, RATE) },
  ],
});
assert(rms(panicked.channels, 0.1, 0.35, RATE) > 0.05, 'the panic render sounded beforehand');
assert(rms(panicked.channels, 0.5, 1.0, RATE) < 1e-6,
  'panic silences the sounding note and drops the events queued behind it');

// An event stamped before the block it arrives in is applied at the first safe sample and
// counted, rather than silently backdated — §5's late-event rule.
const late = new Tngr2Core({ sampleRate: RATE });
late.process([new Float32Array(256)], 0, 256, 0);
late.schedule(noteOn(1, 0, 220, RATE));
late.process([new Float32Array(256)], 256, 256, 0);
assert(late.late === 1 && late.worstLate === 256,
  `a late event is applied and counted (late ${late.late}, worst ${late.worstLate})`);

// A persistent lane between notes must clear only the requested output range. This is the
// silent-block fast path: it replaces 128 frames of empty voice scans in the worklet.
{
  const idleCore = new Tngr2Core({ sampleRate: RATE });
  const idleBlock = new Float32Array(32).fill(7);
  idleCore.process([idleBlock], 0, 16, 8);
  assert(idleBlock.slice(8, 24).every((sample) => sample === 0),
    'an idle core clears its requested range without walking silent voices');
  assert(idleBlock.slice(0, 8).every((sample) => sample === 7)
      && idleBlock.slice(24).every((sample) => sample === 7),
  'the idle fast path leaves samples outside its requested range alone');
}

// Consumed events retain no logical queue length, and a later live event can reuse the
// queue after its read cursor reaches the end.
{
  const rolling = new Tngr2Core({ sampleRate: RATE });
  rolling.installTables(tables);
  rolling.installPatch(patch);
  rolling.scheduleAll([noteOn(1, 0, 220, RATE), noteOff(1, 0.01, RATE)]);
  rolling.process([new Float32Array(RATE), new Float32Array(RATE)], 0, RATE, 0);
  assert(rolling.health(RATE).queued === 0, 'consumed events leave no logical queue backlog');
  rolling.schedule(noteOn(2, 1, 330, RATE));
  assert(rolling.health(RATE).queued === 1, 'a drained live queue accepts its next event');
}

// Destination liveness is deliberately separate: a position-only sweep must not pay for
// oscillator retuning or filter coefficient calculation on every control tick.
{
  const calls = { pitch: 0, position: 0, filter: 0 };
  const originals = {
    pitch: Tngr2Voice.prototype.applyPitch,
    position: Tngr2Voice.prototype.applyPosition,
    filter: Tngr2Voice.prototype.applyFilter,
  };
  Tngr2Voice.prototype.applyPitch = function countedPitch(...args) {
    calls.pitch++;
    return originals.pitch.apply(this, args);
  };
  Tngr2Voice.prototype.applyPosition = function countedPosition(...args) {
    calls.position++;
    return originals.position.apply(this, args);
  };
  Tngr2Voice.prototype.applyFilter = function countedFilter(...args) {
    calls.filter++;
    return originals.filter.apply(this, args);
  };
  try {
    const moving = new Tngr2Core({ sampleRate: RATE });
    moving.installTables(tables);
    moving.installPatch(patchWith({
      amp: { attack: 0, decay: 0, sustain: 1, release: 0.1 },
      positionEnv: { attack: 1, decay: 0, sustain: 1, release: 0.1 },
      filterEnv: { amount: 0, attack: 0, decay: 0, sustain: 0, release: 0 },
      oscA: { table: 'crystal', position: 0, envAmount: 1, level: 1, unison: 1 },
    }));
    moving.schedule(noteOn(1, 0, 220, RATE));
    moving.process([new Float32Array(64), new Float32Array(64)], 0, 64, 0);
  } finally {
    Tngr2Voice.prototype.applyPitch = originals.pitch;
    Tngr2Voice.prototype.applyPosition = originals.position;
    Tngr2Voice.prototype.applyFilter = originals.filter;
  }
  assert(calls.position > 1, `position motion updates its own destination (${calls.position} calls)`);
  assert(calls.pitch === 1 && calls.filter === 1,
    `position-only motion leaves pitch and filter at note-on (${calls.pitch}, ${calls.filter})`);
}

// Once a control envelope reaches sustain it is a constant, not ongoing modulation.
// It should stop revisiting its destination, then wake when note-off begins release.
{
  const calls = { position: 0, filter: 0 };
  const originalPosition = Tngr2Voice.prototype.applyPosition;
  const originalFilter = Tngr2Voice.prototype.applyFilter;
  Tngr2Voice.prototype.applyPosition = function countedPosition(...args) {
    calls.position++;
    return originalPosition.apply(this, args);
  };
  Tngr2Voice.prototype.applyFilter = function countedFilter(...args) {
    calls.filter++;
    return originalFilter.apply(this, args);
  };
  try {
    const settling = new Tngr2Core({ sampleRate: RATE });
    settling.installTables(tables);
    settling.installPatch(patchWith({
      amp: { attack: 0, decay: 0, sustain: 1, release: 0.1 },
      positionEnv: { attack: 0, decay: 0.001, sustain: 0.5, release: 0.01 },
      filterEnv: { amount: 1, attack: 0, decay: 0.001, sustain: 0.5, release: 0.01 },
      oscA: { table: 'crystal', position: 0, envAmount: 1, level: 1, unison: 1 },
    }));
    settling.schedule(noteOn(1, 0, 220, RATE));
    const heldFrames = Math.round(RATE * 0.1);
    settling.process([new Float32Array(heldFrames), new Float32Array(heldFrames)], 0, heldFrames, 0);
    const heldCalls = { ...calls };
    assert(heldCalls.position < 20 && heldCalls.filter < 20,
      `settled control envelopes sleep during a held note (${heldCalls.position} position,`
      + ` ${heldCalls.filter} filter updates)`);
    settling.schedule(noteOff(1, 0.1, RATE));
    const releaseFrames = Math.round(RATE * 0.02);
    settling.process([new Float32Array(releaseFrames), new Float32Array(releaseFrames)],
      heldFrames, releaseFrames, 0);
    assert(calls.position > heldCalls.position && calls.filter > heldCalls.filter,
      'note-off wakes settled position and filter envelopes for their release');
  } finally {
    Tngr2Voice.prototype.applyPosition = originalPosition;
    Tngr2Voice.prototype.applyFilter = originalFilter;
  }
}

// ---- the table lookup ---------------------------------------------------------
//
// §6.2: the oscillator reads the family, interpolates within a frame and between the
// adjacent frame PAIR, and picks a mip level the pitch can afford.

// POSITION is a timbre control, so two positions in one family must sound different —
// and the same position must sound the same. This is what proves the frame pair is
// actually being read rather than one fixed frame.
{
  const at = (position) => renderTngr2({
    tables, sampleRate: RATE, seconds: 0.4,
    patch: patchWith({ filter: { cutoff: 18000 },
      oscA: { table: 'crystal', position, level: 1, unison: 1 } }),
    events: [noteOn(1, 0, 220, RATE)],
  }).channels;
  const low = at(0.1);
  const mid = at(0.5);
  assert(diff(low, at(0.1)) === 0, 'one position renders one timbre, every time');
  assert(diff(low, mid) > 0.01, `POSITION changes the timbre (diff ${diff(low, mid).toFixed(3)})`);
  // Neighbouring positions differ only slightly — the frames are interpolated, not
  // snapped to the nearest of 32. Snapping would make these two identical.
  const near = at(0.505);
  const gap = diff(mid, near);
  assert(gap > 0 && gap < diff(low, mid),
    `positions between frames interpolate rather than snap (diff ${gap.toExponential(2)})`);
}

// An unknown family falls back to basic and is counted — §8 — rather than rendering NaN.
{
  const bad = renderTngr2({
    tables, sampleRate: RATE, seconds: 0.3,
    patch: patchWith({ oscA: { table: 'nonesuch', position: 0.25, level: 1 } }),
    events: [noteOn(1, 0, 220, RATE)],
  });
  assert(bad.channels.every((ch) => ch.every(Number.isFinite)),
    'an unknown table renders finite samples rather than poisoning the block');
  assert(bad.health.badTable === 1, `the unknown table is counted (${bad.health.badTable})`);
  assert(peak(bad.channels) > 0.05, 'an unknown table falls back to something audible');
}

// A core with no tables installed is silent and says so, rather than inventing a sound
// that would then differ from every host that DID install them.
{
  const bare = renderTngr2({
    sampleRate: RATE, seconds: 0.2, patch, events: [noteOn(1, 0, 220, RATE)],
  });
  assert(peak(bare.channels) === 0, 'a core with no tables renders silence');
  assert(bare.health.missingTables > 0, 'and reports that its tables never arrived');
}

// Mip selection: a high note must not alias. Rendered at C6 from a family with 96
// harmonics, everything above Nyquist has to have been dropped by the level chosen —
// aliasing would show up as energy at frequencies that are not harmonics of the note.
{
  const hz = 1046.502;
  const r = renderTngr2({
    tables, sampleRate: RATE, seconds: 1,
    // Held right through the analysis window: the note must still be sustaining, or the
    // release would taper the very partials being measured.
    patch: patchWith({ filter: { cutoff: 18000 },
      oscA: { table: 'sawForm', position: 0.5, level: 1, unison: 1 } }),
    events: [noteOn(1, 0, hz, RATE), noteOff(1, 0.9, RATE)],
  });
  const ch = r.channels[0];
  const from = Math.floor(0.2 * RATE);
  const N = 16384;
  // Correlate against the inharmonic frequencies aliasing would land on: a partial above
  // Nyquist folds back to |rate - n*hz|, which is not a multiple of hz.
  let harmonic = 0;
  let alias = 0;
  const energyAt = (freq) => {
    let re = 0;
    let im = 0;
    for (let i = 0; i < N; i++) {
      const a = 2 * Math.PI * freq * i / RATE;
      re += ch[from + i] * Math.cos(a);
      im += ch[from + i] * Math.sin(a);
    }
    return Math.hypot(re, im) * 2 / N;
  };
  for (let n = 1; n * hz < RATE * 0.5; n++) harmonic = Math.max(harmonic, energyAt(n * hz));
  for (let n = 22; n < 40; n++) {
    const folded = Math.abs(RATE - n * hz);
    if (folded > 100 && folded < RATE * 0.5) alias = Math.max(alias, energyAt(folded));
  }
  assert(alias < harmonic * 0.02,
    `a C6 note aliases nothing worth hearing (alias ${alias.toExponential(2)} vs harmonic ${harmonic.toExponential(2)})`);
}

// ---- two oscillators, unison, pan ---------------------------------------------
//
// §7.2. What a patch is made of, and the normalisation that keeps a fat patch from
// simply being a loud one.
{
  const one = renderTngr2({ tables, sampleRate: RATE, seconds: 0.5,
    patch: patchWith({ oscA: { table: 'sawForm', position: 0.4, level: 1, unison: 1 } }),
    events: [noteOn(1, 0, 220, RATE)] });
  const four = renderTngr2({ tables, sampleRate: RATE, seconds: 0.5,
    patch: patchWith({
      oscA: { table: 'sawForm', position: 0.4, level: 1, unison: 4, spread: 20 } }),
    events: [noteOn(1, 0, 220, RATE)] });
  const ratio = rms(four.channels, 0.1, 0.4, RATE) / rms(one.channels, 0.1, 0.4, RATE);
  // 1/sqrt(4) normalisation: four detuned copies should land near the loudness of one,
  // not four times it. Detuning means they do not sum coherently, so the window is wide,
  // but a missing normalisation would put this at 4 and a wrong one at 0.25.
  assert(ratio > 0.5 && ratio < 1.6,
    `unison 4 is about as loud as unison 1 (${ratio.toFixed(2)}x)`);
  assert(diff(one.channels, four.channels) > 0.01, 'unison actually changes the sound');

  // A second oscillator is audible, and switching it off takes it away.
  const withB = renderTngr2({ tables, sampleRate: RATE, seconds: 0.5,
    patch: patchWith({ oscB: { table: 'crystal', position: 0.6, level: 0.8, octave: 1 } }),
    events: [noteOn(1, 0, 220, RATE)] });
  const soloA = renderTngr2({ tables, patch, sampleRate: RATE, seconds: 0.5,
    events: [noteOn(1, 0, 220, RATE)] });
  assert(diff(withB.channels, soloA.channels) > 0.01, 'Osc B is audible when present');
  const offB = renderTngr2({ tables, sampleRate: RATE, seconds: 0.5,
    patch: patchWith({ oscB: { on: false, table: 'crystal', level: 0.8, octave: 1 } }),
    events: [noteOn(1, 0, 220, RATE)] });
  assert(diff(offB.channels, soloA.channels) === 0, 'Osc B switched off is Osc B absent');

  // There is no per-oscillator PAN: the lane has one and STEREO spreads a stack, so a
  // `pan` left behind by an old preset has to be inert rather than quietly moving a sound.
  const centred = renderTngr2({ tables, sampleRate: RATE, seconds: 0.4,
    patch: patchWith({ oscA: { table: 'basic', position: 0.25, level: 1 } }),
    events: [noteOn(1, 0, 220, RATE)] });
  const stray = renderTngr2({ tables, sampleRate: RATE, seconds: 0.4,
    patch: patchWith({ oscA: { table: 'basic', position: 0.25, level: 1, pan: -1 } }),
    events: [noteOn(1, 0, 220, RATE)] });
  assert(diff(stray.channels, centred.channels) === 0,
    'a leftover per-oscillator PAN key does nothing');
  assert(rms([centred.channels[0]], 0.1, 0.3, RATE) > 0
    && Math.abs(rms([centred.channels[0]], 0.1, 0.3, RATE)
      - rms([centred.channels[1]], 0.1, 0.3, RATE)) < 1e-6,
    'a single oscillator with no spread sits in the middle');

  // STEREO spreads a stack across the field; without it the members stack up the middle.
  const spreadWide = renderTngr2({ tables, sampleRate: RATE, seconds: 0.4,
    patch: patchWith({
      oscA: { table: 'sawForm', position: 0.4, level: 1, unison: 4, spread: 20, stereo: 1 } }),
    events: [noteOn(1, 0, 220, RATE)] });
  let widest = 0;
  for (let i = 0; i < spreadWide.channels[0].length; i++) {
    widest = Math.max(widest, Math.abs(spreadWide.channels[0][i] - spreadWide.channels[1][i]));
  }
  assert(widest > 0.01, `STEREO puts the unison members across the field (${widest.toFixed(3)})`);
}

// Tuning is composed in cents before it becomes a frequency: an octave up and a fifth is
// not the same as adding the two ratios, and this is the check that catches that.
{
  const semis = (n) => renderTngr2({ tables, sampleRate: RATE, seconds: 0.5,
    patch: patchWith({ filter: { cutoff: 18000 },
      oscA: { table: 'basic', position: 0.25, level: 1, interval: n, detune: 0 } }),
    events: [noteOn(1, 0, 100, RATE)] }).channels[0];
  const crossings = (ch) => {
    let n = 0;
    for (let i = Math.floor(0.2 * RATE) + 1; i < Math.floor(0.4 * RATE); i++) {
      if (ch[i - 1] <= 0 && ch[i] > 0) n++;
    }
    return n / 0.2;
  };
  // 100 Hz at INTERVAL +12 is 200, and +24 is 400 — semitones composed as cents, so two
  // octaves is exactly four times the frequency rather than something near it.
  assert(Math.abs(crossings(semis(12)) - 200) < 3,
    `INTERVAL +12 is 200 Hz (${crossings(semis(12)).toFixed(0)})`);
  assert(Math.abs(crossings(semis(24)) - 400) < 5,
    `INTERVAL +24 is 400 Hz (${crossings(semis(24)).toFixed(0)})`);
}

// ---- start phase ----------------------------------------------------------------
{
  // ALWAYS SEEDED, and there is no pill to change it: the start phase comes from the
  // note's own identity. Two notes differ, one note repeats, and a `phaseMode` left
  // behind by an old preset is inert.
  const render = (id, extra = {}) => renderTngr2({ tables, sampleRate: RATE, seconds: 0.3,
    patch: patchWith({ oscA: { table: 'sawForm', position: 0.3, level: 1, ...extra } }),
    events: [noteOn(id, 0, 220, RATE)] }).channels;
  assert(diff(render(1), render(1)) === 0, 'one note identity repeats exactly');
  assert(diff(render(1), render(2)) > 0, 'two note identities start at different phases');
  assert(diff(render(1, { phaseMode: 'fixed', phase: 0.5 }), render(1)) === 0,
    'leftover PHASE MODE and PHASE keys do nothing');
}

// ---- key modes: poly, mono, legato ---------------------------------------------
{
  const events = [
    noteOn(1, 0.05, 220, RATE),
    noteOn(2, 0.20, 330, RATE),
    noteOff(1, 0.60, RATE), noteOff(2, 0.60, RATE),
  ];
  const poly = renderTngr2({ tables, patch: patchWith({ mode: 'poly' }),
    sampleRate: RATE, seconds: 1, events });
  const mono = renderTngr2({ tables, patch: patchWith({ mode: 'mono' }),
    sampleRate: RATE, seconds: 1, events });
  assert(poly.health.voices >= 0 && rms(poly.channels, 0.25, 0.5, RATE)
    > rms(mono.channels, 0.25, 0.5, RATE),
  'poly sounds both notes at once where mono sounds only the last');

  // Mono restrikes the envelope, legato takes the note over.
  //
  // Measured on a PLUCKY patch, which is the shape that makes the difference audible: by
  // the time the second note arrives both have decayed to a low sustain, and a restrike
  // sounds the note again at full level where a legato hand-off just keeps decaying.
  // (On a pad with a high sustain the two modes genuinely converge — there is nothing for
  // a restrike to restore — so a test written there would be measuring almost nothing.)
  const pluck = { attack: 0.005, decay: 0.15, sustain: 0.08, release: 0.1 };
  const two = [noteOn(1, 0.02, 220, RATE), noteOn(2, 0.30, 330, RATE), noteOff(2, 0.8, RATE)];
  const monoPluck = renderTngr2({ tables, sampleRate: RATE, seconds: 1,
    patch: patchWith({ mode: 'mono', amp: pluck }), events: two });
  const legatoPluck = renderTngr2({ tables, sampleRate: RATE, seconds: 1,
    patch: patchWith({ mode: 'legato', amp: pluck }), events: two });
  const settled = rms(monoPluck.channels, 0.25, 0.29, RATE);
  const restruck = rms(monoPluck.channels, 0.31, 0.36, RATE);
  const carried = rms(legatoPluck.channels, 0.31, 0.36, RATE);
  assert(restruck > carried * 2,
    `mono restrikes the envelope where legato carries it on (${restruck.toFixed(4)} vs ${carried.toFixed(4)})`);
  assert(restruck > settled * 2,
    `the mono restrike really is a new strike (${restruck.toFixed(4)} against a settled ${settled.toFixed(4)})`);
  assert(Math.abs(carried - rms(legatoPluck.channels, 0.25, 0.29, RATE)) < carried,
    'legato leaves the envelope where it was rather than restarting it');

  // Glide takes the pitch there over time rather than stepping.
  const glided = renderTngr2({ tables, sampleRate: RATE, seconds: 1,
    patch: patchWith({ mode: 'legato', glide: 0.2, filter: { cutoff: 18000 },
      oscA: { table: 'basic', position: 0.25, level: 1 } }),
    events: [noteOn(1, 0.02, 110, RATE), noteOn(2, 0.30, 220, RATE), noteOff(2, 0.9, RATE)] });
  const pitchAt = (from, to) => {
    const ch = glided.channels[0];
    let n = 0;
    for (let i = Math.floor(from * RATE) + 1; i < Math.floor(to * RATE); i++) {
      if (ch[i - 1] <= 0 && ch[i] > 0) n++;
    }
    return n / (to - from);
  };
  const before = pitchAt(0.2, 0.29);
  const during = pitchAt(0.35, 0.42);
  const after = pitchAt(0.6, 0.8);
  assert(Math.abs(before - 110) < 6, `the glide starts at its first pitch (${before.toFixed(0)} Hz)`);
  assert(during > before + 10 && during < after - 5,
    `the glide is still travelling part way through (${during.toFixed(0)} Hz)`);
  assert(Math.abs(after - 220) < 8, `the glide arrives at its target (${after.toFixed(0)} Hz)`);
}

// ---- the position envelope: ADHSR ---------------------------------------------
// ---- the position envelope ------------------------------------------------------
{
  const still = renderTngr2({ tables, sampleRate: RATE, seconds: 1.2,
    patch: patchWith({ filter: { cutoff: 18000 },
      oscA: { table: 'crystal', position: 0, level: 1 },
      amp: { attack: 0.005, decay: 0.01, sustain: 1, release: 0.05 } }),
    events: [noteOn(1, 0, 220, RATE), noteOff(1, 1.0, RATE)] });
  // With no ENV MOVE the position envelope is inaudible however it is set: an envelope
  // that leaked into the sound without an amount would be a hidden modulation.
  const idle = renderTngr2({ tables, sampleRate: RATE, seconds: 1.2,
    patch: patchWith({ filter: { cutoff: 18000 },
      positionEnv: { attack: 0.1, decay: 0.3, sustain: 0, release: 0.1 },
      oscA: { table: 'crystal', position: 0, level: 1, envAmount: 0 },
      amp: { attack: 0.005, decay: 0.01, sustain: 1, release: 0.05 } }),
    events: [noteOn(1, 0, 220, RATE), noteOff(1, 1.0, RATE)] });
  assert(diff(idle.channels, still.channels) === 0,
    'the position envelope does nothing until an oscillator asks for it');
  // And with an amount it walks the table, so the sound is not the still one.
  const moved = renderTngr2({ tables, sampleRate: RATE, seconds: 1.2,
    patch: patchWith({ filter: { cutoff: 18000 },
      positionEnv: { attack: 0.1, decay: 0.3, sustain: 0, release: 0.1 },
      oscA: { table: 'crystal', position: 0, level: 1, envAmount: 1 },
      amp: { attack: 0.005, decay: 0.01, sustain: 1, release: 0.05 } }),
    events: [noteOn(1, 0, 220, RATE), noteOff(1, 1.0, RATE)] });
  assert(diff(moved.channels, still.channels) > 0.001,
    'and with ENV MOVE it walks the table across the note');
}

// ---- the LFOs ------------------------------------------------------------------
{
  const lfoPatch = (lfo1, extra = {}) => patchWith({
    filter: { cutoff: 18000 }, lfo1,
    oscA: { table: 'crystal', position: 0.5, level: 1, lfoAmount: 0.4 },
    amp: { attack: 0.005, decay: 0.01, sustain: 1, release: 0.05 },
    ...extra,
  });
  const run = (lfo1, extra) => renderTngr2({ tables, sampleRate: RATE, seconds: 1,
    patch: lfoPatch(lfo1, extra), events: [noteOn(1, 0, 220, RATE), noteOff(1, 0.9, RATE)] });

  // Every shape §7.3 names is available and does something distinct.
  const shapes = ['sine', 'triangle', 'saw', 'square', 'samplehold'];
  const rendered = shapes.map((shape) => run({ shape, rate: 6, amount: 1 }).channels);
  for (let i = 0; i < shapes.length; i++) {
    assert(rendered[i].every((ch) => ch.every(Number.isFinite)), `the ${shapes[i]} LFO renders finite samples`);
    for (let j = i + 1; j < shapes.length; j++) {
      if (diff(rendered[i], rendered[j]) === 0) fail(`${shapes[i]} and ${shapes[j]} LFOs are identical`);
    }
  }
  ok('all five LFO shapes render, and none is a duplicate of another');

  // Sample-and-hold is deterministic: §12.1 requires it to be repeatable and independent
  // of prior playback, which is what makes a stem match its mix.
  const sh1 = run({ shape: 'samplehold', rate: 9, amount: 1 }).channels;
  const sh2 = run({ shape: 'samplehold', rate: 9, amount: 1 }).channels;
  assert(diff(sh1, sh2) === 0, 'sample-and-hold repeats exactly');

  // The LFO has no DELAY and no RETRIGGER pill: it always starts with the note, which is
  // what a player expects. A `delay` or `retrigger` left behind by an old preset is inert.
  const plain = run({ shape: 'sine', rate: 5 }).channels;
  assert(diff(run({ shape: 'sine', rate: 5, delay: 0.5, retrigger: false }).channels, plain) === 0,
    'leftover LFO DELAY and RETRIGGER keys do nothing');

  // Starting with the note means the same phase whenever the note starts.
  const at = (start) => renderTngr2({ tables, sampleRate: RATE, seconds: 0.6,
    patch: lfoPatch({ shape: 'sine', rate: 5, phase: 0 }),
    events: [noteOn(1, start, 220, RATE), noteOff(1, 0.5, RATE)] });
  const shift = (chs, offset) => rms(chs, 0.2 + offset, 0.3 + offset, RATE);
  assert(Math.abs(shift(at(0).channels, 0) - shift(at(0.1).channels, 0.1)) < 2e-3,
    'the LFO starts from the same phase whenever the note starts');
  assert(diff(at(0.1).channels, at(0.1).channels) === 0, 'and it is deterministic');
}

// ---- the filter: type, resonance, key tracking, drive --------------------------
{
  const filtered = (filter, extra = {}) => renderTngr2({ tables, sampleRate: RATE, seconds: 0.6,
    patch: patchWith({ filter,
      oscA: { table: 'sawForm', position: 0.5, level: 1 },
      amp: { attack: 0.005, decay: 0.01, sustain: 1, release: 0.05 }, ...extra }),
    events: [noteOn(1, 0, 220, RATE), noteOff(1, 0.5, RATE)] });

  const energyAt = (ch, freq, from = 0.2, n = 8192) => {
    let re = 0;
    let im = 0;
    const start = Math.floor(from * RATE);
    for (let i = 0; i < n; i++) {
      const a = 2 * Math.PI * freq * i / RATE;
      re += ch[start + i] * Math.cos(a);
      im += ch[start + i] * Math.sin(a);
    }
    return Math.hypot(re, im) * 2 / n;
  };

  // A lowpass at 400 Hz keeps the 220 Hz fundamental and loses the harmonic at 2.2 kHz;
  // a highpass at the same cutoff does the opposite. That is the check that the mode
  // switch is wired to the right output of the state variable filter.
  const lp = filtered({ type: 'lowpass', cutoff: 400, resonance: 0.7 }).channels[0];
  const hp = filtered({ type: 'highpass', cutoff: 400, resonance: 0.7 }).channels[0];
  const lpRatio = energyAt(lp, 2200) / Math.max(1e-12, energyAt(lp, 220));
  const hpRatio = energyAt(hp, 2200) / Math.max(1e-12, energyAt(hp, 220));
  assert(lpRatio < 0.2, `a lowpass keeps the fundamental and drops the tenth harmonic (${lpRatio.toExponential(2)})`);
  assert(hpRatio > lpRatio * 10, `a highpass does the opposite (${hpRatio.toExponential(2)})`);
  const bp = filtered({ type: 'bandpass', cutoff: 1000, resonance: 4 }).channels[0];
  assert(energyAt(bp, 1100) > energyAt(bp, 220) && energyAt(bp, 1100) > energyAt(bp, 6000),
    'a bandpass favours its own centre over either side');
  const notch = filtered({ type: 'notch', cutoff: 660, resonance: 2 }).channels[0];
  assert(energyAt(notch, 660) < energyAt(notch, 220) * 0.5,
    'a notch removes energy at its centre');

  // The filter must stay finite at the resonance ceiling and under a full-depth envelope
  // sweep at both rates — the case a direct-form biquad fails.
  for (const rate of [44100, 48000]) {
    const wild = renderTngr2({ tables, sampleRate: rate, seconds: 0.8,
      patch: patchWith({
        filter: { type: 'lowpass', cutoff: 200, resonance: 24, drive: 1 },
        filterEnv: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.2, amount: 6 },
        oscA: { table: 'sawForm', position: 0.5, level: 1.5, unison: 4, spread: 30,
          envAmount: 1, lfoAmount: 1 },
        amp: { attack: 0.001, decay: 0.05, sustain: 1, release: 0.1 },
        positionEnv: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.1 },
        lfo1: { shape: 'square', rate: 30 } }),
      events: [noteOn(1, 0, 55, rate), noteOff(1, 0.6, rate)] });
    assert(wild.channels.every((ch) => ch.every(Number.isFinite)),
      `${rate}: maximum resonance under a full sweep stays finite`);
    assert(wild.health.nonFinite === 0, `${rate}: nothing had to be replaced at the output`);
    assert(Number.isFinite(peak(wild.channels)),
      `${rate}: the output stays a real number (peak ${peak(wild.channels).toFixed(3)})`);
  }

  // KEY TRACKING opens the filter for higher notes, so a patch keeps its brightness
  // across the keyboard instead of going dull as it climbs.
  const bright = (hz, keyTrack) => {
    const ch = filtered({ type: 'lowpass', cutoff: 500, resonance: 0.7, keyTrack }).channels[0];
    void ch;
    return renderTngr2({ tables, sampleRate: RATE, seconds: 0.6,
      patch: patchWith({ filter: { type: 'lowpass', cutoff: 500, resonance: 0.7, keyTrack },
        oscA: { table: 'sawForm', position: 0.5, level: 1 },
        amp: { attack: 0.005, decay: 0.01, sustain: 1, release: 0.05 } }),
      events: [noteOn(1, 0, hz, RATE), noteOff(1, 0.5, RATE)] }).channels[0];
  };
  // Measured as the share of energy above the cutoff, so it is about BRIGHTNESS rather
  // than loudness: an octave up with full key tracking should keep more of its harmonics.
  const shareAbove = (ch, hz) => {
    let low = 0;
    let high = 0;
    for (let n = 1; n <= 8; n++) {
      const e = energyAt(ch, hz * n);
      if (hz * n < 500) low += e; else high += e;
    }
    return high / Math.max(1e-12, low + high);
  };
  const noTrack = shareAbove(bright(440, 0), 440);
  const tracked = shareAbove(bright(440, 1), 440);
  assert(tracked > noTrack * 1.2,
    `KEY TRACKING keeps a high note bright (${tracked.toFixed(3)} of its energy above the cutoff against ${noTrack.toFixed(3)})`);
}

// ---- envelope curves --------------------------------------------------------------
//
// The desk's two shapes, on every stage. Exponential is the one a real instrument has —
// a fall that drops fast and then tapers — which is why decay and release default to it.
{
  const decayed = (decayCurve) => renderTngr2({ tables, sampleRate: RATE, seconds: 1,
    patch: patchWith({ filter: { cutoff: 18000 },
      amp: { attack: 0.001, decay: 0.6, sustain: 0, release: 0.05, decayCurve } }),
    events: [noteOn(1, 0, 220, RATE)] }).channels[0];
  const at = (ch, seconds) => {
    let peak = 0;
    const from = Math.floor(seconds * RATE);
    for (let i = from; i < from + 441; i++) peak = Math.max(peak, Math.abs(ch[i]));
    return peak;
  };
  const lin = decayed('linear');
  const exp = decayed('exponential');
  assert(at(exp, 0.3) < at(lin, 0.3) * 0.7,
    `an exponential decay is well below a linear one halfway down (${at(exp, 0.3).toFixed(3)} vs ${at(lin, 0.3).toFixed(3)})`);
  assert(at(exp, 0.45) < at(lin, 0.45) * 0.5,
    'and further below it again by the end — it falls fast, then tapers');
  // Both still ARRIVE: a shaped stage has to reach its target on the sample the counter
  // says, or a release either stops early at a floor or holds the voice open for ever.
  assert(at(lin, 0.7) === 0 && at(exp, 0.7) === 0,
    'both curves reach silence exactly when the decay says');
  // A curve nobody chose is the desk's default, not a linear surprise.
  const dflt = renderTngr2({ tables, sampleRate: RATE, seconds: 1,
    patch: patchWith({ filter: { cutoff: 18000 },
      amp: { attack: 0.001, decay: 0.6, sustain: 0, release: 0.05 } }),
    events: [noteOn(1, 0, 220, RATE)] }).channels[0];
  assert(Math.abs(at(dflt, 0.3) - at(exp, 0.3)) < 1e-6,
    'an envelope that names no curve decays exponentially, as the rest of the desk does');
}

// ---- the filter slope ------------------------------------------------------------
//
// -12 is one filter stage, -24 two in series, -48 four — so each step should take the
// same 12 dB per octave off again. Measured on a harmonic well above the cutoff, through
// a Hann window: without one, leakage from the fundamental — which passes untouched —
// swamps the bin and every slope measures the same.
{
  const sloped = (slope) => renderTngr2({ tables, sampleRate: RATE, seconds: 1,
    patch: patchWith({ filter: { type: 'lowpass', slope, cutoff: 500, resonance: 1 },
      oscA: { table: 'sawForm', position: 0.5, level: 1 },
      amp: { attack: 0.005, decay: 0.01, sustain: 1, release: 0.05 } }),
    events: [noteOn(1, 0, 110, RATE)] }).channels[0];
  const energy = (ch, f) => {
    const N = 16384;
    const from = Math.floor(0.2 * RATE);
    let re = 0;
    let im = 0;
    for (let i = 0; i < N; i++) {
      const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
      const a = 2 * Math.PI * f * i / RATE;
      re += ch[from + i] * w * Math.cos(a);
      im += ch[from + i] * w * Math.sin(a);
    }
    return Math.hypot(re, im) * 4 / N;
  };
  const db = (slope) => 20 * Math.log10(energy(sloped(slope), 2200));
  const one = db(-12);
  const two = db(-24);
  const four = db(-48);
  // 2200 Hz is 2.14 octaves above a 500 Hz cutoff, so each doubling of the slope should
  // cost about another 26 dB. Generous windows: this is a real filter, not an ideal one.
  assert(two - one < -18 && two - one > -34,
    `-24 dB/oct takes off another octave's worth (${(two - one).toFixed(1)} dB vs -12)`);
  assert(four - one < -60 && four - one > -95,
    `-48 dB/oct takes off three more (${(four - one).toFixed(1)} dB vs -12)`);
  assert(Number.isFinite(one) && Number.isFinite(four), 'every slope renders a real number');
}

// ---- the Effects drive, and where it sits --------------------------------------
{
  const driven = (over) => renderTngr2({ tables, sampleRate: RATE, seconds: 0.5,
    patch: patchWith({ filter: { type: 'lowpass', cutoff: 700, resonance: 4 },
      oscA: { table: 'sawForm', position: 0.5, level: 0.9 },
      amp: { attack: 0.005, decay: 0.01, sustain: 1, release: 0.05 }, ...over }),
    events: [noteOn(1, 0, 110, RATE), noteOff(1, 0.4, RATE)] }).channels;
  const clean = driven({});
  const soft = driven({ drive: 0.8, shape: 'soft', drivePlace: 'post' });
  const fold = driven({ drive: 0.8, shape: 'fold', drivePlace: 'post' });
  const crush = driven({ drive: 0.8, shape: 'crush', drivePlace: 'post' });
  assert(diff(clean, soft) > 1e-3, 'DRIVE changes the sound');
  assert(diff(soft, fold) > 1e-3 && diff(soft, crush) > 1e-3 && diff(fold, crush) > 1e-3,
    'SOFT, FOLD and CRUSH are three different shapes');
  for (const [name, chs] of [['soft', soft], ['fold', fold], ['crush', crush]]) {
    assert(chs.every((ch) => ch.every(Number.isFinite)), `${name} stays finite`);
  }
  // PLACE is the whole point of the pill: driving before a resonant lowpass is not the
  // same as driving after it, because the filter then removes what the shaper added.
  const pre = driven({ drive: 0.8, shape: 'fold', drivePlace: 'pre' });
  const post = driven({ drive: 0.8, shape: 'fold', drivePlace: 'post' });
  assert(diff(pre, post) > 1e-3,
    `PRE and POST put the shaper in genuinely different places (diff ${diff(pre, post).toFixed(3)})`);
  // TONE tames the harmonics the shaper just made, so it only means anything with drive.
  const bright = driven({ drive: 0.8, shape: 'fold', tone: { freq: 18000 } });
  const dark = driven({ drive: 0.8, shape: 'fold', tone: { freq: 800 } });
  assert(diff(bright, dark) > 1e-3, 'TONE shapes what the drive produced');
  // And with DRIVE at zero the whole stage is out of the signal.
  assert(diff(clean, driven({ drive: 0, shape: 'crush', tone: { freq: 400 } })) === 0,
    'at DRIVE zero the shaper and its TONE are not in the signal at all');
}

// ---- purity ------------------------------------------------------------------
for (const forbidden of ['document', 'window', 'AudioContext', 'currentFrame', 'sampleRate\\b']) {
  const pattern = new RegExp(`(^|[^.\\w])${forbidden}`);
  const hit = pattern.test(
    // The source itself, not this module's wrapper.
    // eslint-disable-next-line no-undef
    (await import('../src/engine/tngr2/dsp.js')).TNGR2_DSP_SOURCE,
  );
  assert(!hit, `the core never reaches for '${forbidden.replace('\\b', '')}'`);
}

console.log(failed ? `\nTNGR-2 DSP: ${failed} FAILED` : '\nTNGR-2 DSP: PASSED');
process.exit(failed ? 1 : 0);
