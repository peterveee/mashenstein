// GENER8, in the game — the cabinets' own riffs, for ZAP. 5 Oct 2026.
//
// Peter, 5 Oct 2026: ZAP should sometimes hand you a tune from the game rather than a random
// one. These are the hooks of FIELD SERVICE, SPEED ZONE, FROST FORTRESS and RHYTHM BANKRUPTCY,
// two bars each, read off the songs as the desk hears them (tools/lib/banger/riff.js
// extractRiff) and copied in the remix shorthand: sixteen sixteenths a bar, NOTE:LENGTH or a
// rest. Lengths are rounded to whole sixteenths; the grid has nothing shorter.
//
// Only riffs that fit the grid's G4 to C6 are here. FIELD SERVICE's drop hook dips to F4 in
// A minor, so it is the song's own key change (bars 41–42, B minor) instead, where it sits
// inside. SPEED ZONE's and FROST FORTRESS's other leads run off the grid, so they have one each.
//
// A riff fits SIMPLE only when every note is on its A-minor rows; SIMPLE shows it converted
// down to eighths and ADVANCED keeps the riff as written (maker.js).
import { RIFF_MODES, advancedRow } from './riff.js';

/** One ZAP in this many is a cabinet riff rather than a random one. */
export const GAME_RIFF_ODDS = 1 / 3;

export const GAME_RIFFS = Object.freeze([
  {
    id: 'plumber-hook', from: 'FIELD SERVICE', // bars 41–42: the drop hook, a whole step up
    bars: ['B4:2 . D5:1 F#5:2 . B4:3 . . G4:1 B4:1 D5:2 . F#5:2 . E5:1 D5:1',
      'B4:2 . D5:1 F#5:2 . A5:3 . . G5:1 F#5:1 E5:2 . D5:2 . C#5:1 B4:1'],
  },
  {
    id: 'plumber-answer', from: 'FIELD SERVICE', // bars 13–14: the hook's answer
    bars: ['E5:2 . C5:1 A4:2 . E5:3 . . G5:1 E5:1 C5:2 . D5:2 . B4:1 D5:1',
      'E5:2 . C5:1 A4:2 . A5:3 . . G5:1 F5:1 E5:2 . D5:2 . C5:1 B4:1'],
  },
  {
    id: 'plumber-flute', from: 'FIELD SERVICE', // bars 17–18: the pan-flute whistle
    bars: ['A5:3 . . . E5:1 . C5:3 . . . A4:5 . . . . .',
      'G4:1 . C5:1 . E5:3 . . . D5:3 . . . D5:1 . B4:1 .'],
  },
  {
    id: 'speed-hook', from: 'SPEED ZONE', // bars 9–10
    bars: ['E5:1 . . B4:1 . E5:1 . G5:1 . E5:1 . B4:1 . A4:1 . B4:1',
      'E5:1 . . B4:1 . E5:1 . G5:1 . E5:1 . B4:1 . A4:1 . B4:1'],
  },
  {
    id: 'frost-hook', from: 'FROST FORTRESS', // bars 9–10
    bars: ['D5:1 . F5:1 . A5:1 . F5:1 . D5:1 . . . C5:1 . E5:1 .',
      'D5:1 . F5:1 . A5:1 . F5:1 . D5:1 . . . C5:1 . E5:1 .'],
  },
  {
    id: 'rhythm-hook', from: 'RHYTHM BANKRUPTCY', // bars 17–18: the lead's entrance
    bars: ['C5:2 . . . G5:2 . . G4:2 . A4:2 . E5:2 . . . .',
      'C5:2 . . . G5:2 . . G4:2 . A4:2 . E5:2 . E5:2 . .'],
  },
  {
    id: 'rhythm-arp', from: 'RHYTHM BANKRUPTCY', // bars 29–30
    bars: ['C5:2 . E5:2 G5:2 C5:2 . E5:2 G5:2 . A4:2 . C5:2 . E5:2 . .',
      'C5:2 . E5:2 G5:2 C5:2 . E5:2 G5:2 . A4:2 . C5:2 . E5:2 . .'],
  },
  {
    id: 'rhythm-drop', from: 'RHYTHM BANKRUPTCY', // bars 35–36
    bars: ['A5:2 . E5:2 . D5:2 . E5:2 . A4:2 . . . A5:2 . G5:2 .',
      'A5:2 . E5:2 . D5:2 . E5:2 . A4:2 . . . E5:1 G5:1 A5:1 B5:1'],
  },
].map((r) => Object.freeze({ ...r, bars: Object.freeze(r.bars) })));

const PITCH = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

/** 'F#5' as semitones above A4. */
function semitoneOfName(name) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) throw new Error(`game riff: "${name}" is not a note`);
  return PITCH[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (Number(m[3]) - 4);
}

/** A riff's notes, in order: { step (a sixteenth, 0–31), semi, len }. */
export function gameRiffNotes(riff) {
  const out = [];
  riff.bars.forEach((bar, b) => {
    const tokens = bar.trim().split(/\s+/);
    if (tokens.length !== 16) throw new Error(`game riff ${riff.id}: bar ${b + 1} has ${tokens.length} steps`);
    tokens.forEach((t, i) => {
      if (t === '.') return;
      const [name, len] = t.split(':');
      out.push({ step: b * 16 + i, semi: semitoneOfName(name), len: Math.max(1, Math.round(Number(len) || 1)) });
    });
  });
  return out;
}

/** True when every note of the riff has a row in `mode`. */
export function gameRiffFits(riff, mode) {
  const semis = RIFF_MODES[mode].semis;
  return gameRiffNotes(riff).every((n) => semis.includes(n.semi));
}

/** The riff as an ADVANCED grid: { notes, lengths }, one entry per sixteenth. */
export function gameRiffGrid(riff) {
  const notes = new Array(RIFF_MODES.advanced.steps).fill(-1);
  const lengths = new Array(RIFF_MODES.advanced.steps).fill(0);
  for (const n of gameRiffNotes(riff)) { notes[n.step] = advancedRow(n.semi); lengths[n.step] = n.len; }
  return { notes, lengths };
}

/** A cabinet riff that fits `mode`, never `lastId` again while there is another; null if none fits. */
export function pickGameRiff(mode, random = Math.random, lastId = null) {
  const fits = GAME_RIFFS.filter((r) => gameRiffFits(r, mode));
  const fresh = fits.length > 1 ? fits.filter((r) => r.id !== lastId) : fits;
  return fresh.length ? fresh[Math.floor(random() * fresh.length)] : null;
}
