// MAKE A BANGER — auditions: two bars of a sound doing its real job. 2 Oct 2026.
//
// The Banger Sounds page plays these behind every ▶: a bass plays an off-beat bass line, a
// saw plays pumping chords, a kick plays four on the floor — in A minor (Am | F G) at the
// style's tempo, through the style's own channel strip for that part, so what you hear is
// how the sound sits in a banger rather than how it sounds alone in a preset browser.
// Optionally with a quiet beat under it. Browser-safe: the page builds these, and Node can
// render one to check it sounds.
import {
  L, P, packBank, bassBar, padBar, chordBar, arpBar, shift, diatonic, scaleOf, blank,
} from './theory.js';

const clone = (v) => JSON.parse(JSON.stringify(v));
const AUD_CHORDS = ['Am', ['F', 'G']];
const HOOK = () => [L('A4:2 . C5:2 . E5:2 . C5:2 . A4:3 . . . G4:2 . B4:2 .'), L('A4:2 . C5:2 . F5:2 . C5:2 . E5:4 . . . D5:4 . . .')];

/** Two bars of a slot's job: `phrase` is the slot's `phrase` (sound-rules.js). */
export function phraseBars(phrase, s) {
  const R = s.rhythms; const C = s.centres; const D = s.drums;
  const both = (pat) => [P(pat), P(pat)];
  switch (phrase) {
    case 'hook': return HOOK();
    case 'hook8': return HOOK().map((b) => shift(b, 12));
    case 'third': return HOOK().map((b) => diatonic(b, -2, scaleOf('A', 'minor')));
    case 'busy': return [L('A4:1 C5:1 E5:1 A5:1 E5:1 C5:1 A4:1 C5:1 A4:1 C5:1 E5:1 A5:1 E5:1 C5:1 A4:1 C5:1'),
      L('F4:1 A4:1 C5:1 F5:1 C5:1 A4:1 F4:1 A4:1 G4:1 B4:1 D5:1 G5:1 D5:1 B4:1 G4:1 B4:1')];
    case 'counter': return [L('. . E5:2 . . . C5:2 . . . A4:2 . . . C5:2 .'), L('. . F5:2 . . . C5:2 . . . D5:2 . . . B4:2 .')];
    case 'arp': return AUD_CHORDS.map((c) => arpBar(c, R.arp, C.arp, 1));
    case 'bass': return AUD_CHORDS.map((c) => bassBar(c, R.offbeat, C.bassFloor));
    case 'sub': return AUD_CHORDS.map((c) => bassBar(c, R.subOff, C.subFloor));
    case 'saws': return AUD_CHORDS.map((c) => padBar(c, C.saws, { drop: true }));
    case 'pad': return AUD_CHORDS.map((c) => padBar(c, C.pad));
    case 'stabs': return AUD_CHORDS.map((c) => chordBar(c, R.pianoStabs, C.piano));
    case 'kick': return both(D.kick);
    case 'backbeat': return both(D.clap);
    case 'hats': return both(D.hats16);
    case 'ohats': return both(D.ohats);
    case 'one': return [P(D.crash), P('................')];
    case 'sonar': return [bassBar(AUD_CHORDS[0], 'R:8 . . . . . . . . . . . . . . .', C.sonar || 'A4'), blank()];
    case 'rim': return both(D.rim || '..x...x...x...x.');
    case 'fill': return [P('................'), P(D.fills[0].tom)];
    default: return D.perc[phrase] ? both(D.perc[phrase]) : HOOK();
  }
}

// Which of the style's channel strips a slot sounds through, where its key is not one.
const STRIP_OF = { squareDense: 'square', fallbackMelodic: 'hook', chords: 'saws' };
const DRUM_LANES = ['kick', 'snare', 'clap', 'rim', 'hats', 'ohats', 'crash', 'tom'];

/**
 * A two-bar song of `id` doing `slot`'s job: `{ bank, mix, arrangement }`, ready for
 * Audio.setBank or the offline renderer. `kit` is the style kit (for the beat under it).
 */
export function auditionSong({ slot, id, style: s, kit, beat = true }) {
  const lane = slot.family;
  const bars = [{}, {}];
  phraseBars(slot.phrase, s).forEach((part, i) => { bars[i][lane] = part; });
  const voice = { [`${lane}Voice`]: id };
  const lanes = {};
  const stripKey = STRIP_OF[slot.key] || slot.key;
  const strip = clone(s.strips[stripKey] || s.strips.hook || {});
  if (stripKey === 'saws') strip.effects = [...(strip.effects || []), clone(s.pump)];
  strip.gain = strip.gain ?? 0;
  lanes[lane] = strip;
  if (beat) {
    // The beat under it, a few dB down so the part is the thing being heard.
    for (const [beatLane, pat] of [['kick', s.drums.kick], ['clap', s.drums.clap], ['hats', s.drums.hats8]]) {
      if (beatLane === lane || (lane === 'snare' && beatLane === 'clap')) continue;
      bars.forEach((b) => { b[beatLane] = P(pat); });
      voice[`${beatLane}Voice`] = kit[beatLane];
      lanes[beatLane] = { ...clone(s.strips[beatLane] || {}), gain: (s.strips[beatLane]?.gain ?? 0) - 6 };
    }
  }
  const bank = packBank(bars, { bpm: s.bpm, drums: DRUM_LANES.filter((d) => bars.some((b) => b[d])) });
  const mix = { master: s.master.master, masterEffects: clone(s.master.masterEffects), fx: clone(s.master.fx), voice, lanes };
  return { bank, mix, arrangement: null };
}
