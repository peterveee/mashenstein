// CHIPSTEP · 8-BIT — the 8-Bit Sound Set: chipstep as a game console would play it,
// nothing but short blips. 5 Oct 2026, at Peter's request — "only short blippy video-game
// sounds, simple square, sawtooth and triangle waves".
//
// What Sound Set = 8-Bit makes a chipstep banger (index.js soundSetOf). Chipstep's music on
// KNDO-5 alone — the chip channel: square, saw, triangle, sine — with every tuned note cut
// to a sixteenth (`blips`, applied in index.js), so a held chord is a blip on its change.
// Pumping supersaws would be one blip a chord, so they play as stabs (`remapParts`). A phone
// set (`phone`), like the Light one. The game's Lab comes out like this now and then.
import { CHIPSTEP } from './chipstep.js';

export const CHIPSTEP_8BIT = Object.freeze({
  ...CHIPSTEP,
  id: 'chipstep-8bit',
  base: 'chipstep',
  soundSet: '8bit',
  phone: true,
  blips: 1,
  // A part's setting swapped for another: { part: { from: to } }.
  remapParts: { chords: { saws: 'stabs' } },
  label: 'Chipstep · 8-Bit',
});
