// Offline MIDI export of a music bank — same section/order song-form walk as
// render-track.js, but writing notes instead of samples. The engine stores
// pitches as Hz (seq/chordSeq), so every lane is converted back to a note
// number on the way out. Timbre can't survive the trip: each lane gets the GM
// program that comes closest to its oscillator, and percussion goes to ch10.
// Usage: node tools/render-midi.js [trackId|hub] [repeats] [outPath]
// e.g.:  node tools/render-midi.js hub 1 dist/food-court.mid
import { writeFileSync } from 'fs';
import { CABINET_BY_ID, HUB_THEME } from '../src/data/cabinets.js';

const [, , trackId = 'hub', repeatArg = '1', outArg = null] = process.argv;
const REPEAT = Math.max(1, parseInt(repeatArg, 10) || 1);
const bank = trackId === 'hub' ? HUB_THEME : (CABINET_BY_ID[trackId] || {}).music;
if (!bank) { console.error(`unknown track "${trackId}"`); process.exit(1); }
const OUT = outArg || `dist/${trackId === 'hub' ? 'food-court' : trackId + '-panic'}.mid`;

const PPQ = 96;          // ticks per quarter note
const TPS = PPQ / 4;     // ticks per 16th step — the sequencer's grid

const order = bank.order || (bank.sections ? bank.sections.map((_, i) => i) : [0]);
const blocks = [];
for (let r = 0; r < REPEAT; r++) for (const oi of order) blocks.push(bank.sections ? { ...bank, ...bank.sections[oi] } : bank);

const midiNote = (hz) => Math.round(69 + 12 * Math.log2(hz / 440));

// One track per lane group. dur is in 16th steps, matching the engine's
// `spb * n` note lengths so phrasing survives the export.
const LANES = [
  { name: 'Bass',   ch: 0, prog: 38, lanes: ['bass'],              dur: 1.8, vel: 96 },
  { name: 'Arp',    ch: 1, prog: 81, lanes: ['lead'],              dur: 1.2, vel: 88 },
  { name: 'Harm',   ch: 2, prog: 81, lanes: ['leadHarm'],          dur: 1.2, vel: 72 },
  { name: 'Chords', ch: 3, prog: 82, lanes: ['chords'],            dur: 2.6, vel: 70 },
  { name: 'FX',     ch: 4, prog: 85, lanes: ['gliss', 'keyGliss', 'vox', 'shout'], dur: 3, vel: 84 },
];
const DRUMS = { kick: 36, snare: 38, hats: 42, ohats: 46, clap: 39 };

// ---- MIDI file primitives ---------------------------------------------------
const vlq = (n) => {
  const out = [n & 0x7f];
  for (n >>= 7; n > 0; n >>= 7) out.unshift((n & 0x7f) | 0x80);
  return out;
};
const chunk = (id, bytes) => Buffer.concat([
  Buffer.from(id, 'ascii'),
  Buffer.from([(bytes.length >> 24) & 0xff, (bytes.length >> 16) & 0xff, (bytes.length >> 8) & 0xff, bytes.length & 0xff]),
  Buffer.from(bytes),
]);

// events: {tick, data:[...]} — sorted, delta-encoded, terminated with EOT.
function track(events, meta = []) {
  events.sort((a, b) => a.tick - b.tick || (a.data[0] & 0xf0) - (b.data[0] & 0xf0));
  const bytes = [...meta];
  let prev = 0;
  for (const e of events) { bytes.push(...vlq(e.tick - prev), ...e.data); prev = e.tick; }
  bytes.push(...vlq(0), 0xff, 0x2f, 0x00);
  return chunk('MTrk', bytes);
}
const nameMeta = (s) => [0x00, 0xff, 0x03, s.length, ...Buffer.from(s, 'ascii')];

const note = (ev, ch, n, tick, lenTicks, vel) => {
  ev.push({ tick, data: [0x90 | ch, n, vel] });
  ev.push({ tick: tick + Math.max(1, Math.round(lenTicks)), data: [0x80 | ch, n, 0] });
};

// ---- Walk the song form -----------------------------------------------------
const tracks = [];

// Tempo/meta track. The engine's bpm is the quarter-note tempo.
const uspq = Math.round(60000000 / bank.bpm);
tracks.push(track([], [
  ...nameMeta(trackId === 'hub' ? 'THE FOOD COURT' : trackId.toUpperCase()),
  0x00, 0xff, 0x51, 0x03, (uspq >> 16) & 0xff, (uspq >> 8) & 0xff, uspq & 0xff,
  0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08, // 4/4
]));

for (const L of LANES) {
  const ev = [];
  blocks.forEach((b, bi) => {
    for (let s = 0; s < 32; s++) {
      const tick = (bi * 32 + s) * TPS;
      for (const lane of L.lanes) {
        const v = b[lane] && b[lane][s];
        if (!v) continue;
        for (const hz of Array.isArray(v) ? v : [v]) note(ev, L.ch, midiNote(hz), tick, L.dur * TPS, L.vel);
      }
    }
  });
  if (!ev.length) continue;
  tracks.push(track(ev, [...nameMeta(L.name), 0x00, 0xc0 | L.ch, L.prog]));
}

const dev = [];
blocks.forEach((b, bi) => {
  for (let s = 0; s < 32; s++) {
    const tick = (bi * 32 + s) * TPS;
    for (const [lane, n] of Object.entries(DRUMS)) {
      if (b[lane] && b[lane][s]) note(dev, 9, n, tick, TPS * 0.5, lane === 'kick' ? 110 : 90);
    }
  }
});
if (dev.length) tracks.push(track(dev, nameMeta('Drums')));

const header = chunk('MThd', [0, 1, 0, tracks.length, (PPQ >> 8) & 0xff, PPQ & 0xff]);
writeFileSync(OUT, Buffer.concat([header, ...tracks]));
console.log(`${OUT} — ${tracks.length} tracks, ${blocks.length} blocks (${(blocks.length * 32 * (60 / bank.bpm) / 4).toFixed(1)}s at ${bank.bpm}bpm)`);
