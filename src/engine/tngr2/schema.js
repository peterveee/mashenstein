/*
 * TNGR-2's preset schema: defaults, validation, migration, snapshots.
 *
 * §8 of docs/TNGR-2-completion-spec.md. This is the only place that knows what a stored
 * TNGR-2 preset looks like, so the DSP core can assume its input is already sane and the
 * editor has one answer to "what does a fresh patch start from".
 *
 * ---- why migration exists ------------------------------------------------------
 *
 * The 43 presets in src/data/voices.js were authored against the PROTOTYPE shape — the one
 * the native PeriodicWave path reads. It is close to the v1 schema but not the same:
 *
 *   - no `version`, so nothing can tell the two apart by looking
 *   - `oscB` is switched by its PRESENCE, where v1 has an explicit `on`
 *   - `filterEnv.amount` was sometimes written `octaves`
 *   - the LFOs' `sync` is a string pair ('free' | 'tempo') rather than a boolean
 *   - `lfo1.division` is a note name ('1/16'), not the number the core wants
 *   - per-oscillator `lfo2Amount` has no home in v1's two-amount model
 *   - nothing carried `pan`, `phase`, `phaseMode`, `keyTrack`, `drive`, `positionEnv.hold`,
 *     `positionEnv.release`, `lfo*.delay`, `lfo*.retrigger` or a `mod` matrix at all
 *
 * `migrateTngr2` turns one into the other without guessing: every key it cannot find gets
 * the documented default, and the two genuine remappings (division names to beat
 * fractions, and lfo2Amount) are done explicitly and commented where they happen.
 */

import { isTngr2Table } from './families.js';

/** The schema version every stored patch carries once migrated. */
export const TNGR2_SCHEMA_VERSION = 1;

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (value, lo, hi, fallback) => {
  const n = num(value, fallback);
  return Math.min(hi, Math.max(lo, n));
};

export const TNGR2_LFO_SHAPES = ['sine', 'triangle', 'saw', 'square', 'samplehold'];
export const TNGR2_FILTER_TYPES = ['lowpass', 'highpass', 'bandpass', 'notch'];
/**
 * -12 is one filter stage, -24 two in series, -48 four.
 *
 * The desk offers the first two only — see `SLOPES` in tools/mixer-voice-editor.js for
 * why -48 came off. This list stays WIDER than the panel on purpose: it is what a patch
 * is allowed to CARRY, and a stored patch written while -48 was still offered should
 * keep sounding the way it was saved rather than snapping to the default.
 */
export const TNGR2_SLOPES = [-12, -24, -48];
export const TNGR2_MODES = ['poly', 'mono', 'legato'];
/** The desk's two envelope curves. Attack defaults linear, decay and release curved. */
export const TNGR2_CURVES = ['linear', 'exponential'];

const envDefaults = (over = {}) => ({
  attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3,
  attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential', ...over,
});

/** A fresh v1 patch: what a new TNGR-2 preset starts from. */
export function tngr2Defaults() {
  return {
    version: TNGR2_SCHEMA_VERSION,
    mode: 'poly',
    glide: 0,
    oscA: {
      table: 'basic', position: 0, envAmount: 0, lfoAmount: 0,
      interval: 0, detune: 0, level: 0.8,
      unison: 1, spread: 12, stereo: 0,
    },
    oscB: {
      on: false,
      table: 'basic', position: 0, envAmount: 0, lfoAmount: 0,
      interval: 0, detune: 0, level: 0.3,
      unison: 1, spread: 12, stereo: 0,
    },
    amp: envDefaults(),
    positionEnv: {
      attack: 0.5, decay: 1, sustain: 0, release: 0.3,
      attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential',
    },
    filter: { type: 'lowpass', slope: -24, cutoff: 9000, resonance: 2.4, keyTrack: 0 },
    filterEnv: {
      attack: 0.01, decay: 0.2, sustain: 0, release: 0.015,
      attackCurve: 'linear', decayCurve: 'exponential', releaseCurve: 'exponential',
      // Last, because that is where `validateTngr2` puts it — a stored preset has to come
      // back out in the same key order it went in, or saving one rewrites lines that did
      // not change.
      amount: 0,
    },
    lfo1: { shape: 'sine', rate: 0.2, phase: 0 },
  };
}

const oneOf = (value, list, fallback) => (list.includes(value) ? value : fallback);

function validateOsc(raw, defaults, problems, where) {
  const osc = raw || {};
  const table = isTngr2Table(osc.table) ? osc.table : defaults.table;
  // §8: an invalid table id falls back to basic with a visible development warning. It is
  // reported rather than thrown, because a preset with one bad key should still load.
  if (osc.table !== undefined && !isTngr2Table(osc.table)) {
    problems.push(`${where}.table '${osc.table}' is not a TNGR-2 family — using '${table}'`);
  }
  return {
    table,
    position: clamp(osc.position, 0, 1, defaults.position),
    envAmount: clamp(osc.envAmount, -1, 1, defaults.envAmount),
    lfoAmount: clamp(osc.lfoAmount, -1, 1, defaults.lfoAmount),
    interval: Math.round(clamp(osc.interval, -24, 24, defaults.interval)),
    detune: clamp(osc.detune, -50, 50, defaults.detune),
    level: clamp(osc.level, 0, 1.5, defaults.level),
    unison: Math.round(clamp(osc.unison, 1, 4, defaults.unison)),
    spread: clamp(osc.spread, 0, 50, defaults.spread),
    stereo: clamp(osc.stereo, 0, 1, defaults.stereo),
  };
}

/**
 * An envelope, in stage order.
 *
 * The key order is deliberate and not cosmetic: these patches are written back into
 * src/data/voices.js, so a validated envelope has to come out in the same order every
 * time or saving a preset rewrites lines that did not change.
 */
function validateEnv(raw, defaults) {
  const e = raw || {};
  const out = { attack: clamp(e.attack, 0, 10, defaults.attack) };
  out.decay = clamp(e.decay, 0, 10, defaults.decay);
  out.sustain = clamp(e.sustain, 0, 1, defaults.sustain);
  out.release = clamp(e.release, 0, 10, defaults.release);
  out.attackCurve = oneOf(e.attackCurve, TNGR2_CURVES, defaults.attackCurve);
  out.decayCurve = oneOf(e.decayCurve, TNGR2_CURVES, defaults.decayCurve);
  out.releaseCurve = oneOf(e.releaseCurve, TNGR2_CURVES, defaults.releaseCurve);
  return out;
}

function validateLfo(raw, defaults) {
  const l = raw || {};
  return {
    shape: oneOf(l.shape, TNGR2_LFO_SHAPES, defaults.shape),
    rate: clamp(l.rate, 0.01, 64, defaults.rate),
    phase: clamp(l.phase, 0, 1, defaults.phase),
  };
}

/**
 * Validate and complete a patch against the v1 schema.
 *
 * Never throws and never returns a partial patch: every key is present and in range on
 * the way out, so the core and the editor can both stop checking. Anything that had to be
 * corrected is listed in `problems` for a development warning — §8 asks for unknown-key
 * diagnostics, and silence here is how a preset with a typo plays the wrong sound forever.
 */
export function validateTngr2(raw, { problems = [] } = {}) {
  const patch = raw || {};
  const d = tngr2Defaults();
  const out = {
    version: TNGR2_SCHEMA_VERSION,
    mode: oneOf(patch.mode, TNGR2_MODES, d.mode),
    glide: clamp(patch.glide, 0, 10, d.glide),
    oscA: validateOsc(patch.oscA, d.oscA, problems, 'oscA'),
    oscB: { on: patch.oscB ? patch.oscB.on !== false : false,
      ...validateOsc(patch.oscB, d.oscB, problems, 'oscB') },
    amp: validateEnv(patch.amp, d.amp),
    positionEnv: validateEnv(patch.positionEnv, d.positionEnv),
    filter: {
      type: oneOf(patch.filter && patch.filter.type, TNGR2_FILTER_TYPES, d.filter.type),
      slope: oneOf(Number(patch.filter && patch.filter.slope), TNGR2_SLOPES, d.filter.slope),
      cutoff: clamp(patch.filter && patch.filter.cutoff, 20, 18000, d.filter.cutoff),
      resonance: clamp(patch.filter && patch.filter.resonance, 0.1, 24, d.filter.resonance),
      keyTrack: clamp(patch.filter && patch.filter.keyTrack, 0, 1, d.filter.keyTrack),
    },
    filterEnv: {
      ...validateEnv(patch.filterEnv, d.filterEnv),
      // TEN, matching the desk's ENV AMOUNT pot (`ENV_OCT_MAX`) rather than the eight this
      // used to say. Opening a filter from the 20 Hz floor to the 18 kHz ceiling is
      // log2(18000/20) — nine and four fifths of an octave — so at eight the top of the
      // dial was a setting the schema quietly threw away, and the identical-looking pot on
      // MRDR-3 honoured what this one did not. The resulting cutoff is clamped to
      // [20, nyquist] in the core either way, so the range costs nothing to widen.
      amount: clamp(patch.filterEnv && patch.filterEnv.amount, -10, 10, d.filterEnv.amount),
    },
    lfo1: validateLfo(patch.lfo1, d.lfo1),
  };
  // Unknown top-level keys are reported, not carried: a key nothing reads is a key that
  // will be believed by somebody eventually.
  const known = new Set(Object.keys(out));
  for (const key of Object.keys(patch)) {
    if (!known.has(key)) problems.push(`unknown key '${key}' is not part of the v1 schema`);
  }
  return out;
}

/**
 * Bring a prototype-shaped patch up to v1.
 *
 * Idempotent: a patch that already says `version: 1` is only validated. The remappings
 * that cannot be inferred from the key name alone are done here and nowhere else.
 */
export function migrateTngr2(raw, { problems = [] } = {}) {
  const patch = raw || {};
  if (patch.version === TNGR2_SCHEMA_VERSION) return validateTngr2(patch, { problems });
  const next = { ...patch };
  // PRESENCE was the switch on the prototype's Osc B; v1 has an explicit flag. A preset
  // that stored an oscB at all meant it to sound.
  if (next.oscB) next.oscB = { on: next.oscB.on !== false, ...next.oscB };
  // `octaves` was the earlier name for the filter envelope's bipolar amount.
  if (next.filterEnv && next.filterEnv.amount === undefined
    && next.filterEnv.octaves !== undefined) {
    next.filterEnv = { ...next.filterEnv, amount: next.filterEnv.octaves };
  }
  if (next.filterEnv) {
    const { octaves, ...rest } = next.filterEnv;
    void octaves;
    next.filterEnv = rest;
  }
  // The prototype gave every oscillator a SECOND position-LFO amount, and there was
  // briefly a six-slot matrix to carry it. Both are gone: across the whole bank the second
  // LFO reached two oscillators in one preset, and a general matrix reached none. What
  // survives is the model the presets were actually authored in — position envelope and
  // one LFO, both onto POSITION — so the second amount is dropped rather than migrated
  // into machinery nothing else uses.
  for (const key of ['oscA', 'oscB']) {
    if (next[key] && next[key].lfo2Amount !== undefined) {
      const { lfo2Amount, ...rest } = next[key];
      void lfo2Amount;
      next[key] = rest;
    }
  }
  delete next.lfo2;
  delete next.mod;
  // OCTAVE + SEMITONE + FINE become INTERVAL + DETUNE — MRDR-3's pair, under MRDR-3's
  // names. Three controls for one idea was two too many, and the octave pot reached three
  // octaves that nothing in the bank ever wanted: the widest interval any preset uses is
  // one octave, and the widest fine offset fourteen cents.
  for (const key of ['oscA', 'oscB']) {
    const osc = next[key];
    if (!osc || (osc.octave === undefined && osc.semitone === undefined && osc.fine === undefined)) continue;
    const { octave, semitone, fine, ...rest } = osc;
    next[key] = {
      ...rest,
      interval: Math.round((Number(octave) || 0) * 12 + (Number(semitone) || 0)),
      detune: Number(fine) || 0,
    };
  }
  // THE POSITION LFO'S DEPTH moved onto the oscillators, and this is where it lands.
  //
  // `lfo1.amount` was one global depth. v1 states it per oscillator as LFO MOVE, which is
  // what makes this a wavetable synth rather than a synth with a wavetable in it: Osc A
  // can walk up its family while Osc B walks down. The core's LFO spec carries a shape, a
  // rate and a phase and no depth at all — see `tngr2CoreParams`.
  //
  // A preset that routes NO oscillator wrote its depth in the only place it had, so it is
  // copied onto every oscillator the patch carries. One that routes even one has already
  // stated the newer model and keeps exactly what it says, because a global amount laid on
  // top of a per-oscillator one would be a depth multiplied by a depth.
  //
  // This was silent before, and the silence had a cost: `validateLfo` returns three keys
  // and dropped `amount` on the way past, so three presets in the bank — tngrGlassChoir,
  // tngrDreamCircuit, tngrScannerSweep — carried an authored LFO depth that reached
  // nothing and played perfectly still. Five others already routed their oscillators and
  // are untouched by this.
  if (next.lfo1 && next.lfo1.amount !== undefined) {
    const depth = Number(next.lfo1.amount) || 0;
    const routed = ['oscA', 'oscB'].some((key) => next[key] && Number(next[key].lfoAmount));
    if (depth && !routed) {
      for (const key of ['oscA', 'oscB']) {
        if (next[key]) next[key] = { ...next[key], lfoAmount: depth };
      }
    }
    const { amount, ...rest } = next.lfo1;
    void amount;
    next.lfo1 = rest;
  }
  // The prototype's tempo-synced LFO goes with it: what this LFO moves is table POSITION,
  // and a timbre snapped to the beat is a rhythm the sequencer already owns. A synced
  // preset keeps its free `rate`, which is the value the pot has always shown.
  if (next.lfo1) { const { sync, division, ...rest } = next.lfo1; void sync; void division; next.lfo1 = rest; }
  // MASTER GAIN and its drive are gone. A patch gain is normalised straight back out by
  // the measured `level` every preset carries, so it was a third loudness control behind
  // the oscillator LEVELs and the desk's own TRIM — three knobs for one job. Drive went
  // with it: it sat AFTER the amp envelope, on the summed lane, which makes it a lane
  // effect rather than anything about the sound, and the desk already has those.
  delete next.master;
  // Five controls nothing ever set. Per-oscillator PAN — the lane has one and STEREO
  // spreads a stack. PHASE MODE and PHASE — seeded is now the only behaviour, which is
  // the one every preset in the bank used. And the position LFO's DELAY and RETRIGGER;
  // the shared Note-card vibrato keeps its own delay, this is the position LFO's.
  for (const key of ['oscA', 'oscB']) {
    if (!next[key]) continue;
    const { pan, phase, phaseMode, ...rest } = next[key];
    void pan; void phase; void phaseMode;
    next[key] = rest;
  }
  if (next.lfo1) {
    const { delay, retrigger, ...rest } = next.lfo1;
    void delay; void retrigger;
    next.lfo1 = rest;
  }
  // The position envelope's HOLD stage went with the rest: nothing used it, and it was
  // the only hold on any melodic engine.
  if (next.positionEnv) { const { hold, ...rest } = next.positionEnv; void hold; next.positionEnv = rest; }
  // A prototype preset never carried a frame rate; the worklet core has no such control.
  delete next.frameSeconds;
  delete next.grainSeconds;
  next.version = TNGR2_SCHEMA_VERSION;
  return validateTngr2(next, { problems });
}

/**
 * A deep snapshot, safe to keep.
 *
 * The editor and the undo history both hold patches, and a shallow copy would let an edit
 * to `oscA.position` reach into the snapshot that was supposed to remember the old value.
 */
export function snapshotTngr2(patch) {
  const out = { ...patch };
  for (const key of ['oscA', 'oscB', 'amp', 'positionEnv', 'filter', 'filterEnv', 'lfo1']) {
    if (out[key]) out[key] = { ...out[key] };
  }
  return out;
}

/**
 * The patch as the DSP core wants it: schema shape in, core shape out.
 *
 * The core takes a tempo and a resolved LFO rate rather than a division name, because it
 * has no idea what a beat is — that is the controller's job to know. Keeping the
 * conversion here means the core never learns about tempo and the schema never learns
 * about sample rates.
 */
export function tngr2CoreParams(patch, { seed = 0, vibrato = null, effects = null } = {}) {
  const p = patch;
  const lfo = (l) => ({ shape: l.shape, rate: l.rate, phase: l.phase });
  return {
    mode: p.mode,
    glide: p.glide,
    seed,
    amp: p.amp,
    positionEnv: p.positionEnv,
    filterEnv: { ...p.filterEnv, amount: p.filterEnv.amount },
    filter: p.filter,
    lfo1: lfo(p.lfo1),
    // The shared Note-card vibrato, which lives on the VOICE rather than in the patch —
    // see `tngr2PatchForVoice`. Depth is in semitones, straight onto pitch.
    ...(vibrato && vibrato.depth > 0 ? { vibrato } : {}),
    // The shared Effects card, same story: `drive`, `shape`, `drivePlace` and `tone` are
    // voice-level keys the drum and MRDR-3 panels write too, so they are not part of the
    // TNGR-2 preset schema and must be carried across rather than validated into it.
    ...(effects && effects.drive > 0 ? effects : {}),
    oscA: p.oscA,
    oscB: p.oscB.on ? p.oscB : { ...p.oscB, on: false },
  };
}
