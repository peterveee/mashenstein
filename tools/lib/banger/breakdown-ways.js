// BREAKDOWN HOOK — every way a breakdown can play the hook, in one table (9 Oct 2026). Peter: the
// hook at half speed in every breakdown was "a bit predictable", and more ways should be easy to add.
//
// The table is what the dialog's Breakdown Hook list and the Form row's Plays list show. A way is
// played by its line in sections.js (BREAKDOWN_LINES) and, if it has one, an effect over the part
// in fx.js (BREAKDOWN_FX). `varied: true` puts it in Varied's draw; `weight` (1 if not given) is how
// often it comes up there against the others. `part` is a part the way adds to the song: under a
// Sound Set (the phone's budget) Varied never draws a way that adds one.
//
// ADDING A WAY: an entry here, its line in BREAKDOWN_LINES, an effect in BREAKDOWN_FX if it has
// one. It can be picked by name straight away. Giving it `varied: true` re-draws only the takes it
// wins (variedWay) — but a kept Lab song is made again from its recipe every time it plays, so a
// way joining the draw says `since` the WAYS ERA it joined in (ways.js), and an older recipe never draws it.
import { drawWay, notFor } from './ways.js';

export const BREAKDOWN_WAYS = Object.freeze([
  { id: 'half', label: 'Half Speed', note: 'Every note twice as long — the classic', varied: true },
  { id: 'tease', label: 'Tease', note: 'Only the hook\'s opening, every other bar, with echoes filling the gaps', varied: true },
  { id: 'late', label: 'Held Back', note: 'The pad and the choir alone; the hook comes in for the last two bars', varied: true },
  { id: 'outline', label: 'Outline', note: 'The hook as long notes — the one on each strong beat', varied: true },
  { id: 'piano', label: 'Piano', note: 'The hook as written, on the style\'s piano', varied: true, part: 'piano', notFor: notFor([], { styles: ['acid-house', 'techno'] }) },
  { id: 'tune', label: 'New Tune', note: 'A new line over the breakdown\'s chords, grown from the end of the hook', varied: true },
  { id: 'arp', label: 'Arp', note: 'The hook\'s notes broken into running sixteenths', varied: true, notFor: notFor(['latin'], { styles: ['afro-house', 'uk-garage'] }) },
  { id: 'answer', label: 'Call and Answer', note: 'The hook for a bar, the bell answering it in the next', varied: true, part: 'bell', notFor: notFor([], { styles: ['acid-house', 'techno'] }) },
  { id: 'muffled', label: 'Muffled', note: 'The hook as written, starting dull and opening up across the breakdown', varied: true },
  // Auditioned 10 Oct 2026 and in (a Choir Hook was tried and dropped: the choir's attack is too slow
  // for a tune, and it sat too soft).
  { id: 'gated', label: 'Gated Hook', note: 'The hook as written, chopped into sixteenths by a gate', varied: true, since: 2, notFor: notFor(['chill', 'disco', 'latin'], { moods: true }) },
  { id: 'octaveEcho', label: 'Octave Echo', note: 'The hook an octave up, trailing long echoes', varied: true, since: 2 },
  { id: 'low', label: 'Low and Muffled', note: 'The hook an octave down under a low-pass', varied: true, since: 2 },
  { id: 'written', label: 'As Written', note: 'The hook at its own speed, over the pad' },
  { id: 'none', label: 'No Hook', note: 'The pad, the choir and the pedal alone' },
]);
/**
 * BREAKDOWN BACKING — what plays under the breakdown's hook (Peter, 10 Oct 2026: the pad, the choir and
 * the held bass were the same every time; having heard them, "lets do all of them"). Played in
 * sections.js (the breakdown). Varied draws one per song from Ways Era 4. (Choir Only was left out: the
 * choir sits too soft to carry the chords.)
 */
export const BACKING_WAYS = Object.freeze([
  { id: 'classic', label: 'Pad and Choir', note: 'An open pad, the choir and the bass holding home — the classic', varied: true },
  { id: 'arp', label: 'Arp Backing', note: 'The chords as a soft arp in place of the pad', varied: true, since: 4,
    notFor: notFor(['latin'], { styles: ['afro-house', 'uk-garage'] }) },
  { id: 'pulse', label: 'Pulsing Bass', note: 'The bass pulsing eighths on home, like a heartbeat', varied: true, since: 4 },
  { id: 'kick', label: 'Kick Coming Back', note: 'A muffled kick for the second half, opening up into the build', varied: true, since: 4 },
  { id: 'swell', label: 'Swells', note: 'The pad swelling up through every bar', varied: true, since: 4 },
  { id: 'piano', label: 'Piano Chords', note: 'Soft held piano chords in place of the pad', varied: true, since: 4, part: 'piano',
    notFor: notFor([], { styles: ['acid-house', 'techno'] }) },
  { id: 'walk', label: 'New Chord Walk', note: 'Another progression under the hook, drawn for the song', varied: true, since: 4 },
  { id: 'stripped', label: 'Stripped Back', note: 'Just the pad under the hook — no choir, no bass', varied: true, since: 4 },
  { id: 'halftime', label: 'Light Half-Time Beat', note: 'A soft clap on three and quiet hats under it', varied: true, since: 4 },
]);
/** New Chord Walk's progressions, by the key's family (theory.js romanChord numerals). */
export const BACKING_WALKS = Object.freeze({
  minor: [['i9', 'VImaj7', 'IIImaj7', 'VII'], ['VImaj7', 'VII', 'i9', 'i9'], ['i9', 'iv9', 'VImaj7', 'V'], ['iv9', 'VImaj7', 'i9', 'VII']],
  major: [['IVmaj7', 'V', 'vi9', 'Iadd9'], ['vi9', 'IVmaj7', 'Iadd9', 'V'], ['Iadd9', 'vi9', 'IVmaj7', 'V'], ['IVmaj7', 'Iadd9', 'V', 'vi9']],
});

export const BREAKDOWN_WAY = Object.freeze(Object.fromEntries(BREAKDOWN_WAYS.map((w) => [w.id, w])));
/** The ways Varied draws from. */
export const VARIED_WAYS = Object.freeze(BREAKDOWN_WAYS.filter((w) => w.varied).map((w) => w.id));

/** Varied's way for a take's breakdown (ways.js drawWay): `soundSet`, no way that adds a part. */
export const variedWay = (rng, { soundSet = false, era, exclude = [] } = {}) => drawWay(BREAKDOWN_WAYS, rng, { soundSet, era, exclude }) ?? 'half';
