// THE TOASTER'S FINISH — a gallery bake-off, SETTLED 25 Sep 2026: B (the
// toned-down shiny gold) ships as GOLD_TOASTER_FINISH in props.js. A, the flat
// gold it replaced, stays here so the gallery can still show it.
//
// A finish is the `finish` argument PROP_PAINTERS.appliance already takes, so a
// candidate is data and the painter is the shipped one.
import { GOLD_TOASTER_FINISH, SILVER_TOASTER_FINISH } from '../sprites/props.js';

// The golden toaster as it shipped before the bake-off: the painter's own warm
// rim, lever and slot over three flat planes.
const FLAT_GOLD = {
  id: 'flatGold', back: '#a97816', side: '#f4c934', top: '#ffe16a',
  edge: 'rgba(178,124,22,0.55)', lever: '#6e4518', slot: '#4a2b12', glint: '#fff8c8',
};

export const TOASTER_FINISH_CANDIDATES = [
  { letter: 'A', id: 'gold', name: 'FLAT GOLD (was)', finish: FLAT_GOLD,
    note: 'The golden toaster as it shipped before the bake-off: flat casing, warm rim.' },
  { letter: 'B', id: 'shinyGold', name: 'SHINY GOLD (ships)', finish: GOLD_TOASTER_FINISH,
    note: 'The silver toaster\'s chrome reflection and streaks, in gold.' },
  { letter: 'C', id: 'silver', name: 'SILVER (replay, ships)', finish: SILVER_TOASTER_FINISH,
    note: 'For reference: the replay toaster that stands in once the plug is banked.' },
];
