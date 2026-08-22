/*
 * TNGR-2's preset schema — docs/TNGR-2-completion-spec.md §8 and §12.1.
 *
 * Defaults, validation, migration from the prototype shape, deep snapshots and
 * unknown-key diagnostics. Browserless: a schema that needed a browser would be a schema
 * the editor and the exporters could not both trust.
 *
 * The migration half is the part that matters most, because it runs against real data: the
 * 43 presets in src/data/voices.js were authored against the prototype shape, and every
 * one of them has to come through with the sound it was measured with.
 */
import {
  tngr2Defaults, validateTngr2, migrateTngr2, snapshotTngr2, tngr2CoreParams,
  TNGR2_SCHEMA_VERSION,
} from '../src/engine/tngr2/schema.js';
import { VOICES } from '../src/data/voices.js';
import { isTngr2Table } from '../src/engine/tngr2/families.js';

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

// ---- defaults ----------------------------------------------------------------
{
  const d = tngr2Defaults();
  assert(d.version === TNGR2_SCHEMA_VERSION, 'a fresh patch carries the schema version');
  const problems = [];
  const validated = validateTngr2(d, { problems });
  assert(problems.length === 0, `the defaults validate clean (${problems.join('; ') || 'no problems'})`);
  assert(JSON.stringify(validated) === JSON.stringify(d),
    'validating the defaults returns them unchanged — they are already the contract');
  // Every section §8 names is present, so nothing downstream has to guard for absence.
  for (const key of ['oscA', 'oscB', 'amp', 'positionEnv', 'filter', 'filterEnv', 'lfo1']) {
    if (d[key] === undefined) fail(`the defaults are missing ${key}`);
  }
  ok('the defaults carry every section the schema names');
  assert(d.oscB.on === false, 'a fresh patch has Osc B switched off but fully specified');
  assert(d.positionEnv.hold === undefined && d.positionEnv.release !== undefined,
    'the position envelope is a plain ADSR — the hold stage nothing used is gone');
}

// ---- validation --------------------------------------------------------------
{
  const problems = [];
  const wild = validateTngr2({
    mode: 'chaotic', glide: -5,
    oscA: { table: 'nonesuch', position: 4, unison: 99, interval: 99, detune: 5000, level: -1 },
    filter: { type: 'moog', cutoff: 1e9, resonance: 1e6 },
    filterEnv: { amount: 40 },
    lfo1: { shape: 'zigzag', rate: 1e6, division: '1/3' },
    somethingElse: true,
  }, { problems });
  assert(wild.mode === 'poly', 'an unknown key mode falls back to poly');
  assert(wild.glide === 0, 'a negative glide is clamped to zero');
  assert(wild.oscA.table === 'basic' && isTngr2Table(wild.oscA.table),
    'an unknown table falls back to basic');
  assert(wild.oscA.position === 1 && wild.oscA.unison === 4 && wild.oscA.interval === 24
    && wild.oscA.detune === 50, 'out-of-range oscillator values are clamped to the contract');
  assert(wild.oscA.level === 0, 'a negative level is clamped to silence, not to its default');
  assert(wild.filter.type === 'lowpass' && wild.filter.cutoff === 18000
    && wild.filter.resonance === 24, 'the filter is clamped to its documented range');
  assert(wild.filterEnv.amount === 10, 'the filter envelope amount is clamped to +-10 octaves');
  assert(wild.lfo1.shape === 'sine' && wild.lfo1.rate === 64,
    'an unknown LFO shape falls back and its rate is clamped');
  assert(problems.some((p) => p.includes('nonesuch')), 'the bad table is reported');
  assert(problems.some((p) => p.includes('somethingElse')), 'an unknown key is reported');
  // Nothing throws and nothing comes back missing, whatever went in.
  for (const junk of [null, undefined, {}, 42, 'nonsense', [], { oscA: null }]) {
    const out = validateTngr2(junk);
    if (!out || out.version !== 1 || !out.oscA || !out.amp) fail(`validating ${JSON.stringify(junk)} returned something incomplete`);
  }
  ok('validation never throws and never returns a partial patch');
  // A NaN must not survive as a NaN — §8 says invalid input may never poison the audio.
  const nan = validateTngr2({ oscA: { position: NaN, level: NaN } });
  assert(Number.isFinite(nan.oscA.position) && Number.isFinite(nan.oscA.level),
    'a NaN is replaced by a real number');
}

// ---- migration ---------------------------------------------------------------
{
  const problems = [];
  // The prototype shape, with every difference from v1 present at once.
  const proto = {
    mode: 'mono', portamento: 0.05,
    oscA: { table: 'vowelGlass', position: 0.2, envAmount: 0.4, lfoAmount: 0.1, lfo2Amount: 0.3,
      level: 0.7, octave: -1, semitone: 7, fine: 6 },
    oscB: { table: 'sawForm', position: 0.5, level: 0.3, lfoAmount: 0.25, lfo2Amount: 0.05,
      pan: -0.4, phase: 0.25, phaseMode: 'fixed' },
    amp: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.4 },
    positionEnv: { attack: 1.2, decay: 2, sustain: 0.4 },
    filter: { type: 'lowpass', cutoff: 4000, resonance: 2.4 },
    filterEnv: { octaves: 1.5, attack: 0.1, decay: 0.5, sustain: 0.3 },
    lfo1: { shape: 'triangle', sync: 'tempo', division: '1/8', amount: 0.3,
      delay: 0.4, retrigger: false },
    lfo2: { shape: 'saw', rate: 0.11 },
    frameSeconds: 0.25,
    master: { gain: 0.6 },
  };
  const v1 = migrateTngr2(proto, { problems });
  assert(v1.version === 1, 'a migrated patch is version 1');
  assert(v1.oscB.on === true, 'a prototype oscB that was PRESENT is switched on');
  assert(v1.filterEnv.amount === 1.5, "the filter envelope's `octaves` becomes `amount`");
  assert(v1.filterEnv.octaves === undefined, 'and the old key does not survive');
  assert(v1.lfo1.sync === undefined && v1.lfo1.division === undefined,
    'the prototype tempo sync is dropped — this LFO moves a timbre, not a rhythm');
  assert(v1.lfo1.rate > 0, 'and the LFO keeps a free rate');
  assert(v1.positionEnv.hold === undefined && v1.positionEnv.release !== undefined,
    'the position envelope gains its release stage and keeps no hold');
  assert(v1.filter.keyTrack === 0, 'the keys the prototype never had arrive at their defaults');
  assert(v1.oscA.pan === undefined && v1.oscB.pan === undefined,
    'per-oscillator PAN is gone — the lane has one, and STEREO spreads a stack');
  assert(v1.oscA.phaseMode === undefined && v1.oscA.phase === undefined,
    'and PHASE MODE is gone — the start phase is always seeded from the note');
  assert(v1.lfo1.delay === undefined && v1.lfo1.retrigger === undefined,
    'and the position LFO keeps no delay or retrigger — it starts with the note');
  // OCTAVE + SEMITONE + FINE collapse into MRDR-3's pair: an octave down plus a fifth is
  // -5 semitones, and the fine offset becomes the detune in the cents it was already in.
  assert(v1.oscA.interval === -5 && v1.oscA.detune === 6,
    `octave/semitone/fine become INTERVAL and DETUNE (${v1.oscA.interval}, ${v1.oscA.detune})`);
  assert(v1.oscA.octave === undefined && v1.oscA.semitone === undefined
    && v1.oscA.fine === undefined, 'and the three keys they replaced do not survive');
  assert(v1.oscA.lfoAmount === 0.1, 'the oscillator keeps its own LFO amount');
  // ...and the LFO's own global amount does not survive to compete with it. A patch that
  // routes its oscillators has already said how far each one moves, and a depth laid on
  // top of a depth is a multiplication nobody authored.
  assert(v1.lfo1.amount === undefined && v1.oscB.lfoAmount === 0.25,
    'a routed patch drops the LFO global amount and keeps what each oscillator says');
  assert(v1.oscA.lfo2Amount === undefined && v1.lfo2 === undefined,
    'the prototype second LFO is dropped rather than migrated into machinery nothing uses');
  assert(v1.mod === undefined, 'and there is no mod matrix to migrate it into');
  assert(v1.master === undefined,
    'MASTER GAIN is gone — the measured level normalises a patch gain straight back out');
  assert(!('frameSeconds' in v1), 'the prototype frame rate is dropped — the core has no such control');
  // Idempotent: migrating a v1 patch changes nothing.
  const twice = migrateTngr2(v1);
  assert(JSON.stringify(twice) === JSON.stringify(v1), 'migrating a v1 patch is a no-op');
}

// ---- the depth an UNROUTED prototype stored on the LFO itself -----------------
//
// `lfo1.amount` was the only place a depth could live before the per-oscillator amounts
// existed, and `validateLfo` returns three keys and dropped it on the way past without
// saying so. That is why tngrGlassChoir, tngrDreamCircuit and tngrScannerSweep sat
// perfectly still with a wobble authored on them: the pot moved, the number saved, and
// nothing read it. It now lands on every oscillator the patch carries, which is the one
// reading of "the LFO moves the position this far" that such a patch can have.
{
  const stray = migrateTngr2({
    oscA: { table: 'basic', position: 0.3, level: 0.7 },
    oscB: { table: 'crystal', position: 0.6, level: 0.3 },
    lfo1: { shape: 'sine', rate: 0.08, amount: 0.18 },
  });
  assert(stray.oscA.lfoAmount === 0.18 && stray.oscB.lfoAmount === 0.18,
    'an LFO depth with no oscillator routing reaches every oscillator the patch has');
  assert(stray.lfo1.amount === undefined,
    'and the key it was stored under does not survive the migration');
  const solo = migrateTngr2({
    oscA: { table: 'basic', position: 0.3, level: 0.7 },
    lfo1: { shape: 'sine', rate: 0.08, amount: 0.4 },
  });
  assert(solo.oscA.lfoAmount === 0.4 && solo.oscB.lfoAmount === 0,
    'a one-oscillator patch moves only the oscillator it has');
}

// ---- the filter envelope reaches as far as its pot ---------------------------
//
// The pot is bipolar to ten octaves (`ENV_OCT_MAX`), because opening a filter from the
// 20 Hz floor to the 18 kHz ceiling is log2(18000/20) — nine and four fifths. The schema
// used to clamp at eight, so the top of a dial the desk drew was a setting this quietly
// threw away, and the identical-looking pot on MRDR-3 honoured what this one did not.
{
  assert(validateTngr2({ filterEnv: { amount: 9.5 } }).filterEnv.amount === 9.5,
    'a filter envelope reaches the ten octaves its pot offers');
  assert(validateTngr2({ filterEnv: { amount: -9.5 } }).filterEnv.amount === -9.5,
    'and the same closing from above');
}

// ---- every shipped preset migrates -------------------------------------------
{
  const presets = Object.entries(VOICES).filter(([, v]) => v.synth === 'TNGR-2');
  assert(presets.length > 0, `there are ${presets.length} TNGR-2 presets to migrate`);
  let worst = null;
  let clean = 0;
  for (const [id, voice] of presets) {
    const problems = [];
    const patch = migrateTngr2(voice.tngr2, { problems });
    if (patch.version !== 1) fail(`${id} did not reach version 1`);
    if (!isTngr2Table(patch.oscA.table)) fail(`${id} lost its Osc A table`);
    if (!Number.isFinite(patch.oscA.level)) fail(`${id} lost its Osc A level`);
    // Nothing in the shipped bank should trip a diagnostic: these are the presets the
    // migration was written for, so a warning here means a real mismatch rather than a
    // hand-edited preset.
    if (problems.length) { worst = worst || `${id}: ${problems.join('; ')}`; } else clean++;
  }
  assert(clean === presets.length,
    `all ${presets.length} shipped presets migrate without a single diagnostic${worst ? ` (first: ${worst})` : ''}`);
  // The oscB switch has to survive: a preset that had one must still have one.
  const withB = presets.filter(([, v]) => v.tngr2.oscB).length;
  const onAfter = presets.filter(([, v]) => migrateTngr2(v.tngr2).oscB.on).length;
  assert(withB === onAfter,
    `every preset that had an Osc B still has one switched on (${withB} of ${presets.length})`);
}

// ---- snapshots ---------------------------------------------------------------
{
  const patch = migrateTngr2(tngr2Defaults());
  const snap = snapshotTngr2(patch);
  patch.oscA.position = 0.9;
  patch.amp.attack = 9;
  assert(snap.oscA.position !== 0.9, 'a snapshot does not follow a later edit to a section');
  assert(snap.amp.attack !== 9, 'a snapshot keeps its own copy of every section');
}

// ---- core parameters ---------------------------------------------------------
{
  const patch = migrateTngr2({
    lfo1: { shape: 'sine', rate: 2 },
    oscB: { table: 'basic', level: 0.4 },
  });
  const params = tngr2CoreParams(patch, { seed: 7 });
  assert(params.seed === 7, 'the core gets its seed');
  assert(params.lfo1.rate > 0 && params.lfo1.division === undefined,
    'the LFO reaches the core as a plain frequency, with no notion of a beat');
  assert(params.oscB.on === true, 'a switched-on Osc B reaches the core switched on');
  const off = tngr2CoreParams(migrateTngr2(tngr2Defaults()));
  assert(off.oscB.on === false, 'a switched-off Osc B reaches the core switched off');
}

console.log(failed ? `\nTNGR-2 SCHEMA: ${failed} FAILED` : '\nTNGR-2 SCHEMA: PASSED');
process.exit(failed ? 1 : 0);
