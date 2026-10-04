// SYNTHWAVE · LIGHT — the Light Sound Set for synthwave. 5 Oct 2026.
//
// Not a style of its own: what Sound Set = Light makes a synthwave banger (index.js
// soundSetOf). The same music as synthwave.js, played only on the cheap synths — TNGR-2,
// RMND-2 and KNDO-5 — with no MRDR-3 and no JMJR-4, which `phone` makes a hard rule in
// sound-rules.js. Its sounds are its own entry in sounds.js, edited on the Banger Sounds page.
//
// Why, measured in WebKit (work/local/_banger-lanes-webkit-2026-10-04.txt): synthwave ran at
// 49% median and saturated by its last chorus; with its MRDR-3 parts blanked it ran flat at
// 18%. No single MRDR-3 part was the cost — blanking the pad or the bass alone changed
// nothing — so the set leaves out all of them. The game's Lab plays synthwave on this set.
//
// `base` is the style it belongs to: its channels, combos, seed-song fader references and
// per-style tables are the base's.
import { SYNTHWAVE } from './synthwave.js';

export const SYNTHWAVE_LITE = Object.freeze({
  ...SYNTHWAVE,
  id: 'synthwave-lite',
  base: 'synthwave',
  soundSet: 'light',
  phone: true,
  label: 'Synthwave · Light',
});
