// FROST FORTRESS — the crayon SKY over the shipped paper world (28 Sep 2026, the crayon
// bake-off's second round). Peter, on the full crayon cards: "i am not in love with it...
// but i DO like the way the sky looks. would it be doable to have just the sky in crayon
// as a bakeoff?"
//
// Each candidate's `paint` is `{ sky }`: the card draws the SHIPPED watercolor backdrop
// (cut-paper hills, fortresses, pines, rocks, wildlife, foreground fold, the pack's soft
// cloud washes) and the pack hands its sky pass — the fill, the paper sky sheet, the
// aurora and the ribbons — to `sky(ctx, s)` through its gallery seam
// (watercolorPack.bg, backgroundContext.frostSkyPainter). The painter is the crayon cards'
// own sky (crayon.js paintCrayonSky), placed by what the pack passes it.
import { paintCrayonSky } from './crayon.js';

export const CRAYON_SKY_WHITE = {
  id: 'crayon-sky-white',
  name: 'C — CRAYON SKY (WHITE PAPER)',
  note: 'The shipped cut-paper world under the white-paper crayon sky: loose sweeps of blue rising to the right over a '
    + 'rubbed-in wash (by day), navy through violet and rose to a peach horizon glow with crayon stars (at dusk), and '
    + 'the aurora as long waxy strokes with travelling bright folds. The stops run to the far ridge\'s base, so the '
    + 'paper hills stand straight on the crayon horizon.',
  paint: { sky: (ctx, s) => paintCrayonSky(ctx, s, 'white') },
};

export const CRAYON_SKY_GREY = {
  id: 'crayon-sky-grey',
  name: 'D — CRAYON SKY (BLUE-GREY PAPER)',
  note: 'The same crayon sky on blue-grey stock: by day the paper shows through the pale end of the sky as a grey-blue '
    + 'haze, so the sky sits a step darker and cooler behind the paper hills; at dusk the sky is pressed almost '
    + 'solid and the two papers differ only in the tooth.',
  paint: { sky: (ctx, s) => paintCrayonSky(ctx, s, 'grey') },
};

// Round three (Peter: "i kinda like the crayon sky (against white)... not so much for the
// aurora, could that be the other way?"): C's sky with the SHIPPED vellum aurora on it,
// brightened ("try the brighter aurora in E").
export const CRAYON_SKY_WHITE_PAPER_AURORA = {
  id: 'crayon-sky-white-paper-aurora',
  name: 'E — CRAYON SKY (WHITE), PAPER AURORA',
  note: 'C\'s white-paper crayon sky — the day sweeps, the dusk navy-to-peach and its stars, the crayon wisp ribbons — '
    + 'with the aurora swapped back to the shipped soft vellum curtains, the pack\'s own painter in the pack\'s own '
    + 'place, at 2.4x the stage\'s gain (Peter: "try the brighter aurora"): at the shipped gain it all but vanished '
    + 'into the darker crayon navy. By day the two are the same card: frost-1 has no aurora.',
  paint: { sky: (ctx, s) => paintCrayonSky(ctx, s, 'white', { aurora: 'paper', auroraBoost: 2.4 }) },
};
