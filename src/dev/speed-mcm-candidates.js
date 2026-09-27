// SPEED ZONE — mid-century modern backdrop bake-off (25 Sep 2026). The second bake-off
// of docs/BACKDROP_STYLES.md ("Next bake-offs" 1): the Crypt round's mid-century modern
// hand, moved onto the cabinet the doc says it fits best — the Road Runner desert IS
// Maurice Noble's mid-century modern. A small section of speed-1 (two screens: the wind
// pump at the opening, and the coyote's ledge further in) painted in two palettes over
// ONE composition (src/dev/speed-mcm/plan.js), against the shipped paper backdrop at the
// same camX. Only the backdrop is on trial; the lane is the shipped one in every card.
//
// Gallery-only: nothing here is wired into the run.
import { MCM_SUNSET, MCM_MIDDAY } from './speed-mcm/mcm.js';

// drawSpeedMcmScene(ctx, t, paint, screen, { coyote }) swaps in a bake-off coyote.
export { drawSpeedMcmScene, SPEED_MCM_SCREENS, SPEED_MCM_LOOP } from './speed-mcm/scene.js';
// The coyote bake-off (Peter, 25 Sep: the first re-cut "looks a bit like an aardvark!"):
// seven coyotes, control first, each `draw` fits the scene's { coyote } seam, and a
// 480x270 close-up tile per candidate (SUNSET left, MIDDAY right; t=0 sits, t≈3 howls).
export { COYOTE_CANDIDATES, drawCoyoteCloseUp } from './speed-mcm/coyote-candidates.js';

export const SPEED_MCM_CANDIDATES = [
  {
    id: 'shipped', name: 'SHIPPED — PAPER', paint: null,
    note: 'What ships (faux3d, cardstockClear paper): an orange-to-gold gradient, the sage-grey mesa with the wind pump, '
      + 'three ranges of clay dunes, power poles, saguaros, vultures, the howling coyote, a dust devil, tumbleweeds and '
      + 'roadside signs. It is the control; the two screens are the same camX as the candidates.',
  },
  MCM_SUNSET,
  MCM_MIDDAY,
];
