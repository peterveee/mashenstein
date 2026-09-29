// FROST FORTRESS — wax crayon backdrop bake-off (28 Sep 2026). Peter: "do you think crayon
// might work for the frost level?", then "do a small bakeoff for frost 1 and frost 3 at
// dusk". The Crypt round's wax crayon hand (docs/BACKDROP_STYLES.md, A2), moved onto
// Frost in daylight for the first time and asked the question the doc left open: does
// crayon read by day, on white paper? A small section, two screens (frost-1 by day at the
// polar bears and the crown keep; frost-3 at dusk under the aurora by the lone tower),
// painted on two papers over ONE composition (src/dev/frost-crayon/plan.js), against the
// shipped cut-paper backdrop at the same camX. Only the backdrop is on trial; the lane,
// the pale Frost hazards and the hero are the shipped ones in every card.
//
// Gallery-only: nothing here is wired into the run.
import { CRAYON_WHITE, CRAYON_GREY } from './frost-crayon/crayon.js';
import { CRAYON_SKY_WHITE, CRAYON_SKY_GREY, CRAYON_SKY_WHITE_PAPER_AURORA } from './frost-crayon/sky.js';

// drawFrostCrayonScene(ctx, t, paint, screen): paint null draws the shipped control, and a
// { sky } paint the shipped backdrop with a crayon sky (the round-two candidates).
export { drawFrostCrayonScene, FROST_CRAYON_SCREENS, FROST_CRAYON_LOOP } from './frost-crayon/scene.js';

export const FROST_CRAYON_CANDIDATES = [
  {
    id: 'shipped', name: 'PAPER (SHIPPED UNTIL 29 SEP)', paint: null,
    note: 'What shipped when these rounds ran (watercolor pack, cardstockClear paper; since 29 Sep the sky is E\'s crayon): a flat sky gradient per stage, cut-paper snow hills in '
      + 'two ranges and a translucent foreground fold, the stage\'s fortress on the far ridge, the glacier, pines, ice '
      + 'rocks and drifts, the polar bears (frost-1) and the blurred vellum aurora (frost-3). It is the control; the two '
      + 'screens are the same camX as the candidates. The blizzard is weather laid over the finished frame, so no card '
      + 'draws it.',
  },
  CRAYON_WHITE,
  CRAYON_GREY,
  // Round two (Peter: "i DO like the way the sky looks"): the crayon sky alone, over the
  // shipped paper world. `paint` is { sky }, handed the pack's sky pass through its seam.
  CRAYON_SKY_WHITE,
  CRAYON_SKY_GREY,
];

// Round three, its own lab section with the blizzard on: the control, C, and C's sky with
// the shipped aurora.
export const FROST_CRAYON_SNOW_CANDIDATES = [
  FROST_CRAYON_CANDIDATES[0],
  CRAYON_SKY_WHITE,
  CRAYON_SKY_WHITE_PAPER_AURORA,
];
