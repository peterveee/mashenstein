// GENER8's ZAP, the tunes everyone knows. 10 Oct 2026.
//
// Peter, 10 Oct 2026: ZAP should now and then hand you a tune everyone knows — nursery rhymes,
// carols and the classics — named in the floatie as the cabinet riffs are (game-riffs.js). The
// carols come up all year round (Peter: "Xmas tunes all the time, not just holiday season"). Held,
// ZAP lists them all to pick from instead (maker.js). More classics, and the public-domain pieces
// Lemmings (1991) played, came the same day: CAN-CAN 2 is the Galop's first theme.
//
// Every one is out of copyright: traditional, or its composer long dead. Carol of the Bells is
// Leontovych's Shchedryk (1916) — the notes, not the 1936 English words; KOROBEINIKI is the
// Russian folk song, never the game it is known from. Lemmings' other borrowings that are still
// in copyright (How Much Is That Doggie, Mission: Impossible) are not here.
//
// Written as the cabinet riffs are: sixteen sixteenths a bar, NOTE:LENGTH or a rest, G4 to C6, a
// note held past its bar's end carrying its length over the rests of the next. Each tune is moved
// to sit there, in C major or A minor (CAN-CAN, WILLIAM TELL and THE ENTERTAINER in F, FUR ELISE in
// E minor) wherever it has no sharps, so SIMPLE gets it too, converted down to eighths as a cabinet
// riff is. The tunes with sharps are ADVANCED only. Written at about their own pace for a song near
// 124 BPM: a tune's quick notes are the grid's eighths or sixteenths, whichever is nearer. Two bars
// for the two-bar grid; four bars are the line and its answer. Waltzes and 3/8 are squared into four
// (Carol of the Bells, Für Elise). Where a tune's sixteenths are the tune (WILLIAM TELL's gallop,
// SYMPHONY NO. 40), SIMPLE would halve them, so it has its own at half speed in eighths (`only`).
// WILLIAM TELL has no four bars.
//
// Checked against published transcriptions where one could be found (John Chambers' and Colin
// Hume's ABC: CAN-CAN, BINGO, TURKISH MARCH, KOROBEINIKI, THE ENTERTAINER, FUR ELISE, PACHELBEL'S
// CANON, ROUND THE MOUNTAIN, O LITTLE TOWN); the rest from memory.
import { GAME_RIFF_ODDS, gameRiffFits } from './game-riffs.js';

/**
 * One ZAP in this many is a tune, on top of the cabinet riffs' one in three. A dev build hears
 * them far more often (Peter, 10 Oct 2026), so they can be checked by ear.
 */
export const TUNE_ODDS = 1 / 8;
export const TUNE_ODDS_DEV = 1 / 2;
/** A dev build (`npm run dev`), by the same test src/main.js uses for devMode. */
const devBuild = () => typeof window !== 'undefined' && !!window.__MASH_BUILD__;
/** The share of ZAPs that are tunes, in this build. */
export const tuneOdds = () => (devBuild() ? TUNE_ODDS_DEV : TUNE_ODDS);
/** Where a ZAP's draw lands: a cabinet riff, a tune, or ZAP's own random riff. */
export function zapKind(roll) {
  if (roll < GAME_RIFF_ODDS) return 'cabinet';
  return roll < GAME_RIFF_ODDS + tuneOdds() ? 'tune' : 'random';
}

export const TUNES = Object.freeze([
  // ---- two bars
  {
    id: 'twinkle', from: 'TWINKLE TWINKLE', // C major: twinkle, twinkle, little star
    bars: ['C5:3 . . . C5:3 . . . G5:3 . . . G5:3 . . .',
      'A5:3 . . . A5:3 . . . G5:7 . . . . . . .'],
  },
  {
    id: 'lamb', from: 'MARY HAD A LITTLE LAMB', // C major: Mary had a little lamb
    bars: ['E5:3 . . . D5:3 . . . C5:3 . . . D5:3 . . .',
      'E5:3 . . . E5:3 . . . E5:7 . . . . . . .'],
  },
  {
    id: 'frere', from: 'FRERE JACQUES', // C major: frère Jacques, dormez-vous
    bars: ['C5:3 . . . D5:3 . . . E5:3 . . . C5:3 . . .',
      'E5:3 . . . F5:3 . . . G5:7 . . . . . . .'],
  },
  {
    id: 'macdonald', from: 'OLD MACDONALD', // C major: Old MacDonald had a farm
    bars: ['C5:3 . . . C5:3 . . . C5:3 . . . G4:3 . . .',
      'A4:3 . . . A4:3 . . . G4:7 . . . . . . .'],
  },
  {
    id: 'bingo', from: 'BINGO', // C major: B-I-N-G-O, and again a step down, in double time
    bars: ['E5:3 . . . E5:3 . . . F5:2 . F5:2 . F5:3 . . .',
      'D5:3 . . . D5:3 . . . E5:2 . E5:2 . E5:3 . . .'],
  },
  {
    id: 'london-bridge', from: 'LONDON BRIDGE', // C major: London Bridge is falling down
    bars: ['G5:5 . . . . . A5:2 . G5:3 . . . F5:3 . . .',
      'E5:3 . . . F5:3 . . . G5:7 . . . . . . .'],
  },
  {
    id: 'round-the-mountain', from: 'ROUND THE MOUNTAIN', // C major: she'll be coming round the mountain when she comes
    bars: ['C5:2 . C5:2 . C5:2 . C5:2 . A4:2 . G4:2 . G4:2 . A4:2 .',
      'C5:10 . . . . . . . . . . . G4:2 . A4:2 .'],
  },
  {
    id: 'jingle', from: 'JINGLE BELLS', // C major: the chorus's first line, in double time
    bars: ['E5:2 . E5:2 . E5:3 . . . E5:2 . E5:2 . E5:3 . . .',
      'E5:2 . G5:2 . C5:3 . . D5:1 E5:7 . . . . . . .'],
  },
  {
    id: 'deck', from: 'DECK THE HALLS', // C major: deck the halls with boughs of holly
    bars: ['G5:5 . . . . . F5:2 . E5:3 . . . D5:3 . . .',
      'C5:3 . . . D5:3 . . . E5:3 . . . C5:3 . . .'],
  },
  {
    id: 'joy', from: 'JOY TO THE WORLD', // C major: the octave down the scale
    bars: ['C6:3 . . . B5:3 . . A5:1 G5:5 . . . . . F5:2 .',
      'E5:3 . . . D5:3 . . . C5:7 . . . . . . .'],
  },
  {
    id: 'god-rest', from: 'GOD REST YE MERRY', // A minor: rest ye merry, gentlemen — and God, to go round
    bars: ['A4:3 . . . E5:3 . . . E5:3 . . . D5:3 . . .',
      'C5:3 . . . B4:3 . . . A4:3 . . . A4:3 . . .'],
  },
  {
    id: 'carol', from: 'CAROL OF THE BELLS', // A minor: the four-note bell, its 3/4 squared into four
    bars: ['C5:3 . . . B4:2 . C5:2 . A4:5 . . . . . . .',
      'C5:3 . . . B4:2 . C5:2 . A4:5 . . . . . . .'],
  },
  {
    id: 'little-town', from: 'O LITTLE TOWN', // C major, the English tune (Forest Green): O little town of Bethlehem
    bars: ['C5:3 . . . C5:3 . . . C5:3 . . . D5:3 . . .',
      'E5:2 . D5:2 . E5:2 . F5:2 . G5:3 . . . E5:2 . G4:2 .'],
  },
  {
    id: 'ode', from: 'ODE TO JOY', // C major: the first line
    bars: ['E5:3 . . . E5:3 . . . F5:3 . . . G5:3 . . .',
      'G5:3 . . . F5:3 . . . E5:3 . . . D5:3 . . .'],
  },
  {
    id: 'fifth', from: 'FIFTH SYMPHONY', // A minor, from C: da-da-da-DUM, and again a step down
    bars: ['. . E5:1 . E5:1 . E5:1 . C5:8 . . . . . . .',
      '. . D5:1 . D5:1 . D5:1 . B4:8 . . . . . . .'],
  },
  {
    id: 'fur-elise', from: 'FUR ELISE', // E minor, from A so the arpeggio fits: the turn and the first arpeggio, 3/8 squared into four
    bars: ['B5:2 . A#5:2 . B5:2 . A#5:2 . B5:2 . F#5:2 . A5:2 . G5:2 .',
      'E5:7 . . . . . . . . . G4:2 . B4:2 . E5:2 .'],
  },
  {
    id: 'turkish', from: 'TURKISH MARCH', // A minor, as Mozart wrote it: the turn, round to its pickup
    bars: ['C5:2 . . . D5:1 C5:1 B4:1 C5:1 E5:2 . . . F5:1 E5:1 D#5:1 E5:1',
      'B5:1 A5:1 G#5:1 A5:1 B5:1 A5:1 G#5:1 A5:1 C6:3 . . . B4:1 A4:1 G#4:1 A4:1'],
  },
  {
    id: 'symphony-40', from: 'SYMPHONY NO. 40', only: 'advanced', // A minor, from G: the first phrase in sixteenths
    bars: ['E5:2 . F5:1 E5:1 E5:2 . F5:1 E5:1 E5:2 . C6:2 . . . C6:1 B5:1',
      'A5:2 . A5:1 G5:1 F5:2 . F5:1 E5:1 D5:2 . D5:2 . . . F5:1 E5:1'],
  },
  {
    id: 'symphony-40-steady', from: 'SYMPHONY NO. 40', only: 'simple', // the same at half speed, in SIMPLE's eighths
    bars: ['E5:3 . . . F5:2 . E5:2 . E5:3 . . . F5:2 . E5:2 .',
      'E5:3 . . . C6:3 . . . . . . . F5:2 . E5:2 .'],
  },
  {
    id: 'nachtmusik', from: 'EINE KLEINE NACHTMUSIK', // C major, from G: the opening call
    bars: ['C5:3 . . . . . G4:2 . C5:3 . . . . . G4:2 .',
      'C5:2 . G4:2 . C5:2 . E5:2 . G5:3 . . . . . . .'],
  },
  {
    id: 'toccata', from: 'TOCCATA AND FUGUE', // A minor, from D: the mordent and the fall
    bars: ['E5:1 D5:1 E5:11 . . . . . . . . . . . . .',
      'D5:1 C5:1 B4:1 A4:1 G#4:5 . . . . . A4:5 . . . . .'],
  },
  {
    id: 'canon', from: 'PACHELBEL\'S CANON', // C major, from D: the first violin's first entry
    bars: ['E5:3 . . . D5:3 . . . C5:3 . . . B4:3 . . .',
      'A4:3 . . . G4:3 . . . A4:3 . . . B4:3 . . .'],
  },
  {
    id: 'mountain-king', from: 'MOUNTAIN KING', // A minor, from B: the creeping theme
    bars: ['A4:1 . B4:1 . C5:1 . D5:1 . E5:1 . C5:1 . E5:2 . . .',
      'D#5:1 . B4:1 . D#5:2 . . . D5:1 . A#4:1 . D5:2 . . .'],
  },
  {
    id: 'can-can', from: 'CAN-CAN', // C major, from G, as John Chambers' ABC has it: the long note on the downbeat
    bars: ['C5:6 . . . . . . . D5:1 . F5:1 . E5:1 . D5:1 .',
      'G5:2 . . . G5:2 . . . G5:1 . A5:1 . E5:1 . F5:1 .'],
  },
  {
    id: 'can-can-2', from: 'CAN-CAN 2', // C major, from D: the Galop's first theme
    bars: ['G5:1 . D5:1 . D5:1 . E5:1 . D5:1 . C5:1 . C5:1 . E5:1 .',
      'F5:1 . A5:1 . C6:1 . A5:1 . A5:1 . G5:1 . G5:2 . . .'],
  },
  {
    id: 'tell', from: 'WILLIAM TELL', only: 'advanced', // F major: the gallop in sixteenths — ADVANCED, where they are the tune
    bars: ['C5:1 C5:1 C5:1 . C5:1 C5:1 C5:1 . C5:1 C5:1 F5:1 . G5:1 . A5:1 .',
      'C5:1 C5:1 C5:1 . C5:1 C5:1 C5:1 . C5:1 C5:1 F5:1 . G5:1 . A5:1 .'],
  },
  {
    id: 'tell-steady', from: 'WILLIAM TELL', only: 'simple', // F major: the gallop at half speed, in SIMPLE's eighths
    bars: ['C5:1 . C5:1 . C5:2 . . . C5:1 . C5:1 . C5:2 . . .',
      'C5:1 . C5:1 . F5:2 . . . G5:2 . . . A5:2 . . .'],
  },
  {
    id: 'funeral-march', from: 'FUNERAL MARCH', // A minor, from B flat: twice the Lento
    bars: ['A4:3 . . . A4:3 . . A4:1 A4:7 . . . . . . .',
      'C5:3 . . B4:1 B4:3 . . A4:1 A4:3 . . G#4:1 A4:3 . . .'],
  },
  {
    id: 'bride', from: 'HERE COMES THE BRIDE', // C major, from B flat: twice the march's pace
    bars: ['G4:3 . . . C5:3 . . C5:1 C5:7 . . . . . . .',
      'G4:3 . . . D5:3 . . B4:1 C5:7 . . . . . . .'],
  },
  {
    id: 'entertainer', from: 'THE ENTERTAINER', // F major, from C: the first strain's opening, round to its pickup
    bars: ['A4:2 . F5:3 . . . A4:2 . F5:3 . . . A4:2 . F5:14 .',
      '. . . . . . . . . . . . G4:2 . G#4:2 .'],
  },
  {
    id: 'korobeiniki', from: 'KOROBEINIKI', // A minor: the first line
    bars: ['E5:3 . . . B4:2 . C5:2 . D5:3 . . . C5:2 . B4:2 .',
      'A4:3 . . . A4:2 . C5:2 . E5:3 . . . D5:2 . C5:2 .'],
  },
  {
    id: 'big-ben', from: 'BIG BEN', // C major: the hour's last two changes
    bars: ['E5:3 . . . C5:3 . . . D5:3 . . . G4:3 . . .',
      'G4:3 . . . D5:3 . . . E5:3 . . . C5:3 . . .'],
  },
  // ---- four bars: the line and its answer
  {
    id: 'twinkle-4', from: 'TWINKLE TWINKLE', // how I wonder what you are
    bars: ['C5:3 . . . C5:3 . . . G5:3 . . . G5:3 . . .',
      'A5:3 . . . A5:3 . . . G5:7 . . . . . . .',
      'F5:3 . . . F5:3 . . . E5:3 . . . E5:3 . . .',
      'D5:3 . . . D5:3 . . . C5:7 . . . . . . .'],
  },
  {
    id: 'lamb-4', from: 'MARY HAD A LITTLE LAMB', // little lamb, little lamb
    bars: ['E5:3 . . . D5:3 . . . C5:3 . . . D5:3 . . .',
      'E5:3 . . . E5:3 . . . E5:7 . . . . . . .',
      'D5:3 . . . D5:3 . . . D5:7 . . . . . . .',
      'E5:3 . . . G5:3 . . . G5:7 . . . . . . .'],
  },
  {
    id: 'frere-4', from: 'FRERE JACQUES', // every line once: sonnez les matines, ding dang dong
    bars: ['C5:3 . . . D5:3 . . . E5:3 . . . C5:3 . . .',
      'E5:3 . . . F5:3 . . . G5:7 . . . . . . .',
      'G5:2 . A5:2 . G5:2 . F5:2 . E5:3 . . . C5:3 . . .',
      'C5:3 . . . G4:3 . . . C5:7 . . . . . . .'],
  },
  {
    id: 'macdonald-4', from: 'OLD MACDONALD', // E-I-E-I-O, and the pickup round
    bars: ['C5:3 . . . C5:3 . . . C5:3 . . . G4:3 . . .',
      'A4:3 . . . A4:3 . . . G4:7 . . . . . . .',
      'E5:3 . . . E5:3 . . . D5:3 . . . D5:3 . . .',
      'C5:11 . . . . . . . . . . . G4:3 . . .'],
  },
  {
    id: 'bingo-4', from: 'BINGO', // all three spellings, and Bingo was his name-o
    bars: ['E5:3 . . . E5:3 . . . F5:2 . F5:2 . F5:3 . . .',
      'D5:3 . . . D5:3 . . . E5:2 . E5:2 . E5:3 . . .',
      'C5:3 . . . C5:3 . . . D5:2 . D5:2 . D5:2 . C5:2 .',
      'B4:2 . G4:2 . A4:2 . B4:2 . C5:3 . . . C5:2 . G4:2 .'],
  },
  {
    id: 'london-bridge-4', from: 'LONDON BRIDGE', // falling down, falling down
    bars: ['G5:5 . . . . . A5:2 . G5:3 . . . F5:3 . . .',
      'E5:3 . . . F5:3 . . . G5:7 . . . . . . .',
      'D5:3 . . . E5:3 . . . F5:7 . . . . . . .',
      'E5:3 . . . F5:3 . . . G5:7 . . . . . . .'],
  },
  {
    id: 'round-the-mountain-4', from: 'ROUND THE MOUNTAIN', // she'll be coming round the mountain when she comes, twice
    bars: ['C5:2 . C5:2 . C5:2 . C5:2 . A4:2 . G4:2 . G4:2 . A4:2 .',
      'C5:9 . . . . . . . . . . . C5:2 . D5:2 .',
      'E5:2 . E5:2 . E5:2 . E5:2 . G5:2 . E5:2 . D5:2 . C5:2 .',
      'D5:10 . . . . . . . . . . . G4:2 . A4:2 .'],
  },
  {
    id: 'jingle-4', from: 'JINGLE BELLS', // oh what fun it is to ride in a one-horse open sleigh
    bars: ['E5:2 . E5:2 . E5:3 . . . E5:2 . E5:2 . E5:3 . . .',
      'E5:2 . G5:2 . C5:3 . . D5:1 E5:7 . . . . . . .',
      'F5:2 . F5:2 . F5:3 . . F5:1 F5:2 . E5:2 . E5:2 . E5:2 .',
      'E5:2 . D5:2 . D5:2 . E5:2 . D5:3 . . . G5:3 . . .'],
  },
  {
    id: 'deck-4', from: 'DECK THE HALLS', // fa la la la la, la la la la
    bars: ['G5:5 . . . . . F5:2 . E5:3 . . . D5:3 . . .',
      'C5:3 . . . D5:3 . . . E5:3 . . . C5:3 . . .',
      'D5:2 . E5:2 . F5:2 . D5:2 . E5:5 . . . . . D5:2 .',
      'C5:3 . . . B4:3 . . . C5:7 . . . . . . .'],
  },
  {
    id: 'joy-4', from: 'JOY TO THE WORLD', // let earth receive her King
    bars: ['C6:3 . . . B5:3 . . A5:1 G5:5 . . . . . F5:2 .',
      'E5:3 . . . D5:3 . . . C5:5 . . . . . G5:2 .',
      'A5:5 . . . . . A5:2 . B5:5 . . . . . B5:2 .',
      'C6:11 . . . . . . . . . . . . . . .'],
  },
  {
    id: 'god-rest-4', from: 'GOD REST YE MERRY', // let nothing you dismay
    bars: ['A4:3 . . . E5:3 . . . E5:3 . . . D5:3 . . .',
      'C5:3 . . . B4:3 . . . A4:3 . . . G4:3 . . .',
      'A4:3 . . . B4:3 . . . C5:3 . . . D5:3 . . .',
      'E5:11 . . . . . . . . . . . A4:3 . . .'],
  },
  {
    id: 'carol-4', from: 'CAROL OF THE BELLS', // the bell, and the voice a third above it
    bars: ['C5:3 . . . B4:2 . C5:2 . A4:5 . . . . . . .',
      'C5:3 . . . B4:2 . C5:2 . A4:5 . . . . . . .',
      'E5:3 . . . D5:2 . E5:2 . C5:5 . . . . . . .',
      'E5:3 . . . D5:2 . E5:2 . C5:5 . . . . . . .'],
  },
  {
    id: 'little-town-4', from: 'O LITTLE TOWN', // how still we see thee lie
    bars: ['C5:3 . . . C5:3 . . . C5:3 . . . D5:3 . . .',
      'E5:2 . D5:2 . E5:2 . F5:2 . G5:3 . . . E5:3 . . .',
      'F5:3 . . . E5:2 . C5:2 . D5:3 . . . D5:3 . . .',
      'C5:11 . . . . . . . . . . . G4:3 . . .'],
  },
  {
    id: 'ode-4', from: 'ODE TO JOY', // the line and its answer
    bars: ['E5:3 . . . E5:3 . . . F5:3 . . . G5:3 . . .',
      'G5:3 . . . F5:3 . . . E5:3 . . . D5:3 . . .',
      'C5:3 . . . C5:3 . . . D5:3 . . . E5:3 . . .',
      'E5:5 . . . . . D5:2 . D5:7 . . . . . . .'],
  },
  {
    id: 'fifth-4', from: 'FIFTH SYMPHONY', // the opening with its two long holds
    bars: ['. . E5:1 . E5:1 . E5:1 . C5:24 . . . . . . .',
      '. . . . . . . . . . . . . . . .',
      '. . D5:1 . D5:1 . D5:1 . B4:24 . . . . . . .',
      '. . . . . . . . . . . . . . . .'],
  },
  {
    id: 'fur-elise-4', from: 'FUR ELISE', // both arpeggios
    bars: ['B5:2 . A#5:2 . B5:2 . A#5:2 . B5:2 . F#5:2 . A5:2 . G5:2 .',
      'E5:7 . . . . . . . . . G4:2 . B4:2 . E5:2 .',
      'F#5:7 . . . . . . . . . B4:2 . D#5:2 . F#5:2 .',
      'G5:7 . . . . . . . . . B4:2 . . . . .'],
  },
  {
    id: 'turkish-4', from: 'TURKISH MARCH', // down to E, the pickup round
    bars: ['C5:2 . . . D5:1 C5:1 B4:1 C5:1 E5:2 . . . F5:1 E5:1 D#5:1 E5:1',
      'B5:1 A5:1 G#5:1 A5:1 B5:1 A5:1 G#5:1 A5:1 C6:3 . . . A5:2 . C6:2 .',
      'B5:2 . A5:2 . G5:2 . A5:2 . B5:2 . A5:2 . G5:2 . A5:2 .',
      'B5:2 . A5:2 . G5:2 . F#5:2 . E5:3 . . . B4:1 A4:1 G#4:1 A4:1'],
  },
  {
    id: 'symphony-40-4', from: 'SYMPHONY NO. 40', only: 'advanced', // both phrases, the second up to G sharp
    bars: ['E5:2 . F5:1 E5:1 E5:2 . F5:1 E5:1 E5:2 . C6:2 . . . C6:1 B5:1',
      'A5:2 . A5:1 G5:1 F5:2 . F5:1 E5:1 D5:2 . D5:2 . . . E5:1 D5:1',
      'D5:2 . E5:1 D5:1 D5:2 . E5:1 D5:1 D5:2 . B5:2 . . . B5:1 A5:1',
      'G#5:2 . G#5:1 F5:1 E5:2 . E5:1 D5:1 C5:2 . C5:2 . . . F5:1 E5:1'],
  },
  {
    id: 'symphony-40-steady-4', from: 'SYMPHONY NO. 40', only: 'simple', // the first phrase whole, at half speed
    bars: ['E5:3 . . . F5:2 . E5:2 . E5:3 . . . F5:2 . E5:2 .',
      'E5:3 . . . C6:3 . . . . . . . C6:2 . B5:2 .',
      'A5:3 . . . A5:2 . G5:2 . F5:3 . . . F5:2 . E5:2 .',
      'D5:3 . . . D5:3 . . . . . . . F5:2 . E5:2 .'],
  },
  {
    id: 'nachtmusik-4', from: 'EINE KLEINE NACHTMUSIK', // the call and its answer
    bars: ['C5:3 . . . . . G4:2 . C5:3 . . . . . G4:2 .',
      'C5:2 . G4:2 . C5:2 . E5:2 . G5:3 . . . . . . .',
      'F5:3 . . . . . D5:2 . F5:3 . . . . . D5:2 .',
      'F5:2 . D5:2 . B4:2 . D5:2 . G4:3 . . . . . . .'],
  },
  {
    id: 'toccata-4', from: 'TOCCATA AND FUGUE', // the diminished chord stacked up, and A minor
    bars: ['E5:1 D5:1 E5:11 . . . . . . . . . . . . .',
      'D5:1 C5:1 B4:1 A4:1 G#4:5 . . . . . A4:5 . . . . .',
      'G#4:2 . B4:2 . D5:2 . F5:9 . . . . . . . . .',
      'A4:2 . C5:2 . E5:11 . . . . . . . . . . .'],
  },
  {
    id: 'canon-4', from: 'PACHELBEL\'S CANON', // and the eighth notes, an octave up to fit
    bars: ['E5:3 . . . D5:3 . . . C5:3 . . . B4:3 . . .',
      'A4:3 . . . G4:3 . . . A4:3 . . . B4:3 . . .',
      'C5:2 . E5:2 . G5:2 . F5:2 . E5:2 . C5:2 . E5:2 . D5:2 .',
      'C5:2 . A5:2 . C5:2 . G5:2 . F5:2 . A5:2 . G5:2 . F5:2 .'],
  },
  {
    id: 'mountain-king-4', from: 'MOUNTAIN KING', // the theme climbing on to the octave
    bars: ['A4:1 . B4:1 . C5:1 . D5:1 . E5:1 . C5:1 . E5:2 . . .',
      'D#5:1 . B4:1 . D#5:2 . . . D5:1 . A#4:1 . D5:2 . . .',
      'A4:1 . B4:1 . C5:1 . D5:1 . E5:1 . C5:1 . E5:1 . A5:1 .',
      'G5:1 . E5:1 . C5:1 . E5:1 . G5:4 . . . . . . .'],
  },
  {
    id: 'can-can-4', from: 'CAN-CAN', // the whole line, running down to go round
    bars: ['C5:6 . . . . . . . D5:1 . F5:1 . E5:1 . D5:1 .',
      'G5:2 . . . G5:2 . . . G5:1 . A5:1 . E5:1 . F5:1 .',
      'D5:2 . . . D5:2 . . . D5:1 . F5:1 . E5:1 . D5:1 .',
      'C5:1 . C6:1 . B5:1 . A5:1 . G5:1 . F5:1 . E5:1 . D5:1 .'],
  },
  {
    id: 'can-can-2-4', from: 'CAN-CAN 2', // the whole line, to its trill
    bars: ['G5:1 . D5:1 . D5:1 . E5:1 . D5:1 . C5:1 . C5:1 . E5:1 .',
      'F5:1 . A5:1 . C6:1 . A5:1 . A5:1 . G5:1 . G5:2 . . .',
      'A5:1 . B5:1 . B5:1 . A5:1 . G5:1 . C5:1 . C5:1 . E5:1 .',
      'E5:1 . D5:1 . E5:1 . D5:1 . E5:1 . D5:1 . E5:1 . D5:1 .'],
  },
  {
    id: 'funeral-march-4', from: 'FUNERAL MARCH', // at the Lento
    bars: ['A4:7 . . . . . . . A4:5 . . . . . A4:2 .',
      'A4:15 . . . . . . . . . . . . . . .',
      'C5:5 . . . . . B4:2 . B4:5 . . . . . A4:2 .',
      'A4:5 . . . . . G#4:2 . A4:7 . . . . . . .'],
  },
  {
    id: 'bride-4', from: 'HERE COMES THE BRIDE', // at the march's own pace
    bars: ['G4:7 . . . . . . . C5:5 . . . . . C5:2 .',
      'C5:15 . . . . . . . . . . . . . . .',
      'G4:7 . . . . . . . D5:5 . . . . . B4:2 .',
      'C5:15 . . . . . . . . . . . . . . .'],
  },
  {
    id: 'entertainer-4', from: 'THE ENTERTAINER', // the strain's first four bars, the pickup round
    bars: ['A4:2 . F5:3 . . . A4:2 . F5:3 . . . A4:2 . F5:12 .',
      '. . . . . . . . . . F5:2 . G5:2 . G#5:2 .',
      'A5:2 . F5:2 . G5:2 . A5:3 . . . E5:2 . G5:3 . . .',
      'F5:11 . . . . . . . . . . . G4:2 . G#4:2 .'],
  },
  {
    id: 'korobeiniki-4', from: 'KOROBEINIKI', // the line and its answer
    bars: ['E5:3 . . . B4:2 . C5:2 . D5:3 . . . C5:2 . B4:2 .',
      'A4:3 . . . A4:2 . C5:2 . E5:3 . . . D5:2 . C5:2 .',
      'B4:5 . . . . . C5:2 . D5:3 . . . E5:3 . . .',
      'C5:3 . . . A4:3 . . . A4:7 . . . . . . .'],
  },
  {
    id: 'big-ben-4', from: 'BIG BEN', // the hour: all four changes
    bars: ['C5:3 . . . E5:3 . . . D5:3 . . . G4:3 . . .',
      'C5:3 . . . D5:3 . . . E5:3 . . . C5:3 . . .',
      'E5:3 . . . C5:3 . . . D5:3 . . . G4:3 . . .',
      'G4:3 . . . D5:3 . . . E5:3 . . . C5:3 . . .'],
  },
].map((r) => Object.freeze({ ...r, bars: Object.freeze(r.bars) })));

/** ZAP's list (ZAP held, maker.js): every tune once, in this order, with who it is by. */
export const TUNE_LIST = Object.freeze([
  { from: 'TWINKLE TWINKLE', by: 'Nursery rhyme' },
  { from: 'MARY HAD A LITTLE LAMB', by: 'Nursery rhyme' },
  { from: 'FRERE JACQUES', by: 'Nursery rhyme' },
  { from: 'OLD MACDONALD', by: 'Nursery rhyme' },
  { from: 'BINGO', by: 'Nursery rhyme' },
  { from: 'LONDON BRIDGE', by: 'Nursery rhyme · Lemmings' },
  { from: 'ROUND THE MOUNTAIN', by: 'Folk song · Lemmings' },
  { from: 'JINGLE BELLS', by: 'Christmas · Pierpont, 1857' },
  { from: 'DECK THE HALLS', by: 'Christmas · Welsh carol' },
  { from: 'JOY TO THE WORLD', by: 'Christmas · Mason, 1839' },
  { from: 'GOD REST YE MERRY', by: 'Christmas · English carol' },
  { from: 'CAROL OF THE BELLS', by: 'Christmas · Leontovych, 1916' },
  { from: 'O LITTLE TOWN', by: 'Christmas · Lemmings' },
  { from: 'ODE TO JOY', by: 'Beethoven, 1824' },
  { from: 'FIFTH SYMPHONY', by: 'Beethoven, 1808' },
  { from: 'FUR ELISE', by: 'Beethoven, 1810' },
  { from: 'TURKISH MARCH', by: 'Mozart · Lemmings' },
  { from: 'SYMPHONY NO. 40', by: 'Mozart, 1788' },
  { from: 'EINE KLEINE NACHTMUSIK', by: 'Mozart, 1787' },
  { from: 'TOCCATA AND FUGUE', by: 'Bach' },
  { from: 'PACHELBEL\'S CANON', by: 'Pachelbel' },
  { from: 'MOUNTAIN KING', by: 'Grieg, 1875' },
  { from: 'CAN-CAN', by: 'Offenbach, 1858' },
  { from: 'CAN-CAN 2', by: 'Offenbach · Lemmings' },
  { from: 'WILLIAM TELL', by: 'Rossini, 1829' },
  { from: 'FUNERAL MARCH', by: 'Chopin · Lemmings' },
  { from: 'HERE COMES THE BRIDE', by: 'Wagner · Lemmings' },
  { from: 'THE ENTERTAINER', by: 'Joplin, 1902' },
  { from: 'KOROBEINIKI', by: 'Russian folk song' },
  { from: 'BIG BEN', by: 'The Westminster chimes' },
].map((t) => Object.freeze(t)));

/** True when `tune` can land on `mode`'s grid: its notes have rows there, and it is not kept for the other grid. */
export const tuneFits = (tune, mode) => (!tune.only || tune.only === mode) && gameRiffFits(tune, mode);

/** A tune of `bars` bars that fits `mode`, never `lastId` again while there is another; null if none fits. */
export function pickTune(mode, random = Math.random, lastId = null, bars = 2) {
  const fits = TUNES.filter((t) => t.bars.length === bars && tuneFits(t, mode));
  const fresh = fits.length > 1 ? fits.filter((t) => t.id !== lastId) : fits;
  return fresh.length ? fresh[Math.floor(random() * fresh.length)] : null;
}

/**
 * The tune `from` picked off ZAP's list, for a grid in `mode` at `bars` bars: { tune, mode, bars }.
 * Its own version where it has one; else the other length on this grid, then this length on the
 * other grid, then either — `mode` and `bars` then say where the grid has to go to take it.
 */
export function tuneFor(from, mode, bars) {
  const other = (m) => (m === 'simple' ? 'advanced' : 'simple');
  for (const [m, b] of [[mode, bars], [mode, 6 - bars], [other(mode), bars], [other(mode), 6 - bars]]) {
    const tune = TUNES.find((t) => t.from === from && t.bars.length === b && tuneFits(t, m));
    if (tune) return { tune, mode: m, bars: b };
  }
  return null;
}
