// THE GOLDEN TOASTER'S TOP, CURVED — a gallery bake-off (Peter, 7 Oct 2026: "can we possibly try to
// make the top of the toaster slightly curved? give me options"). SETTLED the same day on F, the
// rounded top ("Use f"), which ships as props.js TOASTER_CROWN; the rest stay here for the gallery.
//
// A candidate is a finish (PROP_PAINTERS.appliance's `finish` argument) with a `crown`: z(s, d),
// how far the top stands above the flat cap at s along the toaster (0 its lever end, 1 its back)
// and d across it (0 the face's top edge, 1 the far edge), in toaster lengths; and where its crest
// runs, for the shine — `crestD` a line along it at that d, `crestS` one across it at that s. The
// painter carries the end plane's top, the face's top edge, the cap, the slot and the slice's clip
// over the same surface. Review only: nothing in the game reads this file.

import { GOLD_TOASTER_FINISH, roundedToasterTop } from '../sprites/props.js';

const arch = (t) => 4 * t * (1 - t);   // 0 at both edges, 1 in the middle
const rolled = (s, d) => roundedToasterTop(s, d);   // F, the shipped one
const crowned = (letter, name, note, crown) => ({ letter, name, note, finish: { ...GOLD_TOASTER_FINISH, crown } });

export const TOASTER_CROWN_CANDIDATES = [
  crowned('0', 'FLAT (was)', 'The top as it was before: flat, square to the face.', { z: () => 0 }),
  crowned('A', 'SOFT DOME',
    'A gentle rise across the top, front edge to back: the lever end’s top becomes a low arch and the slot sits on the crest.',
    { z: (s, d) => 0.05 * arch(d), crestD: 0.5 }),
  crowned('B', 'HIGH DOME',
    'The same arch, about twice as high — from this angle its crest stands above the far edge, so the top reads as round from the side too.',
    { z: (s, d) => 0.11 * arch(d), crestD: 0.5 }),
  crowned('C', 'LOAF',
    'Curved the other way, along its length: higher in the middle, rounding down to both ends, so the face’s top edge is a long shallow arc — a loaf of bread.',
    { z: (s) => 0.07 * Math.sin(Math.PI * s), crestS: 0.5 }),
  crowned('D', 'PILLOW',
    'Both at once, a little of each: rounded along it and across it, like a cushion.',
    { z: (s, d) => 0.04 * Math.sin(Math.PI * s) + 0.045 * arch(d), crestD: 0.5 }),
  crowned('E', 'ROUNDED EDGE',
    'The top stays flat, but the edge between it and the face is rounded over, as pressed metal is; the light runs along the roll.',
    { z: (s, d) => {
      const r = 0.06, rd = 0.12;   // the roll's radius, up and (as a share of the depth) across
      return d >= rd ? 0 : -r + r * Math.sqrt(1 - (1 - d / rd) ** 2);
    }, crestD: 0.13 }),
  { letter: 'F', name: 'ROUNDED TOP (ships)', finish: GOLD_TOASTER_FINISH, note:
    'The top’s edges rounded to match its bottom corners: flat on top, turning down over a soft radius into the face, both ends and the far side, so the silhouette’s top corners are as round as its bottom ones. The game’s toaster since 7 Oct.' },
  crowned('G', 'ROUNDED + SOFT DOME',
    'F’s rounded edges with A’s gentle rise across the top.',
    { z: (s, d) => rolled(s, d) + 0.05 * arch(d), crestD: 0.5 }),
  crowned('H', 'ROUNDED + LOAF',
    'F’s rounded edges with C’s curve along its length.',
    { z: (s, d) => rolled(s, d) + 0.06 * Math.sin(Math.PI * s), crestS: 0.5 }),
];
