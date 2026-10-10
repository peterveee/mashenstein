// BUILD TYPE and BEFORE THE DROP — the ways a build can climb, and what the band does on the bar
// before the drop (9 Oct 2026). Peter: after the breakdown, the build was the most predictable part —
// the same snare roll into the same last bar, twice a song.
//
// The tables are what the dialog's lists and the Form row's Plays list show (ways.js for the shape).
// A build's way is played in sections.js (BUILD_DRUMS, and the hook for Hook Loop); a way before the
// drop is applied to the build's last bar once the drop after it exists (sections.js applyDropIn).
// Varied draws one for each build, never the same as the build before it in the song.
//
// The run-up EFFECT on that last bar (Spot FX → Into a Drop: the stutter and its variations) is
// separate and still rotates on its own; a way that silences the bar silences the run-up with it.
//
// PAIRS THAT UNDO EACH OTHER (Peter, 9 Oct 2026: "rule out bad ones") — Varied never draws them; a way
// picked by name is played as asked. On a build way:
//   notInto   the ways before the drop it never goes into — Hook Alone takes away the last bar, which
//             is a roll's climax; Drop-Out takes the kick away just as a Kick Roll peaks, and has
//             nothing to take away from a Drumless build
//   notAfter  the breakdowns it never follows: true for any (Drumless after a drumless breakdown is a
//             dozen bars and more with no drums), or the breakdown ways it does not follow (Muffled
//             Groove after a Muffled breakdown is one long opening, not two)
//
// ADDING A WAY: an entry here, its drums in BUILD_DRUMS (or its move in applyDropIn), and it can be
// picked by name; `varied: true` puts it in the draw. A kept Lab song is made again from its recipe
// every time it plays, so a way joining a draw says `since` the WAYS ERA it joined in (ways.js).
import { notFor } from './ways.js';
export const BUILD_WAYS = Object.freeze([
  { id: 'roll', label: 'Snare Roll', note: 'The snare rolling faster and faster, the clap out for the second half — the classic', varied: true, notInto: ['solo'] },
  { id: 'kick', label: 'Kick Roll', note: 'No snare: the kick doubles up — fours, then eighths, then sixteenths', varied: true, notInto: ['solo', 'dropout'],
    notFor: notFor(['chill', 'disco', 'latin'], { moods: true, styles: ['uk-garage'] }) },
  { id: 'dotted', label: 'Dotted Roll', note: 'The snare in dotted eighths, tumbling against the beat, sixteenths for the last bar', varied: true, notInto: ['solo'],
    notFor: notFor(['chill', 'disco', 'latin']) },
  { id: 'loop', label: 'Hook Loop', note: 'The hook\'s opening looping shorter and shorter — half a bar, a beat, half a beat — over the roll', varied: true, notInto: ['solo'] },
  { id: 'muffled', label: 'Muffled Groove', note: 'No roll: the drop\'s groove with the whole mix under a low-pass, opening up', varied: true, notAfter: ['muffled'] },
  { id: 'drumless', label: 'Drumless', note: 'No drums at all — the chords, the hook and the riser climbing alone', varied: true, notInto: ['dropout'], notAfter: true },
]);
export const DROP_IN_WAYS = Object.freeze([
  { id: 'straight', label: 'Straight In', note: 'Everything right up to the bar line — the classic', varied: true },
  { id: 'gap', label: 'The Gap', note: 'Everything stops for the last beat: a beat of silence, then the drop', varied: true },
  { id: 'pause', label: 'The Pause', note: 'Everything stops for the last two beats', varied: true },
  { id: 'dropout', label: 'Drop-Out', note: 'The kick, the bass and the clap drop out for the last two beats; the roll and the tune carry on', varied: true },
  { id: 'pickup', label: 'Hook Pickup', note: 'Everything stops for the last beat but the hook, walking up into the drop', varied: true },
  { id: 'solo', label: 'Hook Alone', note: 'The last bar is the hook\'s opening on its own', varied: true },
]);
// THE STYLE AND MOOD RULES (ways.js FAMILY, notFor): `notFor` names the styles and moods Varied never
// draws a way for; picked by name it plays as asked. Reviewed across every style, 10 Oct 2026.
/**
 * RISER TYPE — the sound that lifts into every drop, one per song (Peter, 9 Oct 2026: "we need variety
 * for the riser"). Each is a song-local voice (theory.js riserVoice) on the riser lane, and `bars` is
 * how long before the drop it starts. A `tonal` one lands on the note the section it lifts into starts
 * on (its bass's first note); where a second section starts elsewhere — the lifted final drop — those
 * risers play on a second riser lane tuned there (sections.js, lanes.js). `trimDb` moves the riser's
 * fader for that type, set by ear against the Noise Riser in the song (Peter, 10 Oct 2026: "the pitched
 * risers jump out a lot more than the noise ones" — a climbing tone cuts through a mix the meter says
 * it sits under).
 */
export const RISER_WAYS = Object.freeze([
  { id: 'noise', label: 'Noise Riser', note: 'White noise climbing over two bars — the classic', varied: true, bars: 2 },
  { id: 'long', label: 'Long Riser', note: 'The noise riser over four bars, slower and longer', varied: true, bars: 4 },
  { id: 'whoosh', label: 'Whoosh', note: 'A quick, bright rush over the last bar', varied: true, bars: 1 },
  { id: 'wind', label: 'Wind', note: 'Dark noise opening up like a gust over two bars', varied: true, bars: 2, trimDb: 2, notFor: notFor(['chip']) },
  { id: 'pitch', label: 'Pitch Riser', note: 'A tone climbing three octaves to the note the drop starts on, over two bars', varied: true, bars: 2, tonal: true, trimDb: -6,
    notFor: notFor(['chill', 'disco', 'latin', 'underground'], { moods: true }) },
  // Peter, 9 Oct 2026: "what if it was a chord or 5ths that ended up at the chord/key of the section to come?"
  { id: 'fifths', label: 'Fifths Riser', note: 'Two tones a fifth apart climbing three octaves to the chord the drop starts on', varied: true, bars: 2, tonal: true, trimDb: -7,
    notFor: notFor(['chill', 'disco', 'latin', 'underground'], { moods: true }) },
  { id: 'reverse', label: 'Reverse Cymbal', note: 'A cymbal swelling backwards into the downbeat over the last two beats', varied: true, bars: 0.5 },
  // Peter, 9 Oct 2026: "a stuttering riser … where the noise is gated" — the gate is automation on the
  // riser's lane (fx.js RISER_GATE), quickening from eighths to sixteenths to thirty-seconds.
  { id: 'stutter', label: 'Stutter Riser', note: 'The noise riser chopped by a gate that quickens — eighths, sixteenths, thirty-seconds', varied: true, bars: 2, trimDb: 1,
    notFor: notFor(['chill', 'disco', 'latin', 'retro'], { moods: true }) },
]);
export const RISER_WAY = Object.freeze(Object.fromEntries(RISER_WAYS.map((w) => [w.id, w])));

/**
 * RISER FX — a Spot FX over every riser, for as long as it climbs, one per song (Peter, 9 Oct 2026:
 * "can we add spot fx to the risers?" … "flanger might be good"). Each is a section effect on the
 * riser's lane (fx.js RISER_FX); over a Stutter Riser it runs after the gate.
 */
export const RISER_FX_WAYS = Object.freeze([
  { id: 'none', label: 'None', note: 'The riser as it is', varied: true },
  { id: 'flanger', label: 'Jet Flanger', note: 'A slow, deep flanger sweeping through it — the jet', varied: true },
  { id: 'echo', label: 'Echo', note: 'Dotted-eighth echoes trailing it', varied: true },
  { id: 'pingpong', label: 'Ping-Pong', note: 'Echoes bouncing left and right', varied: true },
  { id: 'pan', label: 'Auto-Pan', note: 'Swinging from side to side', varied: true },
  { id: 'shift', label: 'Metallic Rise', note: 'A frequency shifter climbing with it — a metallic edge', varied: true,
    notFor: notFor(['chill', 'disco', 'latin', 'retro'], { moods: true }) },
  { id: 'crush', label: 'Bitcrush', note: 'Crushed to a few bits', varied: true, notFor: notFor(['chill', 'disco', 'latin', 'retro'], { moods: true, styles: ['trance'] }) },
  { id: 'wash', label: 'Reverb Wash', note: 'Climbing into a huge room', varied: true, notFor: notFor(['chip']) },
]);

/**
 * DROP HIT — what lands on the one after the riser, one per song (Peter, 9 Oct 2026: "can we have
 * different crashes after the riser"). It is the impact lane's sound: the style's own, a library
 * preset (`voice`), or a voice of the song's own (theory.js subDropVoice). `trim` (dB) sits each preset
 * where the style's own impacts do on the same fader, by their first 400 ms (measured 9 Oct 2026; the
 * library has no level curves for them, so the faders cannot). The crash above it, and
 * every crash on the phrases, stay the style's.
 */
export const DROP_HIT_WAYS = Object.freeze([
  { id: 'style', label: 'The Style\'s Own', note: 'The impact the style was tuned with — the classic', varied: true },
  { id: 'boom', label: 'Boom', note: 'An explosion: a low boom closing over a second', varied: true, voice: 'blastBoom', trim: -9.5, notFor: notFor(['chill', 'disco', 'retro'], { moods: true, styles: ['merenhouse'] }) },
  { id: 'blast', label: 'Blast', note: 'The boom\'s shorter, brighter cousin', varied: true, voice: 'blastImpact', trim: -5.4, notFor: notFor(['chill', 'disco', 'retro'], { moods: true }) },
  { id: 'noise', label: 'Noise Crash', note: 'The white-noise crash of a big electronic drop', varied: true, voice: 'blastNoiseCrash', trim: -6.4, notFor: notFor(['chill', 'disco', 'retro'], { moods: true }) },
  { id: 'long', label: 'Long Crash', note: 'A wide cymbal left to ring for seconds', varied: true, voice: 'crash808Long', trim: -4.4 },
  { id: 'sub', label: 'Sub Drop', note: 'A deep sine falling two octaves from the home note', varied: true, notFor: notFor(['chill', 'disco', 'retro', 'chip'], { moods: true }) },
]);
export const DROP_HIT_WAY = Object.freeze(Object.fromEntries(DROP_HIT_WAYS.map((w) => [w.id, w])));

export const BUILD_WAY = Object.freeze(Object.fromEntries(BUILD_WAYS.map((w) => [w.id, w])));

/** The build ways Varied passes over after a breakdown played `breakdownWay` (null: no breakdown before). */
export const buildsNotAfter = (breakdownWay) => (breakdownWay == null ? []
  : BUILD_WAYS.filter((w) => w.notAfter === true || (Array.isArray(w.notAfter) && w.notAfter.includes(breakdownWay))).map((w) => w.id));
/** The ways before the drop Varied passes over after a build of `buildWay`. */
export const dropInsNotAfter = (buildWay) => BUILD_WAY[buildWay]?.notInto || [];
