// CHIPSTEP · LIGHT — the Light Sound Set for chipstep. 5 Oct 2026.
//
// Not a style of its own: what Sound Set = Light makes a chipstep banger (index.js
// soundSetOf). The same music as chipstep.js, played only on the cheap synths — KNDO-5 (the
// chip channel itself), TNGR-2 and RMND-2 — with no MRDR-3 and no JMJR-4, which `phone`
// makes a hard rule in sound-rules.js. Its sounds are its own entry in sounds.js, edited on
// the Banger Sounds page like any style's.
//
// Why, measured in WebKit (work/local/_banger-lanes-webkit-2026-10-04.txt): a synthwave
// banger ran at 49% median and saturated by its last chorus; with its MRDR-3 parts blanked it
// ran flat at 18%. Chipstep, with its PWM pads, PWM choir, screamer, MRDR-3 wobble and Arcade
// Chorus, took the WebKit page down. The game's Lab plays chipstep on this set.
//
// `base` is the style it belongs to: its channels, combos, seed-song fader references and
// per-style tables are the base's.
import { CHIPSTEP } from './chipstep.js';

export const CHIPSTEP_LITE = Object.freeze({
  ...CHIPSTEP,
  id: 'chipstep-lite',
  base: 'chipstep',
  soundSet: 'light',
  phone: true,
  label: 'Chipstep · Light',
});
