// Ten candidate pianos across four of the soft synths, each playing the same ten-bar
// ballad: a left-hand root, a right-hand chord rolled a few milliseconds, and a melody
// over the top. One tune, ten instruments, so the files A/B against each other.
//
// The patches are catalogue presets, handed to the engine as a song's own `voiceParams`
// so every one plays at the same raw level and the RMS match below is a fair A/B — the
// catalogue's measured levels would re-level them per lane.
//
// What each synth brings to a piano:
//   WNDR-9  real partials: `stretch` is the piano string's own inharmonicity formula
//           (f·n·√(1+B·n²)) and `damp` decays the top of the stack first, which is the
//           single biggest reason a struck string does not sound like an organ.
//   MRDR-3  a hammer: a noise layer gone in 40 ms, and a keytracked filter envelope that
//           opens on the strike and closes over the note.
//   TNGR-2  wavetable position swept by the envelope, bright into dark.
//   RMND-2  two-operator FM with a decaying index — the DX-era answer.
//
// Usage: node tools/render-piano-auditions.js [id ...]
// Writes work/auditions/pianos/<nn>-<id>.wav
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer, dbfs } from './lib/wav.js';
import { VOICES, VOICE_LANES } from '../src/data/voices.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'work', 'auditions', 'pianos');
mkdirSync(outDir, { recursive: true });

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

// ---- the patches -----------------------------------------------------------------------

// Nine harmonic partials in order, for WNDR-9 stacks that are strings rather than drawbars.
const HARMONICS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// In the catalogue (src/data/voices.js, "Pianos, across the synths"), which is the one
// place they are defined; this file only plays them.
const PATCHES = [
  'wndrConcertGrand', 'wndrOldUpright', 'wndrFeltPiano',
  'mrdrGrand', 'mrdrPopGrand', 'mrdrElectricGrand',
  'tngrConcertGrand', 'tngrFeltUpright',
  'rmndDxPiano', 'rmndTineEP',
].map((id) => {
  const { kind, level, peak, songLocal, user, factory, ...voice } = VOICES[id];
  return voice;
});

// ---- the tune --------------------------------------------------------------------------
//
// Ten bars in C, one chord a bar. The left hand plays the root and the fifth above it;
// the right hand strikes a close voicing on beats one and three, under the melody's
// lowest note, so the three parts never cross. The last bar is left empty so the final
// chord rings out.
const BARS = [
  // [bass root, right-hand chord, melody as [midi, steps] pairs summing to 16]
  { root: 48, rh: [55, 60, 64], mel: [[76, 4], [74, 2], [72, 2], [74, 4], [76, 4]] },          // C
  { root: 45, rh: [55, 60, 64], mel: [[76, 6], [79, 2], [76, 4], [74, 4]] },                   // Am7
  { root: 41, rh: [57, 60, 64], mel: [[72, 4], [69, 2], [72, 2], [77, 4], [76, 4]] },          // Fmaj7
  { root: 43, rh: [55, 59, 62], mel: [[74, 8], [null, 4], [71, 2], [72, 2]] },                 // G
  { root: 40, rh: [55, 59, 62], mel: [[74, 4], [76, 2], [79, 2], [83, 4], [81, 2], [79, 2]] }, // Em7
  { root: 45, rh: [57, 60, 64], mel: [[81, 6], [79, 2], [76, 4], [72, 4]] },                   // Am
  { root: 38, rh: [57, 60, 65], mel: [[74, 4], [77, 2], [81, 2], [79, 4], [77, 2], [76, 2]] }, // Dm7
  { root: 43, rh: [55, 59, 62], mel: [[74, 6], [72, 2], [74, 4], [71, 4]] },                   // G
  { root: 36, rh: [55, 60, 64], mel: [[72, 16]] },                                             // C
  { root: null, rh: null, mel: [[null, 16]] },
];

// Flatten into per-step lanes plus per-note lengths (in steps), then cut into the
// two-bar sections a bank is made of.
function lanesFromBars() {
  const steps = BARS.length * 16;
  const lane = () => ({ notes: Array(steps).fill(null), len: Array(steps).fill(null) });
  const bass = lane(); const chords = lane(); const lead = lane();
  BARS.forEach((bar, i) => {
    const s = i * 16;
    const last = i === BARS.length - 2;
    if (bar.root != null) {
      bass.notes[s] = hz(bar.root); bass.len[s] = last ? 16 : 8;
      if (!last) { bass.notes[s + 8] = hz(bar.root + 7); bass.len[s + 8] = 8; }
    }
    if (bar.rh) {
      const chord = bar.rh.map(hz);
      chords.notes[s] = chord; chords.len[s] = last ? 16 : 8;
      if (!last) { chords.notes[s + 8] = chord; chords.len[s + 8] = 8; }
    }
    let at = s;
    for (const [m, n] of bar.mel) {
      if (m != null) { lead.notes[at] = hz(m); lead.len[at] = n; }
      at += n;
    }
  });
  const sections = [];
  for (let s = 0; s < steps; s += 32) {
    sections.push({
      bass: bass.notes.slice(s, s + 32), bassLen: bass.len.slice(s, s + 32),
      chords: chords.notes.slice(s, s + 32), chordsLen: chords.len.slice(s, s + 32),
      lead: lead.notes.slice(s, s + 32), leadLen: lead.len.slice(s, s + 32),
    });
  }
  return sections;
}

const BPM = 80;
const SECTIONS = lanesFromBars();
const PLAYED = ['bass', 'chords', 'lead'];

// The room, and the balance between the hands. One reverb for all ten so the instruments
// are what differs; no delay, which a piano does not have. The chord is rolled 14 ms
// upward — a hand never strikes three keys at exactly the same instant.
function mixFor(patch) {
  const lanes = {
    bass: { gain: -7, send: { delay: 0, reverb: 0.2 } },
    chords: { gain: -6, send: { delay: 0, reverb: 0.22 },
      noteFx: { strum: { enabled: true, direction: 'up', gapMs: 14 } } },
    lead: { gain: 0, send: { delay: 0, reverb: 0.22 } },
  };
  const voiceParams = {};
  for (const l of PLAYED) voiceParams[VOICE_LANES[l].voiceKey] = { ...patch, category: 'Keys', dur: 3 };
  return { voiceParams, lanes, fx: { reverb: { decay: 1.8, preDelay: 0.014 } } };
}

const only = new Set(process.argv.slice(2));
const plan = PATCHES.map((p, i) => ({ ...p, n: i + 1 })).filter((p) => !only.size || only.has(p.id));
if (!plan.length) { console.error(`no patch matches ${[...only].join(', ')}`); process.exit(1); }

const renderer = await openRenderer();
const takes = [];
try {
  for (const patch of plan) {
    const bank = { bpm: BPM, sections: SECTIONS, ...SECTIONS[0] };
    const out = await renderer.render(bank, { repeat: 1, tail: 3, mix: mixFor(patch), trackId: null });
    // Loudness is compared on RMS, not peak: a plucked FM piano and a felt one have very
    // different crest factors, and peak-matching them makes the felt one sound quieter.
    let acc = 0;
    for (let i = 0; i < out.outL.length; i += 16) acc += out.outL[i] ** 2 + out.outR[i] ** 2;
    const rms = Math.sqrt(acc / (2 * Math.ceil(out.outL.length / 16)));
    takes.push({ patch, out, rms });
    console.log(`${String(patch.n).padStart(2)} ${patch.id.padEnd(18)} peak ${dbfs(out.peak).padStart(10)}  rms ${dbfs(rms).padStart(10)}`);
  }
} finally {
  await renderer.close();
}

// Every file at the same RMS, with the common target set by whichever take has the least
// headroom, so none of them clips.
const target = Math.min(...takes.map((t) => (t.rms > 0 ? 0.89 * t.rms / t.out.peak : Infinity)));
console.log('');
for (const { patch, out, rms } of takes) {
  const gain = rms > 0 ? target / rms : 1;
  const file = `${String(patch.n).padStart(2, '0')}-${patch.id}.wav`;
  writeFileSync(join(outDir, file), wavBuffer([out.outL, out.outR], gain));
  console.log(`${file.padEnd(28)} peak ${dbfs(out.peak * gain).padStart(10)}  ${patch.label}`);
}
console.log(`\nwork/auditions/pianos/ — ${takes.length} files, RMS-matched`);
