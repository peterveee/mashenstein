// FRPP-6's Gate A auditions: every candidate in tools/lib/frpp6-candidates.js playing a
// phrase that suits it, plus the same strum on MRDR-3's mrdrAcousticGuitar for A/B.
//
//   node tools/render-frpp6-auditions.js            → work/auditions/frpp6/*.wav
//
// Rendered in Node through the reference core — the same source the worklet will run.
// Chords are strummed through the game's own Note FX processor (src/engine/note-fx.js),
// so what is heard here is the path a song will take. Each file is normalised to a
// -1 dBFS peak so they can be compared by ear; levels between them are not the point.
// The listening index is docs/audio/frpp6-auditions.md.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderFrpp6 } from '../src/engine/frpp6/dsp.js';
import { compileFrpp6 } from '../src/engine/frpp6/tables.js';
import { createNoteFxProcessor } from '../src/engine/note-fx.js';
import { FRPP6_CANDIDATES } from './lib/frpp6-candidates.js';
import { wavBuffer, SR } from './lib/wav.js';
import { VOICES } from '../src/data/voices.js';
import { compileMrdr3, mrdr3Colours } from '../src/engine/mrdr3/compile.js';
import { mrdr3NoiseSet } from '../src/engine/mrdr3/noise.js';
import { renderMrdr3 } from '../src/engine/mrdr3/dsp.js';
import { mrdr3Tables } from '../src/engine/mrdr3/tables.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'work', 'auditions', 'frpp6');
mkdirSync(OUT, { recursive: true });

const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const BPM = 100;
const STEP = 60 / BPM / 4;

// A phrase is a list of hits: [step, midi or [midi…], lengthInSteps, velocity].
const bar = (b, s) => b * 16 + s;
const G = [43, 47, 50, 55, 59, 67];
const C = [48, 52, 55, 60, 64];
const D = [50, 57, 62, 66];
const Em = [40, 47, 52, 55, 59, 64];
const strumBar = (b, chord) => [0, 4, 6, 8, 10, 12, 14].map((s, i) =>
  [bar(b, s), chord, i === 0 ? 3 : 1.6, i % 2 ? 0.75 : 1]);
const PHRASES = {
  strum: { strum: 'up', gap: 11, hits: [
    ...strumBar(0, G), ...strumBar(1, C), ...strumBar(2, D), ...strumBar(3, Em),
    [bar(4, 0), G, 24, 1]] },
  arpeggio: { hits: [[57, 64, 69, 72], [53, 60, 65, 69], [48, 55, 60, 64], [55, 59, 62, 67]]
    .flatMap((ch, b) => [0, 1, 2, 3, 2, 1, 3, 2].map((k, i) => [bar(b, i * 2), ch[k], 6, 0.85]))
    .concat([[bar(4, 0), 45, 16, 1], [bar(4, 0), 57, 16, 0.9], [bar(4, 0), 64, 16, 0.8]]) },
  chug: { hits: [...Array(32).keys()].map((i) =>
    [i * 2, i % 8 === 7 ? [43, 50, 55] : [40, 47, 52], 1.5, i % 4 === 0 ? 1 : 0.8]) },
  roll: { hits: [...Array(64).keys()].map((i) =>
    [i, [55, 59, 67, 50, 62][[0, 1, 2, 0, 1, 2, 3, 4][i % 8]], 3, i % 8 === 0 ? 1 : 0.8]) },
  pentatonic: { hits: [62, 65, 67, 69, 72, 69, 67, 65, 62, 60, 62, 0, 74, 72, 69, 67]
    .map((m, i) => (m ? [i * 4, m, 3.5, 0.9] : null)).filter(Boolean) },
  bass: { hits: [28, 28, 40, 28, 31, 31, 43, 31, 33, 33, 45, 33, 35, 38, 40, 43]
    .flatMap((m, i) => [[i * 4, m, 1.5, 1], [i * 4 + 2, m, 1, 0.75]]) },
  riff: { hits: [48, 0, 60, 48, 0, 55, 58, 0, 48, 0, 60, 63, 0, 60, 58, 55]
    .flatMap((m, i) => (m ? [[i * 2, m, 1.4, 1], [i * 2 + 32, m + (i % 4 === 0 ? 5 : 0), 1.4, 1]] : [])) },
  pad: { hits: [[0, [52, 59, 64, 67], 30, 1], [32, [48, 55, 60, 64], 30, 1]] },
  raga: { legato: true, hits: [[0, 50, 6, 1], [6, 52, 2, 1], [8, 54, 8, 1], [16, 57, 4, 1], [20, 54, 4, 1],
    [24, 52, 8, 1], [32, 50, 4, 1], [36, 49, 4, 1], [40, 50, 16, 1]] },
  drone: { hits: [...Array(4).keys()].flatMap((r) =>
    [[r * 16, 45, 14, 0.9], [r * 16 + 4, 50, 14, 0.8], [r * 16 + 8, 50, 14, 0.8], [r * 16 + 12, 38, 16, 1]]) },
  tremolo: { hits: [...Array(64).keys()].map((i) => [i, i < 32 ? [64, 67] : [62, 66], 0.9, i % 2 ? 0.7 : 1]) },
  lick: { hits: [[0, 64, 2, 1], [2, 67, 2, 1], [4, 69, 4, 1], [8, 67, 2, 0.9], [10, 64, 2, 0.9],
    [12, 62, 2, 0.9], [14, 64, 10, 1], [24, 59, 2, 0.9], [26, 62, 2, 0.9], [28, 64, 20, 1]] },
  // An original pattern in the Chic manner — not the record. Every 16th is a stroke, the
  // hand never stops; most strokes are muted chucks (velocity under MUTED BELOW), a few are
  // accents, and each is chopped short.
  // 'alternate-down' is the Strum direction another thread is adding to note-fx.js; where
  // it is not there yet, an unknown direction strums 'up' and the pattern still plays.
  funk: { strum: 'alternate-down', gap: 6,
    hits: [...Array(64).keys()].map((i) => {
      const accent = [0, 3, 6, 10, 12].includes(i % 16);
      const chord = Math.floor(i / 16) % 2 ? [55, 61, 66, 69] : [55, 62, 66, 71];
      return [i, chord, accent ? 0.6 : 0.4, accent ? 1 : 0.3];
    }) },
  slide: { legato: true, hits: [[0, 52, 4, 1], [4, 55, 4, 1], [8, 57, 8, 1], [16, 59, 2, 1], [18, 57, 2, 1],
    [20, 55, 4, 1], [24, 52, 16, 1]] },
  // Bowed and blown: legato lines whose notes overlap into each other, so the pitch slides
  // rather than restarts — and a section holding chords.
  air: { legato: true, hits: [[0, 69, 8, 0.9], [8, 71, 4, 0.85], [12, 72, 4, 0.9], [16, 76, 12, 1],
    [28, 74, 4, 0.8], [32, 72, 8, 0.9], [40, 71, 4, 0.8], [44, 69, 20, 0.9]] },
  airLow: { legato: true, hits: [[0, 48, 8, 0.9], [8, 50, 4, 0.85], [12, 52, 4, 0.9], [16, 55, 12, 1],
    [28, 53, 4, 0.8], [32, 52, 8, 0.9], [40, 50, 4, 0.8], [44, 48, 20, 0.9]] },
  airHigh: { legato: true, hits: [[0, 76, 6, 0.8], [6, 79, 2, 0.8], [8, 81, 8, 0.9], [16, 83, 4, 1],
    [20, 81, 4, 0.9], [24, 79, 8, 0.85], [32, 76, 4, 0.8], [36, 74, 4, 0.8], [40, 76, 24, 0.9]] },
  section: { hits: [[0, [48, 55, 60, 64], 30, 0.9], [32, [45, 52, 57, 60], 30, 0.9]] },
};
const FUNK_REPEAT = 2;

/** A phrase to core events, strumming chords through the real Note FX processor. */
export function eventsFor(name) {
  const phrase = PHRASES[name];
  const hits = name === 'funk'
    ? [...Array(FUNK_REPEAT).keys()].flatMap((r) => phrase.hits.map(([s, ...rest]) => [s + r * 64, ...rest]))
    : phrase.hits;
  const fx = createNoteFxProcessor();
  const config = phrase.strum ? { strum: { enabled: true, direction: phrase.strum, gapMs: phrase.gap } } : {};
  const events = [];
  let id = 1;
  for (const [step, midi, len, vel] of hits) {
    const tones = (Array.isArray(midi) ? midi : [midi]).map(hz);
    const planned = phrase.strum
      ? fx.process({ laneKey: 'chords', value: tones.length > 1 ? tones : tones[0], len, step,
        spb: STEP * 4, config, barIndex: Math.floor(step / 16) })
      : tones.map((freq) => ({ freq, delay: 0, len }));
    // Legato phrases overlap each note into the next, so the string slides instead of re-plucking.
    for (const e of planned) {
      const dur = (e.len ?? len) * STEP + (phrase.legato ? 0.02 : 0);
      events.push({ type: 'noteOn', frame: Math.round((step * STEP + e.delay) * SR), eventId: id++,
        hz: e.freq, velocity: vel * (e.velocity ?? 1), durFrames: Math.round(dur * SR) });
    }
  }
  const end = Math.max(...events.map((e) => e.frame + e.durFrames)) / SR;
  return { events, seconds: end + 2.5 };
}

export function normalise(channels) {
  let peak = 0;
  for (const ch of channels) for (const v of ch) peak = Math.max(peak, Math.abs(v));
  return peak > 0 ? 0.89 / peak : 1;
}

// Run as a tool; importable for its phrases (work/local A/B scripts).
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
const index = [];
let n = 1;
const write = (id, label, channels, seconds) => {
  const file = `${String(n++).padStart(2, '0')}-${id}.wav`;
  writeFileSync(join(OUT, file), wavBuffer(channels, normalise(channels)));
  index.push({ file, label, seconds });
  console.log(`  ${file.padEnd(32)} ${label}`);
};

console.log(`FRPP-6 auditions → ${OUT}`);
for (const [id, voice] of Object.entries(FRPP6_CANDIDATES)) {
  const { events, seconds } = eventsFor(voice.phrase);
  const patch = compileFrpp6(voice, SR);
  const r = renderFrpp6({ events, seconds, sampleRate: SR, patch });
  write(id, voice.label, r.channels, seconds);
}
{
  // The same strum on what the catalogue plays today.
  const { events, seconds } = eventsFor('strum');
  const r = renderMrdr3({ events, seconds, sampleRate: SR, channels: 2,
    patch: compileMrdr3(VOICES.mrdrAcousticGuitar).patch, tables: mrdr3Tables(),
    noise: mrdr3NoiseSet(SR, mrdr3Colours(VOICES)) });
  write('mrdr3-acoustic-guitar', 'MRDR-3 mrdrAcousticGuitar — the same strum, for A/B', r.channels, seconds);
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2));
}
