// Woodwinds, auditioned: nine candidates, one slow tune, each moved into its instrument's
// own register — the same A/B render-string-auditions.js makes for the violin family.
//
// MRDR-3 carries most of them because a flute is mostly BREATH, and MRDR-3's noise layer
// is a bandpass that follows the note: at ratio 1 it is air centred on the pitch, which is
// what a flute's tone actually is, and at a higher ratio it is the hiss above it. The rest
// of the kit is what a player does — vibrato that waits before it arrives, a level LFO
// for the flute's breath pulse (its vibrato is as much loudness as pitch), a pitch
// envelope for the shakuhachi's scoop into a note, and a noise burst for the chiff of a
// pipe speaking.
//
// BREATH LEVELS are set by measurement, not by eye: `--breath` prints each patch's air
// against its tone, and the noise gains below were scaled to land on a target per
// instrument, brought down by ear three times: -30 dB for the shakuhachi, -28 for pan
// flute and bansuri, -34 for the flute, -30 to -34 for the purer ones.
//
// How the air is FILTERED mattered more than how loud it was. On the four breathy ones it
// goes through a narrow band sitting on the note (CUTOFF 110 × KEY FOLLOW 1 is the note
// itself, Q 5): the noise layer's own band follows the pitch but has wide skirts, and the
// skirts are the hiss. Picked by ear over a darker lowpass, which changed almost nothing.
// The purer ones keep a pink lowpassed breath; the ocarina keeps the white one Peter liked,
// taken down 4 dB to -30.
//
// The patches are catalogue presets, handed to the engine as a song's own `voiceParams`
// so every one plays at the same raw level and the RMS match below is a fair A/B.
//
// Usage: node tools/render-woodwind-auditions.js [id ...]
// Writes work/auditions/woodwinds/<nn>-<id>.wav
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer, dbfs } from './lib/wav.js';
import { VOICES } from '../src/data/voices.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'work', 'auditions', 'woodwinds');
mkdirSync(outDir, { recursive: true });

// ---- the patches -----------------------------------------------------------------------
//
// The patches are catalogue presets (src/data/voices.js, "Woodwinds"), which is the one
// place they are defined; `root` is the MIDI note the tune's tonic sits on for each.
const ROOTS = {
  mrdrConcertFlute: 69,
  mrdrShakuhachi: 62,
  mrdrPanFlute: 69,
  mrdrRecorder: 72,
  mrdrBansuri: 64,
  mrdrOcarina: 72,
  mrdrClarinet: 55,
  mrdrOboe: 67,
  tngrAirFlute: 69,
};
const PATCHES = Object.entries(ROOTS).map(([id, root]) => {
  const { kind, level, peak, songLocal, user, factory, ...voice } = VOICES[id];
  return { ...voice, root };
});

// ---- the tune --------------------------------------------------------------------------
//
// Eight bars of minor pentatonic, stated in semitones from each instrument's tonic so it
// moves bodily into any register. Long notes on purpose: every vibrato here waits a
// third of a second or more, and on quavers alone you would never hear it arrive. It
// ends on a held tonic so the release is heard.
const TUNE = [
  [[0, 8], [3, 4], [5, 4]],
  [[7, 6], [5, 2], [3, 4], [5, 4]],
  [[7, 4], [10, 4], [12, 8]],
  [[10, 2], [12, 2], [10, 4], [7, 8]],
  [[5, 4], [7, 2], [5, 2], [3, 8]],
  [[0, 4], [3, 4], [5, 6], [3, 2]],
  [[0, 12], [-2, 4]],
  [[0, 16]],
];
const BPM = 72;
// A tongued gap between notes: the last quarter of a step is left silent.
const GAP = 0.25;

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function sectionsFor(rootMidi) {
  if (!TUNE.every((bar) => bar.reduce((sum, [, n]) => sum + n, 0) === 16)) {
    throw new Error('every bar of the tune must add up to 16 steps');
  }
  const steps = TUNE.length * 16;
  const lead = Array(steps).fill(null); const leadLen = Array(steps).fill(null);
  let at = 0;
  for (const bar of TUNE) {
    for (const [s, n] of bar) {
      lead[at] = hz(rootMidi + s); leadLen[at] = n - GAP;
      at += n;
    }
  }
  const out = [];
  for (let s = 0; s < steps; s += 32) out.push({ lead: lead.slice(s, s + 32), leadLen: leadLen.slice(s, s + 32) });
  return out;
}

// Dry-ish, in a hall: woodwinds are judged in a room, and one room for all nine keeps the
// instrument the only thing that differs.
const mixFor = ({ root: _r, n: _n, ...patch }) => ({
  voiceParams: { leadVoice: { ...patch, category: 'Orch', dur: 2 } },
  lanes: { lead: { gain: 0, send: { delay: 0, reverb: 0.3 } } },
  fx: { reverb: { decay: 2.4, preDelay: 0.02 } },
});

const args = process.argv.slice(2);
const BREATH = args.includes('--breath');
const only = new Set(args.filter((a) => !a.startsWith('--')));
const plan = PATCHES.map((p, i) => ({ ...p, n: i + 1 })).filter((p) => !only.size || only.has(p.id));
if (!plan.length) { console.error(`no patch matches ${[...only].join(', ')}`); process.exit(1); }

const rmsOf = (out) => {
  let acc = 0;
  for (let i = 0; i < out.outL.length; i += 16) acc += out.outL[i] ** 2 + out.outR[i] ** 2;
  return Math.sqrt(acc / (2 * Math.ceil(out.outL.length / 16)));
};

// `--breath`: how loud the air is against the tone, per patch, and nothing written.
//
// A noise layer's LEVEL does not read like an oscillator's. MRDR-3 makes up the energy its
// note-following bandpass throws away (`makeup` in _playLayer), so noise at 0.3 arrives
// about as loud as an oscillator at 0.3 — which is a breath as loud as the note. The only
// honest number is the rendered one: each patch played twice, once with its noise layers
// silenced and once with only them, both through the same dry lane.
if (BREATH) {
  const renderer = await openRenderer();
  const silence = (layer, keepNoise) => Object.fromEntries(Object.entries(layer).map(([k, s]) => (
    /^osc\d$/.test(k) && ((s.type === 'noise') !== keepNoise) ? [k, { ...s, gain: 0 }] : [k, s])));
  try {
    for (const patch of plan) {
      if (!patch.layer) { console.log(`${patch.id.padEnd(18)} (no noise layer)`); continue; }
      const secs = sectionsFor(patch.root);
      const bank = { bpm: BPM, sections: secs, ...secs[0] };
      const dry = (p) => ({ ...mixFor(p), lanes: { lead: { gain: 0, send: { delay: 0, reverb: 0 } } } });
      const tone = rmsOf(await renderer.render(bank, { repeat: 1, tail: 1, mix: dry({ ...patch, layer: silence(patch.layer, false) }), trackId: null }));
      const air = rmsOf(await renderer.render(bank, { repeat: 1, tail: 1, mix: dry({ ...patch, layer: silence(patch.layer, true) }), trackId: null }));
      console.log(`${patch.id.padEnd(18)} breath ${(20 * Math.log10(air / tone)).toFixed(1).padStart(6)} dB against the tone`);
    }
  } finally {
    await renderer.close();
  }
  process.exit(0);
}

const renderer = await openRenderer();
const takes = [];
try {
  for (const patch of plan) {
    const secs = sectionsFor(patch.root);
    const bank = { bpm: BPM, sections: secs, ...secs[0] };
    const out = await renderer.render(bank, { repeat: 1, tail: 3, mix: mixFor(patch), trackId: null });
    let acc = 0;
    for (let i = 0; i < out.outL.length; i += 16) acc += out.outL[i] ** 2 + out.outR[i] ** 2;
    const rms = Math.sqrt(acc / (2 * Math.ceil(out.outL.length / 16)));
    takes.push({ patch, out, rms });
    console.log(`${String(patch.n).padStart(2)} ${patch.id.padEnd(18)} peak ${dbfs(out.peak).padStart(10)}  rms ${dbfs(rms).padStart(10)}`);
  }
} finally {
  await renderer.close();
}

// Every file at the same RMS, the common target set by whichever take has the least
// headroom, so none clips.
const target = Math.min(...takes.map((t) => (t.rms > 0 ? 0.89 * t.rms / t.out.peak : Infinity)));
console.log('');
for (const { patch, out, rms } of takes) {
  const gain = rms > 0 ? target / rms : 1;
  const file = `${String(patch.n).padStart(2, '0')}-${patch.id}.wav`;
  writeFileSync(join(outDir, file), wavBuffer([out.outL, out.outR], gain));
  console.log(`${file.padEnd(26)} peak ${dbfs(out.peak * gain).padStart(10)}  ${patch.label}`);
}
console.log(`\nwork/auditions/woodwinds/ — ${takes.length} files, RMS-matched`);
