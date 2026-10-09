// BUILD TYPE and BEFORE THE DROP — the ways a build can climb, and what the band does on the bar
// before the drop (9 Oct 2026). Peter: after the breakdown, the build was the most predictable part —
// the same snare roll into the same last bar, twice a song.
//
// The tables are what the dialog's lists and the Form row's Plays list show (ways.js for the shape).
// A build's way is played in sections.js (BUILD_DRUMS, and the hook for Hook Loop); a way before the
// drop is applied to the build's last bar once the drop after it exists (sections.js applyDropIns).
// Varied draws one for each build, never the same as the build before it in the song.
//
// The run-up EFFECT on that last bar (Spot FX → Into a Drop: the stutter and its variations) is
// separate and still rotates on its own; a way that silences the bar silences the run-up with it.
//
// ADDING A WAY: an entry here, its drums in BUILD_DRUMS (or its move in DROP_IN_MOVES), and it can be
// picked by name; `varied: true` puts it in the draw. A kept Lab song is made again from its recipe
// every time it plays, so a change to the draw wants a new recipe expression (src/game/banger/make.js).
export const BUILD_WAYS = Object.freeze([
  { id: 'roll', label: 'Snare Roll', note: 'The snare rolling faster and faster, the clap out for the second half — the classic', varied: true },
  { id: 'kick', label: 'Kick Roll', note: 'No snare: the kick doubles up — fours, then eighths, then sixteenths', varied: true },
  { id: 'dotted', label: 'Dotted Roll', note: 'The snare in dotted eighths, tumbling against the beat, sixteenths for the last bar', varied: true },
  { id: 'loop', label: 'Hook Loop', note: 'The hook\'s opening looping shorter and shorter — half a bar, a beat, half a beat — over the roll', varied: true },
  { id: 'muffled', label: 'Muffled Groove', note: 'No roll: the drop\'s groove with the whole mix under a low-pass, opening up', varied: true },
  { id: 'drumless', label: 'Drumless', note: 'No drums at all — the chords, the hook and the riser climbing alone', varied: true },
]);
export const DROP_IN_WAYS = Object.freeze([
  { id: 'straight', label: 'Straight In', note: 'Everything right up to the bar line — the classic', varied: true },
  { id: 'gap', label: 'The Gap', note: 'Everything stops for the last beat: a beat of silence, then the drop', varied: true },
  { id: 'pause', label: 'The Pause', note: 'Everything stops for the last two beats', varied: true },
  { id: 'dropout', label: 'Drop-Out', note: 'The kick, the bass and the clap drop out for the last two beats; the roll and the tune carry on', varied: true },
  { id: 'pickup', label: 'Hook Pickup', note: 'Everything stops for the last beat but the hook, walking up into the drop', varied: true },
  { id: 'solo', label: 'Hook Alone', note: 'The last bar is the hook\'s opening on its own', varied: true },
]);
