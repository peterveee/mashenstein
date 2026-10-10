// INTRO TYPE — the ways a song can open (9 Oct 2026). Peter: "a casual audience, not DJs" — no
// intro that keeps the listener waiting through bars of kick and bass before anything to hum. Every
// way here has the riff or the chords from its first two bars (and TUNE FIRST, options.js, holds
// Build in Layers and the Groove form to the same).
//
// The table is what the dialog's list and the Form row's Plays list show (ways.js for the shape).
// Each way is played in sections.js (the intro's modes). Build in Layers and Drums & Bass Intro are
// switches of their own and win where they are on. Varied draws one per song.
//
// ADDING A WAY: an entry here and its mode in sections.js; `varied: true` puts it in the draw. A kept
// Lab song is made again from its recipe every time it plays, so a way joining the draw says `since`
// the WAYS ERA it joined in (ways.js).
import { notFor } from './ways.js';
export const INTRO_WAYS = Object.freeze([
  { id: 'riff', label: 'The Riff', note: 'The riff as you played it, the kick and hats joining halfway — the classic', varied: true },
  { id: 'quote', label: 'Chorus Quote', note: 'The drop\'s hook and chords through a low-pass that opens across the intro', varied: true },
  { id: 'cold', label: 'Cold Open', note: 'Straight in on the hook, with the bass and a light beat', varied: true },
  { id: 'arp', label: 'Arp Intro', note: 'The chords as an arp over the pad, the riff joining halfway', varied: true, notFor: notFor(['latin'], { styles: ['afro-house', 'uk-garage'] }) },
  { id: 'pad', label: 'Riff over Pad', note: 'The riff with its chords held under it, no kick — the hats joining halfway', varied: true },
]);
