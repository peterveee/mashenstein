// Offline MIDI export of a music bank — the same section/order song-form walk
// as the audio renderer, but writing notes instead of samples. The engine
// stores pitches as Hz (seq/chordSeq), so every lane is converted back to a
// note number on the way out. Timbre can't survive the trip: each lane gets the
// GM program that comes closest to its oscillator, and percussion goes to ch10.
import { songBlocks, stepLen, toneLen } from '../../src/engine/lanes.js';

const PPQ = 96;          // ticks per quarter note
const TPS = PPQ / 4;     // ticks per 16th step — the sequencer's grid

const midiNote = (hz) => Math.round(69 + 12 * Math.log2(hz / 440));
const clampNote = (n) => Math.max(0, Math.min(127, n));

// One track per lane. `dur` reads the block's own length override so phrasing
// survives the export; the fallback is the engine's default for that lane. It is
// the LANE's length — a note drawn its own length in the piano roll carries a
// `${lane}Len` entry, and that is read per note at the note itself, below.
// Program bytes are GM number - 1 (the wire format is 0-based).
const LANE_TRACKS = [
  { name: 'Bass', ch: 0, prog: 38, lane: 'bass', dur: (b) => b.bassDur || 1.8, vel: 96 },
  { name: 'Lead', ch: 1, prog: 81, lane: 'lead', dur: (b) => b.leadDur || 1.2, vel: 92 },
  { name: 'Lead Harmony', ch: 2, prog: 81, lane: 'leadHarm', dur: (b) => b.harmDur || b.leadDur || 1.2, vel: 72 },
  // Chords must carry a POLYPHONIC program. This was 82 — Lead 3 (calliope), the
  // closest timbre — but Logic maps GM "Lead" programs onto its stock mono synth
  // leads, and a three-note chord through a mono patch is one note or none. That,
  // not the channel layout, is what kept silencing this track. Pad 3 (polysynth)
  // is the square-family patch that is poly in every GM map.
  { name: 'Chords', ch: 3, prog: 90, lane: 'chords', dur: (b) => b.chordDur || 2.6, vel: 70 },
  { name: 'Organ', ch: 5, prog: 16, lane: 'organChords', dur: (b) => b.organDur || 7.2, vel: 74 },
  { name: 'Twinkle', ch: 6, prog: 10, lane: 'twinkle', dur: (b) => b.twinkleDur || 6, vel: 58 },
  { name: 'Electro FX', ch: 7, prog: 103, lane: 'electroFx', dur: (b) => b.electroFxDur || 0.86, vel: 66 },
  { name: 'Gliss FX', ch: 4, prog: 85, lane: 'gliss', dur: () => 4, vel: 84 },
  { name: 'Organ Swoop', ch: 8, prog: 16, lane: 'organSwoop', dur: (b) => b.organSwoopDur || 3.2, vel: 70 },
  { name: 'Vox', ch: 11, prog: 53, lane: 'vox', dur: () => 1, vel: 88 },
  { name: 'Shout', ch: 12, prog: 53, lane: 'shout', dur: () => 2, vel: 100 },
];

// keyGliss/organGliss are not single notes — the engine plays a run of discrete
// scale steps up into the target (a hand dragged along the white keys), so
// writing one note at the target would drop the whole gesture on the way out.
// Same intervals and same timing as audio.js: eight notes of a natural-minor
// scale rooted on the target, swelling into the landing.
const GLISS_STEPS = [-12, -10, -9, -7, -5, -4, -2, 0];
const RUN_TRACKS = [
  { name: 'Key Gliss', ch: 10, prog: 81, lane: 'keyGliss', span: () => 3, vel: 84 },
  { name: 'Organ Gliss', ch: 13, prog: 16, lane: 'organGliss', span: (b) => b.organGlissSpan || 2.7, vel: 74 },
];

// GM percussion key map. `sweeps` has no MIDI equivalent — it is a filtered
// noise swell with no pitch and no transient — so it is dropped, and the CLI
// reports that rather than pretending the export is complete.
const DRUMS = {
  kick: 36, snare: 38, rim: 37, clap: 39, hats: 42, ohats: 46, crash: 49,
};
const DRUM_VEL = { kick: 110, snare: 96, rim: 84, clap: 92, hats: 80, ohats: 80, crash: 104 };
export const MIDI_UNSUPPORTED_LANES = ['sweeps'];

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
// Track name, and the GM program when patches are on. Deliberately NO initial CC7:
// a channel volume at tick 0 imports into a DAW as a fader/automation point and
// steps on the mix. It was once a guard against silent tracks, but that mystery
// turned out to be a mono patch on the chord lane (see LANE_TRACKS), not a volume.
const voiceMeta = (name, ch, prog, patches) => [
  ...nameMeta(name),
  ...(patches ? [0x00, 0xc0 | ch, prog] : []),
];

const note = (notes, ch, n, tick, lenTicks, vel) => {
  notes.push({ ch, n: clampNote(n), on: tick, off: tick + Math.max(1, Math.round(lenTicks)), vel });
};

// MIDI has no per-voice identity: a note-off is "channel C, pitch P, stop".
// So when a lane retriggers a pitch that is still sounding, the *first* note's
// off silences the *second*. Chord lanes do this constantly — successive
// chords share tones, and the organ's pad is 7.2 steps long over a chord that
// changes every 4 — so without trimming, the pads get chopped by the previous
// chord's release. Each note therefore ends one tick before its own next
// retrigger; a note swallowed whole by an immediate retrigger is dropped.
function toEvents(notes) {
  const byVoice = new Map();
  for (const nt of notes) {
    const key = `${nt.ch}:${nt.n}`;
    if (!byVoice.has(key)) byVoice.set(key, []);
    byVoice.get(key).push(nt);
  }
  const ev = [];
  let trimmed = 0;
  for (const arr of byVoice.values()) {
    arr.sort((a, b) => a.on - b.on);
    arr.forEach((nt, i) => {
      const next = arr[i + 1];
      const off = next ? Math.min(nt.off, next.on - 1) : nt.off;
      if (off <= nt.on) return; // fully swallowed by a retrigger on the same tick
      if (off < nt.off) trimmed++;
      ev.push({ tick: nt.on, data: [0x90 | nt.ch, nt.n, nt.vel] });
      ev.push({ tick: off, data: [0x80 | nt.ch, nt.n, 0] });
    });
  }
  return { ev, trimmed };
}

/**
 * Build a type-1 MIDI file for a bank.
 *
 * @param {object} bank
 * @param {object} [opts]
 * @param {number} [opts.repeat=1]   how many times to walk the song form
 * @param {string} [opts.title]      sequence name written to the tempo track
 * @param {boolean} [opts.patches=false]  write each lane's General MIDI program, so a
 *   DAW picks something like the right sound per track. Everything stays on channel
 *   1: Logic turns a MULTI-channel file into External MIDI tracks routed by channel
 *   — silent until pointed at a device — so the channel split must not ride along
 *   (confirmed twice, most recently 2026-07-28: chords on channel 4 imported as an
 *   External MIDI track). Off by default: with no programs at all, every track opens
 *   as a grand piano and everything plays.
 *
 *   The one landmine with programs on: a chord lane's program must be POLYPHONIC —
 *   see the Chords entry in LANE_TRACKS for the mono-lead trap that silenced it.
 * @param {boolean} [opts.gmChannels=false]  the full GM layout — every lane on its
 *   own MIDI channel with its program, for a hardware module or GM player that
 *   plays all parts through one synth. Do not feed this to Logic (see above).
 * @returns {{buffer, trackNames, tracks, blocks, seconds, trimmed, deadPitches}}
 */
export function midiBuffer(bank, {
  repeat = 1, title = 'MASHENSTEIN', gmChannels = false, patches = gmChannels,
  // The tempo to write into the file, for a caller that knows the song is played at
  // one its bank does not name — the desk saves a retuned tempo onto the song's
  // arrangement (see bpmOf). Defaults to the composed tempo, so nothing changes for a
  // caller that has not thought about it.
  bpm = bank.bpm,
} = {}) {
  const blocks = songBlocks(bank, repeat);
  const tracks = [];
  const trackNames = [];
  // What went into each track, so the CLI can say where a part actually starts. A
  // lane that does not come in until section 3 looks like a broken export if all you
  // do is play the first bars.
  const written = [];
  const record = (name, ch, notes) => {
    written.push({
      name, ch: ch + 1, notes: notes.length,
      firstTick: Math.min(...notes.map((n) => n.on)),
      lastTick: Math.max(...notes.map((n) => n.off)),
    });
  };
  let trimmed = 0;
  // chordSeq() yields [0,0,0] for a chord token it cannot parse, and the engine
  // duly plays those at 0 Hz — silent on a sine organ, a DC thump on a triangle
  // or square chord voice. log2(0) is -Infinity, so writing them out would put a
  // wall of bogus C-1 notes in the file. They are counted and dropped instead.
  let deadPitches = 0;

  // Channel per lane, or everything on channel 1 — see gmChannels. Drums stay on 10
  // either way: that is the one channel number every device agrees means percussion.
  const ch = (want) => (gmChannels ? want : 0);

  // Tempo/meta track. The engine's bpm is the quarter-note tempo.
  const uspq = Math.round(60000000 / bpm);
  tracks.push(track([], [
    ...nameMeta(title),
    0x00, 0xff, 0x51, 0x03, (uspq >> 16) & 0xff, (uspq >> 8) & 0xff, uspq & 0xff,
    0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08, // 4/4
  ]));

  for (const L of LANE_TRACKS) {
    const notes = [];
    blocks.forEach((b, bi) => {
      const lane = b[L.lane];
      if (!lane) return;
      for (let s = 0; s < 32; s++) {
        const v = lane[s];
        if (!v) continue;
        const tick = (bi * 32 + s) * TPS;
        // What the roll drew on this step, if anything: the note-off follows the
        // rectangle rather than the lane, and a chord's tones can differ.
        const len = stepLen(b, L.lane, s);
        // chord lanes hold an array of simultaneous pitches; melodic lanes a scalar
        (Array.isArray(v) ? v : [v]).forEach((hz, i) => {
          if (!(hz > 0)) { deadPitches++; return; }
          note(notes, ch(L.ch), midiNote(hz), tick, toneLen(len, L.dur(b), i) * TPS, L.vel);
        });
      }
    });
    if (!notes.length) continue;
    const { ev, trimmed: t } = toEvents(notes);
    trimmed += t;
    tracks.push(track(ev, voiceMeta(L.name, ch(L.ch), L.prog, patches)));
    trackNames.push(L.name);
    record(L.name, ch(L.ch), notes);
  }

  for (const R of RUN_TRACKS) {
    const notes = [];
    blocks.forEach((b, bi) => {
      const lane = b[R.lane];
      if (!lane) return;
      for (let s = 0; s < 32; s++) {
        if (!(lane[s] > 0)) { if (lane[s]) deadPitches++; continue; }
        const target = midiNote(lane[s]);
        const dt = (R.span(b) * TPS) / GLISS_STEPS.length;
        GLISS_STEPS.forEach((semi, k) => {
          const vel = Math.round(R.vel * (0.6 + 0.4 * ((k + 1) / GLISS_STEPS.length))); // cresc. into the target
          note(notes, ch(R.ch), target + semi, (bi * 32 + s) * TPS + Math.round(k * dt), dt * 1.7, vel);
        });
      }
    });
    if (!notes.length) continue;
    const { ev, trimmed: t } = toEvents(notes);
    trimmed += t;
    tracks.push(track(ev, voiceMeta(R.name, ch(R.ch), R.prog, patches)));
    trackNames.push(R.name);
    record(R.name, ch(R.ch), notes);
  }

  // Drums. One MTrk per kit piece rather than a single lump, so each stem WAV
  // has a MIDI track that lines up with it one-for-one. They all still share
  // channel 10 (0-based 9), which is what makes a GM device play them as a kit.
  for (const [lane, keyNum] of Object.entries(DRUMS)) {
    const notes = [];
    blocks.forEach((b, bi) => {
      if (!b[lane]) return;
      for (let s = 0; s < 32; s++) {
        if (!b[lane][s]) continue;
        note(notes, 9, keyNum, (bi * 32 + s) * TPS, TPS * 0.5, DRUM_VEL[lane] ?? 90);
      }
    });
    if (!notes.length) continue;
    const { ev, trimmed: t } = toEvents(notes);
    trimmed += t;
    const name = `Drums: ${lane}`;
    tracks.push(track(ev, nameMeta(name)));
    trackNames.push(name);
    record(name, 9, notes);
  }

  const header = chunk('MThd', [0, 1, 0, tracks.length, (PPQ >> 8) & 0xff, PPQ & 0xff]);
  return {
    buffer: Buffer.concat([header, ...tracks]),
    trackNames,
    tracks: written,
    ppq: PPQ,
    blocks: blocks.length,
    seconds: (blocks.length * 32 * (60 / bpm)) / 4,
    trimmed,
    deadPitches,
  };
}
