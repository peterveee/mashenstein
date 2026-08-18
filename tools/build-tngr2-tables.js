/*
 * Generate TNGR-2's wavetable payload from the authoring in src/engine/tngr2/families.js.
 *
 *   node tools/build-tngr2-tables.js            regenerate src/engine/tngr2/generated-tables.js
 *   node tools/build-tngr2-tables.js --check    fail if the checked-in file is stale
 *   node tools/build-tngr2-tables.js --audition render the C2/C4/C6 sweep to work/auditions
 *
 * What is generated is the SPECTRA, not the samples: 16 families x 32 frames x 96
 * harmonics, quantised to int16 and base64'd — about 130 KB, against the 8 MiB the
 * expanded mip pyramid would be. src/engine/tngr2/tables.js expands it. See the note
 * there for why the spectra are frozen as data at all rather than computed at runtime.
 *
 * Deterministic by construction: the authoring functions are pure, the quantisation is
 * rounding, and the hash is taken over the bytes. Running this twice produces identical
 * output, which is what makes `--check` a meaningful drift alarm rather than noise.
 */
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TNGR2_TABLES, TNGR2_TABLE_IDS, HARMONICS, tngr2Spectrum,
} from '../src/engine/tngr2/families.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/engine/tngr2/generated-tables.js');

/** Bumped by hand when the authoring changes in a way presets should be re-measured for. */
const AUTHORING_VERSION = 1;
const FRAMES = 32;
const BASE_SAMPLES = 2048;
const MIP_LEVELS = 7;
// int16, scaled to fit the loudest coefficient the authoring actually produces: 2.0723,
// spectralPWM's fundamental at frame 15. 15000 leaves that at 31084 with room to spare,
// and gives a step of 6.7e-5 — about 84 dB on a coefficient that is summed with 95
// others and then normalised family-wide, so the quantisation lands far below the noise
// floor of anything that plays it. `clipped` below is the alarm if a family is ever
// authored louder than this.
const SCALE = 15000;

const DESCRIPTIONS = {
  basic: 'Triangle through sine and saw into square — the plain shapes, in one sweep',
  warmHarmonics: 'A soft harmonic roll-off breathing in and out across the table',
  hollowPulse: 'Odd harmonics filling in their even neighbours as the position opens',
  sawForm: 'A saw whose partials are re-weighted into and out of phase-cancelled dips',
  vowelAEIOU: 'Two formant bumps walking the vowel space over a gentle harmonic bed',
  vowelGlass: 'Open vowel harmonics becoming a thin glass spectrum',
  choirBreath: 'Massed vocal formants with a little inharmonic air between them',
  crystal: 'Two narrow partial clusters climbing away from the fundamental',
  alloy: 'Three metallic formant groups spreading into a struck-bar spectrum',
  bellFold: 'Bell partials folding outward from a struck fundamental',
  reedWire: 'A reedy formant pair thinning toward wire as the position rises',
  organShift: 'A drawbar stack leaning from flutes toward the upper registers',
  spectralPWM: 'Pulse-width as a spectral comb rather than a moving edge',
  octaveCascade: 'Partial clusters stepping up in octaves in four discrete stages',
  digitalSteps: 'Four quantised harmonic roots — a stepped, digital sweep',
  darkToAir: 'A dark harmonic bed trading its weight for high air',
};

const spectraFor = () => {
  const total = TNGR2_TABLE_IDS.length * FRAMES * HARMONICS;
  const ints = new Int16Array(total);
  const scratch = new Float64Array(HARMONICS + 1);
  let clipped = 0;
  let at = 0;
  for (const id of TNGR2_TABLE_IDS) {
    for (let frame = 0; frame < FRAMES; frame++) {
      // Frames span the position range endpoint to endpoint, so frame 0 IS position 0
      // and frame 31 IS position 1 — §12.1's "exact position 0/1 endpoints".
      tngr2Spectrum(id, frame / (FRAMES - 1), scratch);
      for (let n = 1; n <= HARMONICS; n++) {
        const q = Math.round(scratch[n] * SCALE);
        if (q > 32767 || q < -32768) clipped++;
        ints[at++] = Math.min(32767, Math.max(-32768, q));
      }
    }
  }
  return { ints, clipped };
};

const build = () => {
  const { ints, clipped } = spectraFor();
  if (clipped) throw new Error(`${clipped} coefficients clipped at the int16 scale — lower SCALE`);
  const bytes = Buffer.from(ints.buffer, ints.byteOffset, ints.byteLength);
  const b64 = bytes.toString('base64');
  const hash = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  const manifest = TNGR2_TABLE_IDS.map((id) => ({
    version: 1,
    id,
    name: TNGR2_TABLES[id].name,
    description: DESCRIPTIONS[id] || TNGR2_TABLES[id].name,
    frames: FRAMES,
    samplesPerFrame: BASE_SAMPLES,
    mipLevels: MIP_LEVELS,
    normalization: 'family-peak',
    source: 'procedural-original',
    authoringVersion: AUTHORING_VERSION,
    hash,
  }));
  return { b64, hash, manifest, bytes: bytes.length };
};

const render = ({ b64, hash, manifest }) => `/*
 * GENERATED by tools/build-tngr2-tables.js — do not edit.
 *
 * The spectra for TNGR-2's sixteen families, expanded into mipped sample tables at
 * runtime by src/engine/tngr2/tables.js. Regenerate with:
 *
 *     node tools/build-tngr2-tables.js
 *
 * tests/tngr2-tables.js fails if this file no longer matches what the authoring in
 * src/engine/tngr2/families.js produces, so a family edited without regenerating is
 * caught rather than silently ignored.
 */

/** sha256 over the payload bytes. Changes whenever any family's authoring changes. */
export const TNGR2_MANIFEST_HASH = ${JSON.stringify(hash)};

/** Coefficients are stored as int16; divide by this to recover the authored amplitude. */
export const TNGR2_SPECTRA_SCALE = ${SCALE};

/** One immutable entry per family, in payload order. */
export const TNGR2_MANIFEST = Object.freeze(${JSON.stringify(manifest, null, 2)
  .split('\n').map((line, i) => (i ? `  ${line}` : line)).join('\n')}.map(Object.freeze));

/** family-major: [family][frame][harmonic 1..96], int16, base64. */
export const TNGR2_SPECTRA_B64 = '${b64}';
`;

const args = process.argv.slice(2);
const built = build();

if (args.includes('--check')) {
  const current = await import('../src/engine/tngr2/generated-tables.js');
  const same = current.TNGR2_SPECTRA_B64 === built.b64
    && current.TNGR2_MANIFEST_HASH === built.hash;
  if (!same) {
    console.error('generated-tables.js is STALE — run: node tools/build-tngr2-tables.js');
    process.exit(1);
  }
  console.log(`generated-tables.js is current (${built.hash})`);
} else if (args.includes('--audition')) {
  // A deterministic sweep per family at C2, C4 and C6 — §6.2. Rendered straight from the
  // expanded tables rather than through a voice, because what is being auditioned is the
  // TABLE: position walking 0 to 1 across the note, at three pitches that put the mip
  // pyramid under real pressure.
  const { tngr2Family, mipLevelFor, mipLength } = await import('../src/engine/tngr2/tables.js');
  // The shared writer, which stamps its own rate into the header — so the sweep renders
  // at that rate rather than carrying a header that disagrees with its samples.
  const { wavBuffer, SR: RATE } = await import('./lib/wav.js');
  const dir = join(ROOT, 'work/auditions/tngr2');
  mkdirSync(dir, { recursive: true });
  const PITCHES = [['C2', 65.406], ['C4', 261.626], ['C6', 1046.502]];
  for (const id of TNGR2_TABLE_IDS) {
    const family = tngr2Family(id);
    for (const [label, hz] of PITCHES) {
      const seconds = 3;
      const frames = Math.round(seconds * RATE);
      const out = new Float32Array(frames);
      const level = Math.round(mipLevelFor(hz, RATE));
      const length = mipLength(level);
      let phase = 0;
      for (let i = 0; i < frames; i++) {
        const position = i / (frames - 1);
        const framePos = position * (family.frames - 1);
        const f0 = Math.floor(framePos);
        const f1 = Math.min(family.frames - 1, f0 + 1);
        const mix = framePos - f0;
        const read = (table) => {
          const x = phase * length;
          const i0 = Math.floor(x);
          const frac = x - i0;
          return table[i0] * (1 - frac) + table[i0 + 1] * frac;
        };
        const a = read(family.levels[level][f0]);
        const b = read(family.levels[level][f1]);
        out[i] = (a * (1 - mix) + b * mix) * 0.5;
        phase += hz / RATE;
        if (phase >= 1) phase -= 1;
      }
      writeFileSync(join(dir, `${id}-${label}.wav`), wavBuffer([out]));
    }
    console.log(`auditioned ${id}`);
  }
  console.log(`\n${TNGR2_TABLE_IDS.length * PITCHES.length} files in work/auditions/tngr2/`);
} else {
  writeFileSync(OUT, render(built));
  console.log(`src/engine/tngr2/generated-tables.js written`);
  console.log(`  ${TNGR2_TABLE_IDS.length} families x ${FRAMES} frames x ${HARMONICS} harmonics`);
  console.log(`  ${(built.bytes / 1024).toFixed(1)} KiB payload, ${built.hash}`);
}
