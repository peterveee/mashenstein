// FROST FORTRESS'S SKY since 29 Sep 2026: wax crayon on white paper over the cut-paper
// world. From the crayon bake-off (lab sections frost-crayon-bakeoff and
// frost-crayon-sky-snow): Peter did not take the full crayon world ("i am not in love with
// it... but i DO like the way the sky looks"), picked the sky alone on white paper, asked
// for the shipped aurora back on it ("not so much for the aurora, could that be the other
// way?"), then for it brighter ("try the brighter aurora"), and shipped that: candidate E.
//
// The painter is the bake-off's own (./crayon.js paintCrayonSky); the watercolor pack hands
// it Frost's whole sky pass (stylePacks/index.js, watercolorPack.bg) and draws everything
// after it — hills, fortresses, wildlife, the soft cloud washes, the blizzard — as before.
// The pack's vellum aurora is drawn on the crayon sky at the stage's gain times its BOOST:
// at dusk (frost-3) 2.4x, because at 1x the crayon navy swallowed it; by day and in the
// afternoon 1x, since on the pale crayon sky 2.4x was a green wash across the frame.
import { paintCrayonSky } from './crayon.js';

// One bake scale in play, whatever the context's: the quality ladder steps the render scale
// and the intro zooms it, and at the context's own scale each step re-baked the sky and
// its crayon tooth mid-run (175-300 ms). 2.5 is the painter's cap, so no rung is upsampled.
const SKY_BAKE_SCALE = 2.5;

export const FROST_SKY_AURORA_BOOST = Object.freeze([1, 1, 1, 2.4]); // by stage, 1..3

const boostFor = (s) => FROST_SKY_AURORA_BOOST[Math.max(1, Math.min(3, Number(s.stageIndex) || 1))];

export function paintFrostSky(ctx, s) {
  // The crayon is baked at the context's device scale; a context that cannot say (the
  // node tests' recorders) gets the aurora alone, which is the part with a contract.
  const m = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
  if (!m || !Number.isFinite(m.a)) {
    s.paperAurora?.(boostFor(s));
    return;
  }
  paintCrayonSky(ctx, s, 'white', { aurora: 'paper', auroraBoost: boostFor(s), scale: SKY_BAKE_SCALE });
}
