// FROST FORTRESS crayon bake-off — the two full-crayon candidates. The painter moved to
// src/engine/stylePacks/frostCrayon/crayon.js on 29 Sep 2026, when Frost shipped its crayon
// SKY (Peter: "OK let's add this in for real"); the lab keeps its cards through this shim.
import { paintFrostCrayon } from '../../engine/stylePacks/frostCrayon/crayon.js';

export { KEEP_WINDOWS, paintCrayonSky } from '../../engine/stylePacks/frostCrayon/crayon.js';

export const CRAYON_WHITE = {
  id: 'crayon-white',
  name: 'CRAYON — WHITE PAPER',
  note: 'Wax crayon and coloured pencil on white cartridge paper, after The Snowman: the untouched sheet is the snow, '
    + 'modelled with contour strokes where the hills turn from the light; crayon only where there is colour (sky, rock, '
    + 'pines, the keep, the bears\' shading). The band above the lane is pressed blue-violet, snow in shadow, so the '
    + 'white hazards have something to stand against. At dusk the near snow stays paper, the far range and the shading '
    + 'take the lilac; the aurora is long waxy strokes, pale mint at the foot, green, teal, lilac at the tips.',
  paint: (ctx, f) => paintFrostCrayon(ctx, f, 'white'),
};

export const CRAYON_GREY = {
  id: 'crayon-grey',
  name: 'CRAYON — BLUE-GREY PAPER',
  note: 'The same hand on a pale blue-grey stock: the snow is laid in as white crayon (lilac-white at dusk) with the '
    + 'paper showing through the tooth, so the whole picture sits a step darker and the white crayon reads as '
    + 'light. The sky\'s pale end is laid in too; the lane band is pressed blue-violet as on the white sheet.',
  paint: (ctx, f) => paintFrostCrayon(ctx, f, 'grey'),
};
