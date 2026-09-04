/*
 * TNGR-2's wavetable assets — docs/TNGR-2-completion-spec.md §6.1 and §12.1.
 *
 * The claims a table has to satisfy before anything plays it: finite, zero-DC, correctly
 * sized, cyclic, band-limited to the level it belongs to, normalised family-wide rather
 * than per frame, and reproducible from the authoring by a build that anyone can re-run.
 *
 * The last one is the one that rots quietly. `generated-tables.js` is derived data
 * checked into the tree, so the moment someone edits a family in families.js without
 * regenerating, the shipped sound and the authoring disagree — and nothing else in the
 * suite would notice. That check is first here for a reason.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  TNGR2_TABLE_IDS, HARMONICS, tngr2Spectrum,
} from '../src/engine/tngr2/families.js';
import {
  TNGR2_MANIFEST, TNGR2_SPECTRA_B64, TNGR2_SPECTRA_SCALE, TNGR2_MANIFEST_HASH,
} from '../src/engine/tngr2/generated-tables.js';
import {
  tngr2Family, tngr2Spectra, spectrumOffset, mipLevelFor, mipHarmonics, mipLength,
  TNGR2_FRAMES, TNGR2_BASE_SAMPLES, TNGR2_MIP_LEVELS, clearTngr2Families, tngr2TableBytes,
  warmTngr2Families,
} from '../src/engine/tngr2/tables.js';

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

// ---- the payload is what the authoring says today ---------------------------
{
  const total = TNGR2_TABLE_IDS.length * TNGR2_FRAMES * HARMONICS;
  const ints = new Int16Array(total);
  const scratch = new Float64Array(HARMONICS + 1);
  let at = 0;
  for (const id of TNGR2_TABLE_IDS) {
    for (let frame = 0; frame < TNGR2_FRAMES; frame++) {
      tngr2Spectrum(id, frame / (TNGR2_FRAMES - 1), scratch);
      for (let n = 1; n <= HARMONICS; n++) ints[at++] = Math.round(scratch[n] * TNGR2_SPECTRA_SCALE);
    }
  }
  const bytes = Buffer.from(ints.buffer, ints.byteOffset, ints.byteLength);
  const hash = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  assert(hash === TNGR2_MANIFEST_HASH,
    'the checked-in payload still matches the authoring — otherwise: node tools/build-tngr2-tables.js');
  assert(bytes.toString('base64') === TNGR2_SPECTRA_B64, 'the payload bytes round-trip exactly');
  // Determinism: the same authoring, generated twice, is byte-identical.
  const again = new Int16Array(total);
  at = 0;
  for (const id of TNGR2_TABLE_IDS) {
    for (let frame = 0; frame < TNGR2_FRAMES; frame++) {
      tngr2Spectrum(id, frame / (TNGR2_FRAMES - 1), scratch);
      for (let n = 1; n <= HARMONICS; n++) again[at++] = Math.round(scratch[n] * TNGR2_SPECTRA_SCALE);
    }
  }
  assert(Buffer.compare(bytes, Buffer.from(again.buffer, again.byteOffset, again.byteLength)) === 0,
    'generating the payload twice produces identical bytes');
}

// ---- the manifest ------------------------------------------------------------
assert(TNGR2_MANIFEST.length === 16, `sixteen stable factory families (${TNGR2_MANIFEST.length})`);
assert(TNGR2_MANIFEST.every((m, i) => m.id === TNGR2_TABLE_IDS[i]),
  'the manifest is in payload order, so an index means the same family in both');
assert(TNGR2_MANIFEST.every((m) => m.version === 1 && m.frames === 32
  && m.samplesPerFrame === 2048 && m.normalization === 'family-peak'
  && m.source === 'procedural-original' && m.authoringVersion === 1),
'every entry carries the v1 contract: 32 frames, 2048 samples, family-peak, original');
assert(TNGR2_MANIFEST.every((m) => m.hash === TNGR2_MANIFEST_HASH),
  'every entry carries the payload hash, so a stale asset is visible per family');
assert(TNGR2_MANIFEST.every((m) => m.description && m.description !== m.name),
  'every family says what it is, not just what it is called');
assert(new Set(TNGR2_MANIFEST.map((m) => m.description)).size === 16,
  'no two families share a description');
assert(Object.isFrozen(TNGR2_MANIFEST) && TNGR2_MANIFEST.every(Object.isFrozen),
  'the manifest is immutable');

// ---- the mip pyramid ---------------------------------------------------------
assert(mipHarmonics(0) === HARMONICS && mipHarmonics(TNGR2_MIP_LEVELS - 1) === 1,
  `the pyramid runs from ${HARMONICS} harmonics down to one`);
assert(mipLength(0) === TNGR2_BASE_SAMPLES, 'the base level is 2048 samples');
for (let level = 0; level < TNGR2_MIP_LEVELS; level++) {
  if (mipLength(level) < mipHarmonics(level) * 2) {
    fail(`level ${level} is too short (${mipLength(level)}) for ${mipHarmonics(level)} harmonics`);
  }
}
ok('every level is long enough to carry the harmonics it keeps');
// A pitch may only read a level whose top harmonic still fits under Nyquist.
for (const [hz, rate] of [[27.5, 44100], [65.4, 44100], [261.6, 44100], [1046.5, 44100],
  [2093, 48000], [4186, 48000]]) {
  const level = mipLevelFor(hz, rate);
  const top = mipHarmonics(Math.ceil(level)) * hz;
  if (top > rate * 0.5) fail(`${hz} Hz reads level ${level.toFixed(2)}, whose top harmonic is ${top.toFixed(0)} Hz`);
}
ok('no pitch is offered a level with a harmonic above its Nyquist limit');

// ---- every family's samples --------------------------------------------------
const spectra = tngr2Spectra();
assert(spectra.length === 16 * TNGR2_FRAMES * HARMONICS,
  `the decoded spectra are ${spectra.length} coefficients`);

let dcWorst = 0;
let wrapWorst = 0;
let peakWorst = 0;
let quietest = Infinity;
for (const id of TNGR2_TABLE_IDS) {
  const family = tngr2Family(id);
  if (family.levels.length !== TNGR2_MIP_LEVELS) fail(`${id}: ${family.levels.length} mip levels`);
  for (let level = 0; level < family.levels.length; level++) {
    const frames = family.levels[level];
    if (frames.length !== TNGR2_FRAMES) { fail(`${id} level ${level}: ${frames.length} frames`); break; }
    for (let f = 0; f < frames.length; f++) {
      const table = frames[f];
      if (table.length !== mipLength(level) + 1) {
        fail(`${id} L${level} f${f}: ${table.length} samples, expected ${mipLength(level) + 1}`);
        break;
      }
      let sum = 0;
      let peak = 0;
      for (let i = 0; i < table.length - 1; i++) {
        if (!Number.isFinite(table[i])) { fail(`${id} L${level} f${f}: a sample is not finite`); break; }
        sum += table[i];
        peak = Math.max(peak, Math.abs(table[i]));
      }
      dcWorst = Math.max(dcWorst, Math.abs(sum / (table.length - 1)));
      // The wrap sample must equal sample zero, or interpolating across the seam steps.
      wrapWorst = Math.max(wrapWorst, Math.abs(table[table.length - 1] - table[0]));
      if (level === 0) {
        peakWorst = Math.max(peakWorst, peak);
        quietest = Math.min(quietest, peak);
      }
    }
  }
}
assert(dcWorst < 1e-6, `every frame is zero-DC (worst ${dcWorst.toExponential(2)})`);
assert(wrapWorst === 0, `every frame wraps continuously (worst seam ${wrapWorst})`);
assert(peakWorst <= 0.9800001, `no frame exceeds the normalisation ceiling (peak ${peakWorst.toFixed(4)})`);

// Family-peak normalisation, NOT per-frame: exactly one frame per family should touch
// the ceiling, and the quiet frames of a family must stay quiet. Per-frame normalisation
// would put every frame at 0.98 and turn a position sweep into a compressor.
{
  let normalisedPerFrame = 0;
  for (const id of TNGR2_TABLE_IDS) {
    const frames = tngr2Family(id).levels[0];
    const peaks = frames.map((table) => {
      let p = 0;
      for (let i = 0; i < table.length - 1; i++) p = Math.max(p, Math.abs(table[i]));
      return p;
    });
    const atCeiling = peaks.filter((p) => p > 0.9799).length;
    if (atCeiling === peaks.length) normalisedPerFrame++;
  }
  assert(normalisedPerFrame === 0,
    'no family is normalised frame by frame — a position sweep keeps its dynamics');
}
assert(quietest > 0.02, `no family has a silent frame at the base level (quietest ${quietest.toFixed(3)})`);

// ---- band limiting -----------------------------------------------------------
//
// A level must contain no energy above the harmonic it is allowed to keep. Measured by
// correlating the frame against each harmonic it should NOT have.
{
  const family = tngr2Family('sawForm');
  let leak = 0;
  for (let level = 1; level < TNGR2_MIP_LEVELS; level++) {
    const table = family.levels[level][8];
    const length = table.length - 1;
    const keep = mipHarmonics(level);
    for (let n = keep + 1; n <= Math.min(keep * 2, Math.floor(length / 2) - 1); n++) {
      let re = 0;
      let im = 0;
      for (let i = 0; i < length; i++) {
        const a = (i / length) * n * 2 * Math.PI;
        re += table[i] * Math.cos(a);
        im += table[i] * Math.sin(a);
      }
      leak = Math.max(leak, (2 / length) * Math.hypot(re, im));
    }
  }
  assert(leak < 1e-6, `a mip level holds no harmonic it is meant to have dropped (${leak.toExponential(2)})`);
}

// The endpoints are exact: frame 0 IS position 0, and the last frame IS position 1 —
// not position 31/32. A family whose sweep stopped short of its own end would leave the
// most extreme spectrum it was authored with unreachable.
{
  const scratch = new Float64Array(HARMONICS + 1);
  const step = 1 / TNGR2_SPECTRA_SCALE;
  let worst = 0;
  for (const id of TNGR2_TABLE_IDS) {
    const index = TNGR2_TABLE_IDS.indexOf(id);
    for (const [frame, position] of [[0, 0], [TNGR2_FRAMES - 1, 1]]) {
      tngr2Spectrum(id, position, scratch);
      const base = spectrumOffset(index, frame);
      for (let n = 1; n <= HARMONICS; n++) {
        worst = Math.max(worst, Math.abs(spectra[base + n - 1] - scratch[n]));
      }
    }
  }
  assert(worst <= step, `frame 0 is position 0 and the last frame is position 1 `
    + `(worst ${worst.toExponential(2)}, one quantisation step is ${step.toExponential(2)})`);
}

// ---- the runtime keeps its own house -----------------------------------------
{
  const before = tngr2TableBytes();
  assert(before > 0, `expanded families report their cost (${(before / 1024 / 1024).toFixed(2)} MiB for 16)`);
  assert(before < 12 * 1024 * 1024,
    `the whole catalogue fits the 12 MiB budget (${(before / 1024 / 1024).toFixed(2)} MiB)`);
  clearTngr2Families();
  assert(tngr2TableBytes() === 0, 'clearing releases the expanded tables');
  const rebuilt = tngr2Family('alloy');
  assert(rebuilt.levels[0][0][0] === tngr2Family('alloy').levels[0][0][0],
    'a family rebuilt after a clear is the same family');
}

// ---- warming ahead of the first note ------------------------------------------
//
// A family is ~240ms of main thread, and it used to be paid at the first NOTE of the
// voice that wanted it — mid-bar, with the sequencer's queue draining underneath. The
// warm-up moves that to the moment a cabinet is selected and spreads it one family per
// idle slice; what it must NOT do is become a second expansion path, because two
// expansions of the same family are two different Float32Arrays in every node that
// reads one. Identity through `built` is the whole claim.
{
  clearTngr2Families();
  const warmed = await warmTngr2Families(['alloy', 'alloy', 'basic'], { idle: false });
  assert(warmed.length === 2, 'a family already asked for twice is warmed once');
  assert(warmed[0] === tngr2Family('alloy') && warmed[1] === tngr2Family('basic'),
    'a warmed family IS the family tngr2Family hands out — same object, not a copy');
  const cached = await warmTngr2Families(['alloy'], { idle: false });
  assert(cached.length === 0, 'and a family already built is not built again');
  const unknown = await warmTngr2Families(['no-such-family'], { idle: false });
  assert(unknown.length === 1 && unknown[0] === null,
    'an unknown id warms nothing rather than failing the screen that asked');
  assert((await warmTngr2Families([], { idle: false })).length === 0,
    'a song with no TNGR-2 voices asks for nothing');
}

// And the two places that ask. The hub asks when a CABINET IS SELECTED, which is
// minutes of reading a stage list before the shutter closes; run.js keeps its own
// synchronous loop as the fallback for a dev ?stage= URL that never passed through
// the hub at all, where it is now a cache hit rather than the expansion.
{
  const hub = readFileSync(new URL('../src/game/hub/index.js', import.meta.url), 'utf8');
  const run = readFileSync(new URL('../src/game/run.js', import.meta.url), 'utf8');
  assert(/warmTngr2Families\(tngr2Ids\)/.test(hub)
    && /import \{ warmTngr2Families \} from '\.\.\/\.\.\/engine\/tngr2\/tables\.js'/.test(hub)
    && /this\.cab\.songMix\?\.voiceParams/.test(hub),
    'the stage-select screen starts the expansion from the cabinet it just opened');
  assert(/tngr2Family\(osc\.table\)/.test(run),
    'and the stage entry still expands anything that arrived without one');
}

console.log(failed ? `\nTNGR-2 TABLES: ${failed} FAILED` : '\nTNGR-2 TABLES: PASSED');
process.exit(failed ? 1 : 0);
