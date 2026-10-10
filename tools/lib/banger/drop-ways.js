// DROP 2 — how the second drop (or the second chorus) differs from the first, one per song (Peter,
// 10 Oct 2026: drop 2 was always drop 1 with more parts on — the same bass, the same beat). Each way is
// played in sections.js (dropBar's `twist`); the drops after it go back to the full drop.
//
// The table is what the dialog's list shows (ways.js for the shape); `varied: true` puts a way in the
// draw. Varied passes over a way the song cannot play (sections.js): a new bass line where the style's
// bass is its signature or the hook is the bass.
// Peter heard them (10 Oct 2026): "not thrilled … half time may work for SOME styles occasionally",
// and the hook an octave up was far too high (gone). So Varied is More On three times in four and
// Half-Time Start the fourth, in the styles it suits (`onlyFor`) — More On always elsewhere; the rest
// are by name.
const HALF_TIME_STYLES = ['big-room', 'future-bass', 'dnb', 'electro', 'chipstep', 'moombahton', 'reggaeton'];
export const DROP2_WAYS = Object.freeze([
  { id: 'more', label: 'More On', note: 'Drop one with more parts on — the classic', varied: true, weight: 3 },
  { id: 'halftime', label: 'Half-Time Start', note: 'The first eight bars at half time, then full time', varied: true, onlyFor: { styles: HALF_TIME_STYLES } },
  { id: 'bass', label: 'New Bass', note: 'Another bass line under the same hook' },
  { id: 'answer', label: 'Counter-Melody', note: 'A new line answering the hook in its gaps' },
  { id: 'breakbeat', label: 'Breakbeat', note: 'The kick broken up — a beat switch under the same music' },
]);
/** The bass lines New Bass picks from (theory.js BASS_FIGURES, and Rolling), never the one playing. */
export const DROP2_BASSES = Object.freeze(['rolling', 'octaves', 'rootFifth', 'gallop']);
