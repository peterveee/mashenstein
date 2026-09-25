// FROST 3 — pieces for the storm (the bake-off; ALL SHIPPED 25 Sep 2026). Peter, 25 Sep 2026:
// "can we add more in frost 3?", then, of the suggestions (a beacon watchtower, a snow
// groomer with headlights): "can i see the new art?".
//
// Frost-3 is dusk in the heaviest blizzard of the act, so what reads there is emitted
// light and dark shapes; both of these are built round a light. Same contract and scene
// as the FROST Background V2 table (src/dev/frost-background-v2.js): each reaches the
// real backdrop through the pack's frostLandmarkStudy seam, in Frost's cut paper, with
// the kit stylePacks/frostWildlife.js uses (FROST_PAPER).
import {
  drawFrostDogSled, drawFrostBeaconTower as paintBeaconTower, drawFrostSnowGroomer as paintSnowGroomer,
  drawFrostWolvesFire,
} from '../engine/stylePacks/frostWildlife.js';

// SHIPPED 25 Sep 2026, both: the painters moved into stylePacks/frostWildlife.js, which
// places them in frost-3 (FROST_WILDLIFE). This file keeps the bake-off's table.

// ================================================================ the table
export const FROST3_STORM_IDEAS = [
  {
    id: 'wolves-fire', name: 'SHIPS · THE WOLVES ROUND A FIRE (frost-3, ~21%)', depth: 'near', stage: 3, hold: 0.55,
    summit: true, clear: 40, reach: 70, focusUp: 12, zoom: 3.2, blizzard: 1.02, paint: drawFrostWolvesFire,
    note: 'Peter: "perhaps the wolves in level 3 could be around. fire??" The same three, no ledge: a campfire in the '
      + 'crown of the hill, a ring of stones and crossed logs, one wolf either side facing in and the leader behind the '
      + 'flames, the chorus as before, the firelight warming the pack and the snow, sparks blown off downwind.',
  },
  {
    id: 'beacon', name: 'SHIPS · BEACON TOWER — a signal fire on a hilltop (frost-3, ~37%)', depth: 'near', stage: 3, hold: 0.55,
    summit: true, clear: 30, reach: 90, focusUp: 26, zoom: 3, blizzard: 1.32, paint: paintBeaconTower,
    note: 'A timber watchtower set into the crown of a near hill, the fortress\'s outpost: splayed legs, cross-bracing '
      + 'and a ladder, snow on the deck and the bars, a pennant streaming downwind, and a signal fire in an iron '
      + 'basket on the platform — flickering, throwing sparks and smoke off to the right, lighting the tops of the '
      + 'legs. Proposed for frost-3 at about 40%. Shown in the storm frost-3 has there.',
  },
  {
    id: 'groomer', name: 'SHIPS · SNOW GROOMER — headlights in the storm (frost-3, ~69%)', depth: 'near', stage: 3, hold: 0.45,
    summit: true, clear: 40, reach: 140, focusUp: 12, focusDx: 24, zoom: 3, blizzard: 1.32, paint: paintSnowGroomer,
    note: 'A piste basher crawling along the near crest with the run, slower than the camera: red cab on long tracks, '
      + 'blade up front, the tiller combing corduroy into the snow behind, two headlight beams reaching out ahead '
      + 'through the snow, an amber beacon turning on the roof, exhaust off the stack. The other option for frost-3 '
      + 'at about 40%. Shown in the storm frost-3 has there.',
  },
  {
    id: 'sled-lantern', name: 'SHIPS · the husky sled with a lantern (frost-3, 78%)', depth: 'near', stage: 3, hold: 0.62,
    summit: true, clear: 60, reach: 130, focusUp: 10, focusDx: -48, zoom: 2.4, blizzard: 1.5,
    paint: (ctx, f) => drawFrostDogSled(ctx, { ...f, lantern: true }),
    note: 'For comparison, what went in at 78% of frost-3: frost-2\'s sled team with a lantern swinging off the bow, '
      + 'in the storm at its heaviest.',
  },
];
