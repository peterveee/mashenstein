// Eighties slap bass, auditioned: fifteen candidates across three synths. The first seven
// play the same funk line — thumb on the low note, the octave POPPED (the finger hooked under the
// string and pulled so it snaps back onto the frets). Four bars alone, so the attack can
// be judged bare, then four over a quiet beat, so it can be judged where it would live.
// The last eight are the pop pushed further, on a line that is mostly pops (POP_LINE).
//
// The patches are catalogue presets, handed to the engine as a song's own `voiceParams`
// so every one plays at the same raw level and the RMS match below is a fair A/B.
//
// What a slap is, in synth terms: a transient much brighter than the note that follows
// it, gone in well under a tenth of a second, over a round body. The DX7 got there with
// an FM index that falls off a cliff — which is why the DX answers here are RMND-2, the
// two-operator FM engine — and a hybrid adds what FM alone lacks: the fret click (a
// burst of high noise) and the pop's pitch, which starts a few cents sharp because the
// string is stretched as it is pulled.
//
// Usage: node tools/render-slap-bass-auditions.js [id ...]
// Writes work/auditions/slap-bass/<nn>-<id>.wav
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer, dbfs } from './lib/wav.js';
import { VOICES } from '../src/data/voices.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'work', 'auditions', 'slap-bass');
mkdirSync(outDir, { recursive: true });

// ---- the patches -----------------------------------------------------------------------

// In the catalogue (src/data/voices.js, "Slap bass"), which is the one place they are
// defined; this file only plays them. The pops play POP_LINE.
const POPS = new Set(['mrdrMegaPop', 'mrdrFretClack', 'mrdrWirePop', 'mrdrZapPop',
  'rmndMaxPop', 'rmndClangPop', 'rmndSquarePop', 'tngrMegaPop']);
const PATCHES = [
  'rmndDxSlap', 'rmndDxPop', 'rmndDigitalSlap', 'mrdrSlapThumb', 'mrdrSlapPop',
  'mrdrSynthSlap', 'tngrSlap', ...POPS,
].map((id) => {
  const { kind, level, peak, songLocal, user, factory, ...voice } = VOICES[id];
  return { ...voice, ...(POPS.has(id) ? { line: 'pop' } : {}) };
});

// ---- the line --------------------------------------------------------------------------
//
// E minor, then up to A for the answer. Written as [note, steps] per bar, 16 steps to the
// bar; `null` is a rest. Low notes are the thumb, the octave above is the pop — the
// octave-jump pattern every eighties slap part is built on. Almost every note is one step
// long: slap is staccato, and the gaps are half the groove.
const E1 = 28, G1 = 31, A1 = 33, B1 = 35, D2 = 38, E2 = 40, G2 = 43, A2 = 45, B2 = 47, C3 = 48, Cs2 = 37;
const LINE = [
  [[E1, 2], [E2, 1], [E1, 1], [null, 1], [E1, 1], [E2, 1], [null, 1], [G1, 2], [G2, 1], [A1, 1], [null, 1], [B1, 1], [D2, 1], [E2, 1]],
  [[E1, 2], [E2, 1], [E1, 1], [null, 1], [E1, 1], [E2, 1], [D2, 1], [E1, 1], [null, 1], [E2, 1], [G2, 1], [A2, 2], [G2, 1], [E2, 1]],
  [[A1, 2], [A2, 1], [A1, 1], [null, 1], [A1, 1], [A2, 1], [null, 1], [G1, 2], [G2, 1], [A1, 1], [null, 1], [Cs2, 1], [E2, 1], [G2, 1]],
  [[A1, 2], [A2, 1], [A1, 1], [null, 1], [A1, 1], [B2, 1], [C3, 1], [A2, 1], [null, 1], [G2, 1], [E2, 1], [D2, 2], [B1, 1], [G1, 1]],
];

// The pop showcase: the thumb only on the downbeat, everything else popped up where pops
// live (D3–B3), with rests after them so each snap is heard ringing out — and a climb to
// finish that no thumb could play.
const D3 = 50, E3 = 52, G3 = 55, A3 = 57, B3 = 59, Cs3 = 49;
const POP_LINE = [
  [[E1, 2], [E3, 1], [null, 1], [E2, 1], [null, 1], [E3, 2], [null, 2], [D3, 1], [E3, 1], [null, 1], [G2, 1], [A2, 1], [B2, 1]],
  [[E1, 2], [E3, 1], [E1, 1], [null, 1], [G3, 2], [null, 1], [E3, 1], [null, 1], [D3, 1], [E3, 2], [null, 1], [B2, 1], [D3, 1]],
  [[A1, 2], [A2, 1], [null, 1], [G3, 1], [null, 1], [A2, 2], [null, 2], [Cs3, 1], [E3, 1], [null, 1], [G2, 1], [A2, 1], [B2, 1]],
  [[A1, 2], [A3, 1], [null, 1], [G3, 1], [E3, 1], [null, 1], [D3, 1], [E3, 2], [null, 2], [G3, 1], [A3, 1], [null, 1], [B3, 1]],
];
const LINES = { slap: [...LINE, ...LINE], pop: [...POP_LINE, ...POP_LINE] };

// The beat: kick on one and the "and" of two and three, snare on two and four, eighth
// hats. Only in the second half.
const KICK = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0];
const SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
const HATS = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1];
const DRUMS_FROM_BAR = 4;

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function sections(BARS) {
  if (!BARS.every((bar) => bar.reduce((sum, [, n]) => sum + n, 0) === 16)) {
    throw new Error('every bar of a line must add up to 16 steps');
  }
  const steps = BARS.length * 16;
  const bass = Array(steps).fill(null); const bassLen = Array(steps).fill(null);
  const kick = Array(steps).fill(false); const snare = Array(steps).fill(false); const hats = Array(steps).fill(false);
  BARS.forEach((bar, i) => {
    let at = i * 16;
    for (const [m, n] of bar) {
      if (m != null) { bass[at] = hz(m); bassLen[at] = n === 1 ? 0.8 : n - 0.3; }
      at += n;
    }
    if (i >= DRUMS_FROM_BAR) {
      for (let s = 0; s < 16; s++) {
        kick[i * 16 + s] = !!KICK[s]; snare[i * 16 + s] = !!SNARE[s]; hats[i * 16 + s] = !!HATS[s];
      }
    }
  });
  const out = [];
  for (let s = 0; s < steps; s += 32) {
    const cut = (a) => a.slice(s, s + 32);
    out.push({ bass: cut(bass), bassLen: cut(bassLen), kick: cut(kick), snare: cut(snare), hats: cut(hats) });
  }
  return out;
}

const BPM = 104;
const BANKS = Object.fromEntries(Object.entries(LINES).map(([name, bars]) => {
  const secs = sections(bars);
  return [name, { bpm: BPM, sections: secs, ...secs[0] }];
}));

// Bass dry and up front; the kit well under it, in a little room, so it keeps time
// without masking the attack being judged.
const mixFor = ({ line, n, ...patch }) => ({
  voiceParams: { bassVoice: { ...patch, category: 'Bass', dur: 1 } },
  lanes: {
    bass: { gain: 0, send: { delay: 0, reverb: 0 } },
    kick: { gain: -9, send: { delay: 0, reverb: 0.08 } },
    snare: { gain: -11, send: { delay: 0, reverb: 0.25 } },
    hats: { gain: -16, send: { delay: 0, reverb: 0 } },
  },
  fx: { reverb: { decay: 1.1, preDelay: 0.01 } },
});

const only = new Set(process.argv.slice(2));
const plan = PATCHES.map((p, i) => ({ ...p, n: i + 1 })).filter((p) => !only.size || only.has(p.id));
if (!plan.length) { console.error(`no patch matches ${[...only].join(', ')}`); process.exit(1); }

// The kit sits this far under the bass, measured on RMS over the bars both play.
const DRUMS_UNDER_DB = 10;

const rmsOf = (out, from = 0, to = out.outL.length) => {
  let acc = 0, n = 0;
  for (let i = from; i < to; i += 8) { acc += out.outL[i] ** 2 + out.outR[i] ** 2; n += 2; }
  return Math.sqrt(acc / Math.max(1, n));
};

// Bass and kit rendered as separate stems and summed here, because the patches arrive
// unmeasured — each would otherwise reach the lane at its own raw level and the kit
// would sit somewhere different under every one. Stems sum back to the mix exactly
// (render-bank-browser seeds them identically), so this is the same render, balanced.
const BASS = new Set(['bass']);
const KIT = new Set(['kick', 'snare', 'hats']);
const drumsFrom = Math.floor(DRUMS_FROM_BAR * 4 * (60 / BPM) * 44100);

const renderer = await openRenderer();
const takes = [];
let kit;
try {
  // One kit for both lines: the beat is the same eight bars under either.
  kit = await renderer.render(BANKS.slap, { repeat: 1, tail: 1.5, mix: mixFor(PATCHES[0]), trackId: null, lanes: KIT });
  const kitRms = rmsOf(kit, drumsFrom);
  for (const patch of plan) {
    const bank = BANKS[patch.line || 'slap'];
    const bass = await renderer.render(bank, { repeat: 1, tail: 1.5, mix: mixFor(patch), trackId: null, lanes: BASS });
    const rms = rmsOf(bass);
    const kitGain = rms > 0 ? (rmsOf(bass, drumsFrom) / kitRms) * 10 ** (-DRUMS_UNDER_DB / 20) : 0;
    const n = Math.min(bass.outL.length, kit.outL.length);
    const L = new Float32Array(n), R = new Float32Array(n);
    let peak = 0;
    for (let i = 0; i < n; i++) {
      L[i] = bass.outL[i] + kit.outL[i] * kitGain;
      R[i] = bass.outR[i] + kit.outR[i] * kitGain;
      peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    }
    takes.push({ patch, out: { outL: L, outR: R, peak }, rms });
    console.log(`${String(patch.n).padStart(2)} ${patch.id.padEnd(16)} peak ${dbfs(peak).padStart(10)}  bass rms ${dbfs(rms).padStart(10)}`);
  }
} finally {
  await renderer.close();
}

// Same bass RMS in every file; the common target is set by whichever take has the least
// headroom, so none clips.
const target = Math.min(...takes.map((t) => (t.rms > 0 ? 0.89 * t.rms / t.out.peak : Infinity)));
console.log('');
for (const { patch, out, rms } of takes) {
  const gain = rms > 0 ? target / rms : 1;
  const file = `${String(patch.n).padStart(2, '0')}-${patch.id}.wav`;
  writeFileSync(join(outDir, file), wavBuffer([out.outL, out.outR], gain));
  console.log(`${file.padEnd(26)} peak ${dbfs(out.peak * gain).padStart(10)}  ${patch.label}`);
}
console.log(`\nwork/auditions/slap-bass/ — ${takes.length} files, bass RMS-matched`);
